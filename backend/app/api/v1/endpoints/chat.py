"""
Real-time chat and messaging endpoints with WebSocket support
"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, Body
from fastapi.responses import JSONResponse
import json
import logging
from typing import Set, Dict
from datetime import datetime, timezone
from app.dependencies import get_current_user
from app.services.messaging_service import get_messaging_service, MessagingService
from app.models.message import (
    MessageCreate,
    MessageResponse,
    ConversationCreate,
    TypingIndicator,
    MessageReaction
)
from app.services.cache_service import get_cache_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

# WebSocket connection manager
class ConnectionManager:
    """Manage WebSocket connections per conversation"""
    
    def __init__(self):
        # Use list of dicts instead of set (dicts are unhashable)
        self.active_connections: Dict[str, list] = {}
    
    async def connect(self, conversation_id: str, websocket: WebSocket, user_id: str):
        """Add a new connection"""
        await websocket.accept()
        
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        
        self.active_connections[conversation_id].append({
            "websocket": websocket,
            "user_id": user_id
        })
        logger.info(f"User {user_id} connected to conversation {conversation_id}")
    
    async def disconnect(self, conversation_id: str, user_id: str):
        """Remove a connection"""
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id] = [
                conn for conn in self.active_connections[conversation_id]
                if conn["user_id"] != user_id
            ]
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]
        logger.info(f"User {user_id} disconnected from conversation {conversation_id}")
    
    async def broadcast(self, conversation_id: str, message: dict, exclude_user: str = None):
        """Broadcast message to all connections in conversation"""
        if conversation_id in self.active_connections:
            disconnected = []
            for conn in self.active_connections[conversation_id]:
                if exclude_user and conn["user_id"] == exclude_user:
                    continue
                try:
                    await conn["websocket"].send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message: {str(e)}")
                    disconnected.append(conn)
            
            # Remove disconnected connections
            for conn in disconnected:
                await self.disconnect(conversation_id, conn["user_id"])
    
    async def send_personal(self, websocket: WebSocket, message: dict):
        """Send message to specific connection"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {str(e)}")


# Global connection manager
manager = ConnectionManager()


