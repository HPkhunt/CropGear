"""Real-time messaging and chat service"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict
from app.db.client import get_required_db
from app.models.message import (
    MessageCreate, 
    MessageResponse,
    ConversationResponse,
    UnreadCountResponse
)
import json
from bson import ObjectId


class MessagingService:
    """Handle all messaging and chat operations"""
    
    def __init__(self, db):
        self.db = db
        self.messages_collection = db.messages
        self.conversations_collection = db.conversations
        self.typing_indicators = {}  # In-memory typing status
        
    async def create_conversation(self, participant_1: str, participant_2: str, initial_message: Optional[str] = None) -> str:
        """Create or get existing conversation between two users"""
        # Check if conversation already exists
        existing = await self.conversations_collection.find_one({
            "participants": {"$all": [participant_1, participant_2]}
        })
        
        if existing:
            return str(existing["_id"])
        
        # Create new conversation
        conversation = {
            "participants": [participant_1, participant_2],
            "last_message": initial_message if initial_message else None,
            "updated_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
        
        result = await self.conversations_collection.insert_one(conversation)
        conv_id = str(result.inserted_id)
        
        # Add initial message if provided
        if initial_message:
            await self.send_message(
                conversation_id=conv_id,
                sender_id=participant_1,
                content=initial_message,
                message_type="text"
            )
        
        return conv_id
    
    async def send_message(
        self,
        conversation_id: str,
        sender_id: str,
        content: str,
        message_type: str = "text",
        attachment_url: Optional[str] = None
    ) -> Dict:
        """Send a message in a conversation"""
        # Verify sender is participant
        conv = await self.conversations_collection.find_one({"_id": ObjectId(conversation_id)})
        if not conv or sender_id not in conv["participants"]:
            raise ValueError("Invalid conversation or sender not a participant")
        
        message = {
            "conversation_id": ObjectId(conversation_id),
            "sender_id": sender_id,
            "recipient_id": [p for p in conv["participants"] if p != sender_id][0],
            "message": content,
            "timestamp": datetime.now(timezone.utc),
            "status": "sent",
            "message_type": message_type,
            "attachment_url": attachment_url,
            "reactions": []
        }
        
        result = await self.messages_collection.insert_one(message)
        
        # Update conversation's last message
        await self.conversations_collection.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {
                "last_message": content,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        return {
            "id": str(result.inserted_id),
            "sender_id": sender_id,
            "recipient_id": message["recipient_id"],
            "message": content,
            "timestamp": message["timestamp"],
            "status": "sent",
            "message_type": message_type,
            "attachment_url": attachment_url
        }
    
    async def get_messages(self, conversation_id: str, page: int = 1, page_size: int = 50) -> Dict:
        """Get paginated message history"""
        skip = (page - 1) * page_size
        
        messages = await self.messages_collection.find(
            {"conversation_id": ObjectId(conversation_id)}
        ).sort("created_at", -1).skip(skip).limit(page_size).to_list(None)
        
        total = await self.messages_collection.count_documents(
            {"conversation_id": ObjectId(conversation_id)}
        )
        
        return {
            "messages": [self._format_message(m) for m in reversed(messages)],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size
            }
        }
    
    async def get_conversations(self, user_id: str, page: int = 1, page_size: int = 20) -> Dict:
        """Get all conversations for a user"""
        skip = (page - 1) * page_size
        
        conversations = await self.conversations_collection.find(
            {
                "participants": user_id,
                "archived_by": {"$ne": user_id}
            }
        ).sort("last_message_at", -1).skip(skip).limit(page_size).to_list(None)
        
        total = await self.conversations_collection.count_documents(
            {
                "participants": user_id,
                "archived_by": {"$ne": user_id}
            }
        )
        
        formatted_convs = []
        for conv in conversations:
            # Get last message
            last_msg = await self.messages_collection.find_one(
                {"conversation_id": conv["_id"]},
                sort=[("created_at", -1)]
            )
            
            # Count unread messages (messages where status is not 'seen' and recipient is current user)
            unread = await self.messages_collection.count_documents({
                "conversation_id": conv["_id"],
                "recipient_id": user_id,
                "status": {"$ne": "seen"}
            })
            
            formatted_convs.append({
                "id": str(conv["_id"]),
                "participants": conv["participants"],
                "last_message": conv.get("last_message"),
                "updated_at": conv.get("updated_at"),
                "unread_count": unread,
                "created_at": conv["created_at"]
            })
        
        return {
            "conversations": formatted_convs,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size
            }
        }
    
    async def mark_as_read(self, conversation_id: str, user_id: str) -> int:
        """Mark all messages in conversation as seen by user"""
        result = await self.messages_collection.update_many(
            {
                "conversation_id": ObjectId(conversation_id),
                "recipient_id": user_id,
                "status": {"$ne": "seen"}
            },
            {
                "$set": {
                    "status": "seen"
                }
            }
        )
        
        return result.modified_count
    
    async def get_unread_count(self, user_id: str) -> Dict:
        """Get total unread messages for user"""
        # First, get the conversation IDs the user actually belongs to
        user_convs = await self.conversations_collection.find(
            {"participants": user_id}, {"_id": 1}
        ).to_list(None)
        user_conv_ids = [conv["_id"] for conv in user_convs]
        if not user_conv_ids:
            return {"total_unread": 0, "conversations": []}

        pipeline = [
            {
                "$match": {
                    "conversation_id": {"$in": user_conv_ids},
                    "sender_id": {"$ne": user_id},
                    "is_read": False
                }
            },
            {
                "$group": {
                    "_id": "$conversation_id",
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"count": -1}
            }
        ]
        
        results = await self.messages_collection.aggregate(pipeline).to_list(None)
        
        total_unread = sum(r["count"] for r in results)
        conversations = [
            {
                "conversation_id": str(r["_id"]),
                "unread_count": r["count"]
            }
            for r in results
        ]
        
        return {
            "total_unread": total_unread,
            "conversations": conversations
        }
    
    async def search_messages(self, conversation_id: str, query: str, page: int = 1, page_size: int = 20) -> Dict:
        """Search messages in a conversation"""
        skip = (page - 1) * page_size
        
        messages = await self.messages_collection.find(
            {
                "conversation_id": ObjectId(conversation_id),
                "content": {"$regex": query, "$options": "i"}
            }
        ).sort("created_at", -1).skip(skip).limit(page_size).to_list(None)
        
        total = await self.messages_collection.count_documents(
            {
                "conversation_id": ObjectId(conversation_id),
                "content": {"$regex": query, "$options": "i"}
            }
        )
        
        return {
            "messages": [self._format_message(m) for m in reversed(messages)],
            "total": total,
            "page": page,
            "page_size": page_size
        }
    
    async def delete_message(self, message_id: str, user_id: str) -> bool:
        """Delete a message (only by sender)"""
        message = await self.messages_collection.find_one({"_id": ObjectId(message_id)})
        
        if not message or message["sender_id"] != user_id:
            return False
        
        await self.messages_collection.delete_one({"_id": ObjectId(message_id)})
        return True
    
    async def edit_message(self, message_id: str, user_id: str, new_content: str) -> Optional[Dict]:
        """Edit a message (only by sender, within 15 minutes)"""
        message = await self.messages_collection.find_one({"_id": ObjectId(message_id)})
        
        if not message or message["sender_id"] != user_id:
            return None
        
        # Check if within 15 minutes
        if (datetime.now(timezone.utc) - message["created_at"]).total_seconds() > 900:
            return None
        
        await self.messages_collection.update_one(
            {"_id": ObjectId(message_id)},
            {
                "$set": {
                    "content": new_content,
                    "edited": True,
                    "edited_at": datetime.now(timezone.utc)
                }
            }
        )
        
        updated = await self.messages_collection.find_one({"_id": ObjectId(message_id)})
        return self._format_message(updated)
    
    async def add_reaction(self, message_id: str, user_id: str, emoji: str) -> bool:
        """Add emoji reaction to message"""
        await self.messages_collection.update_one(
            {"_id": ObjectId(message_id)},
            {
                "$addToSet": {
                    "reactions": {
                        "emoji": emoji,
                        "user_id": user_id,
                        "added_at": datetime.now(timezone.utc)
                    }
                }
            }
        )
        return True
    
    async def set_typing_indicator(self, conversation_id: str, user_id: str, is_typing: bool):
        """Set typing indicator status"""
        key = f"{conversation_id}:{user_id}"
        if is_typing:
            self.typing_indicators[key] = datetime.now(timezone.utc)
        else:
            self.typing_indicators.pop(key, None)
    
    async def get_typing_users(self, conversation_id: str, exclude_user: str) -> List[str]:
        """Get users currently typing in conversation"""
        now = datetime.now(timezone.utc)
        typing_users = []
        
        for key, timestamp in self.typing_indicators.items():
            conv_id, user_id = key.split(":")
            if conv_id == conversation_id and user_id != exclude_user:
                # Consider typing indicator valid for 5 seconds
                if (now - timestamp).total_seconds() < 5:
                    typing_users.append(user_id)
        
        return typing_users
    
    async def archive_conversation(self, conversation_id: str, user_id: str) -> bool:
        """Archive conversation for user"""
        await self.conversations_collection.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$addToSet": {"archived_by": user_id}}
        )
        return True
    
    async def mute_conversation(self, conversation_id: str, user_id: str, mute: bool) -> bool:
        """Mute notifications for conversation"""
        if mute:
            await self.conversations_collection.update_one(
                {"_id": ObjectId(conversation_id)},
                {"$addToSet": {"muted_by": user_id}}
            )
        else:
            await self.conversations_collection.update_one(
                {"_id": ObjectId(conversation_id)},
                {"$pull": {"muted_by": user_id}}
            )
        return True
    
    def _format_message(self, msg) -> Optional[Dict]:
        """Format message for API response"""
        if not msg:
            return None

        timestamp = msg.get("timestamp") or msg.get("created_at")
        if isinstance(timestamp, datetime):
            timestamp = timestamp.isoformat()

        return {
            "id": str(msg["_id"]),
            "sender_id": msg["sender_id"],
            "recipient_id": msg.get("recipient_id"),
            "message": msg.get("message", msg.get("content", "")),
            "timestamp": timestamp,
            "status": msg.get("status", "sent"),
            "message_type": msg.get("message_type", "text"),
            "attachment_url": msg.get("attachment_url")
        }


# Global messaging service instance
messaging_service: Optional[MessagingService] = None


async def get_messaging_service() -> MessagingService:
    """Get messaging service instance"""
    global messaging_service
    if not messaging_service:
        messaging_service = MessagingService(get_required_db())
    return messaging_service