@router.post("/conversations")
async def create_conversation(
    recipient_id: str = Query(...),
    initial_message: str = Query(None),
    current_user: dict = Depends(get_current_user),
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """Create or get existing conversation"""
    try:
        conversation_id = await messaging_service.create_conversation(
            current_user["sub"],
            recipient_id,
            initial_message
        )
        
        return {
            "conversation_id": conversation_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "participants": [current_user["sub"], recipient_id]
        }
    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/{user_id}")
async def get_user_conversations(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    messaging_service: MessagingService = Depends(get_messaging_service),
    cache_service = Depends(get_cache_service)
):
    """Get all conversations for a specific user"""
    # Ensure user can only access their own conversations
    if current_user["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        cache_key = f"user:conversations:{user_id}"
        cached = await cache_service.get(cache_key)
        if cached:
            return json.loads(cached)
        
        result = await messaging_service.get_conversations(user_id)
        
        await cache_service.set(cache_key, json.dumps(result), expire=300)
        return result
    except Exception as e:
        logger.error(f"Error fetching conversations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/messages/{conversation_id}")
async def get_conversation_messages(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    messaging_service: MessagingService = Depends(get_messaging_service),
    cache_service = Depends(get_cache_service)
):
    """Get message history for conversation"""
    try:
        # Verify user is participant in conversation
        conv = await messaging_service.conversations_collection.find_one({"_id": ObjectId(conversation_id)})
        if not conv or current_user["sub"] not in conv["participants"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        cache_key = f"conv:messages:{conversation_id}"
        cached = await cache_service.get(cache_key)
        if cached:
            return json.loads(cached)
        
        # Mark messages as read when fetching
        await messaging_service.mark_as_read(conversation_id, current_user["sub"])
        
        result = await messaging_service.get_messages(conversation_id)
        
        await cache_service.set(cache_key, json.dumps(result, default=str), expire=600)
        return result
    except Exception as e:
        logger.error(f"Error fetching messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/messages")
async def send_message(
    message_data: dict = Body(...),
    current_user: dict = Depends(get_current_user),
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """Send a message"""
    try:
        conversation_id = message_data.get("conversation_id")
        content = message_data.get("content", "")
        message_type = message_data.get("message_type", "text")
        
        if not conversation_id or not content:
            raise HTTPException(status_code=400, detail="conversation_id and content are required")
        
        # Verify user is participant in conversation
        conv = await messaging_service.conversations_collection.find_one({"_id": ObjectId(conversation_id)})
        if not conv or current_user["sub"] not in conv["participants"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        message = await messaging_service.send_message(
            conversation_id,
            current_user["sub"],
            content,
            message_type
        )
        
        # Broadcast to connected clients
        await manager.broadcast(
            conversation_id,
            {
                "type": "message",
                "data": message
            }
        )
        
        return message
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/messages/seen")
async def mark_messages_seen(
    conversation_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """Mark messages as seen in a conversation"""
    try:
        # Verify user is participant in conversation
        conv = await messaging_service.conversations_collection.find_one({"_id": ObjectId(conversation_id)})
        if not conv or current_user["sub"] not in conv["participants"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        count = await messaging_service.mark_as_read(conversation_id, current_user["sub"])
        
        return {"status": "seen", "messages_marked": count}
    except Exception as e:
        logger.error(f"Error marking messages as seen: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    current_user: dict = Depends(get_current_user),
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """Delete a message"""
    try:
        success = await messaging_service.delete_message(message_id, current_user["sub"])
        
        if not success:
            raise HTTPException(status_code=403, detail="Cannot delete this message")
        
        return {"status": "deleted"}
    except Exception as e:
        logger.error(f"Error deleting message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/messages/{message_id}")
async def edit_message(
    message_id: str,
    content: str = Body(...),
    current_user: dict = Depends(get_current_user),
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """Edit a message"""
    try:
        message = await messaging_service.edit_message(message_id, current_user["sub"], content)
        
        if not message:
            raise HTTPException(status_code=403, detail="Cannot edit this message")
        
        return message
    except Exception as e:
        logger.error(f"Error editing message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/messages/{message_id}/reactions")
async def add_reaction(
    message_id: str,
    emoji: str = Body(...),
    current_user: dict = Depends(get_current_user),
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """Add emoji reaction to message"""
    try:
        await messaging_service.add_reaction(message_id, current_user["sub"], emoji)
        return {"status": "added", "emoji": emoji}
    except Exception as e:
        logger.error(f"Error adding reaction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unread")
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
    messaging_service: MessagingService = Depends(get_messaging_service),
    cache_service = Depends(get_cache_service)
):
    """Get unread message count"""
    try:
        cache_key = f"user:unread:{current_user['sub']}"
        cached = await cache_service.get(cache_key)
        if cached:
            return json.loads(cached)
        
        result = await messaging_service.get_unread_count(current_user["sub"])
        await cache_service.set(cache_key, json.dumps(result), expire=60)
        return result
    except Exception as e:
        logger.error(f"Error fetching unread count: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search/{conversation_id}")
async def search_messages(
    conversation_id: str,
    query: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """Search messages in conversation"""
    try:
        results = await messaging_service.search_messages(
            conversation_id,
            query,
            page,
            page_size
        )
        return results
    except Exception as e:
        logger.error(f"Error searching messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations/{conversation_id}/archive")
async def archive_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """Archive a conversation"""
    try:
        await messaging_service.archive_conversation(conversation_id, current_user["sub"])
        return {"status": "archived"}
    except Exception as e:
        logger.error(f"Error archiving conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations/{conversation_id}/mute")
async def mute_conversation(
    conversation_id: str,
    mute: bool = Body(...),
    current_user: dict = Depends(get_current_user),
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """Mute or unmute conversation notifications"""
    try:
        await messaging_service.mute_conversation(conversation_id, current_user["sub"], mute)
        return {"status": "muted" if mute else "unmuted"}
    except Exception as e:
        logger.error(f"Error muting conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# WebSocket endpoint for real-time messaging
@router.websocket("/conversations/{conversation_id}/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    conversation_id: str,
    token: str = None,
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """WebSocket endpoint for real-time chat"""
    from app.core.security import verify_token

    # Verify JWT token
    if not token:
        await websocket.close(code=1008, reason="Missing authentication token")
        return
    payload = verify_token(token)
    if not payload or not payload.get("sub"):
        await websocket.close(code=1008, reason="Invalid or expired token")
        return
    user_id = payload["sub"]
    
    try:
        await manager.connect(conversation_id, websocket, user_id)
        
        # Notify others that user joined
        await manager.broadcast(
            conversation_id,
            {
                "type": "user_joined",
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            exclude_user=user_id
        )
        
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "message":
                # Save message to database
                message = await messaging_service.send_message(
                    conversation_id,
                    user_id,
                    data.get("content", ""),
                    data.get("message_type", "text")
                )
                
                # Broadcast to all clients
                await manager.broadcast(
                    conversation_id,
                    {
                        "type": "message",
                        "data": message
                    }
                )
            
            elif data.get("type") == "typing":
                # Broadcast typing indicator
                await messaging_service.set_typing_indicator(
                    conversation_id,
                    user_id,
                    data.get("is_typing", False)
                )
                
                await manager.broadcast(
                    conversation_id,
                    {
                        "type": "typing",
                        "user_id": user_id,
                        "is_typing": data.get("is_typing", False)
                    },
                    exclude_user=user_id
                )
            
            elif data.get("type") == "read":
                # Mark messages as read
                await messaging_service.mark_as_read(conversation_id, user_id)
                
                await manager.broadcast(
                    conversation_id,
                    {
                        "type": "read",
                        "user_id": user_id
                    }
                )
    
    except WebSocketDisconnect:
        await manager.disconnect(conversation_id, user_id)
        
        # Notify others that user left
        await manager.broadcast(
            conversation_id,
            {
                "type": "user_left",
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await manager.disconnect(conversation_id, user_id)
