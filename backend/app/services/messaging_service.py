"""Real-time messaging and chat service"""

from datetime import datetime, timezone
from typing import Dict, List, Optional

from bson import ObjectId
from bson.errors import InvalidId

from app.db.client import get_required_db


class MessagingService:
    """Handle all messaging and chat operations"""

    def __init__(self, db):
        self.db = db
        self.messages_collection = db.messages
        self.conversations_collection = db.conversations
        self.typing_indicators = {}  # In-memory typing status

    def _parse_object_id(self, value: str) -> Optional[ObjectId]:
        try:
            return ObjectId(value)
        except (InvalidId, TypeError):
            return None

    async def get_conversation(self, conversation_id: str) -> Optional[Dict]:
        conversation_oid = self._parse_object_id(conversation_id)
        if not conversation_oid:
            return None
        return await self.conversations_collection.find_one({"_id": conversation_oid})

    async def is_participant(self, conversation_id: str, user_id: str) -> bool:
        conversation = await self.get_conversation(conversation_id)
        return bool(conversation and user_id in conversation.get("participants", []))

    async def get_conversation_participants(self, conversation_id: str) -> List[str]:
        conversation = await self.get_conversation(conversation_id)
        if not conversation:
            return []
        return list(conversation.get("participants", []))

    async def get_message_document(self, message_id: str) -> Optional[Dict]:
        message_oid = self._parse_object_id(message_id)
        if not message_oid:
            return None
        return await self.messages_collection.find_one({"_id": message_oid})

    async def create_conversation(
        self, participant_1: str, participant_2: str, initial_message: Optional[str] = None
    ) -> str:
        """Create or get existing conversation between two users"""
        # Check if conversation already exists
        existing = await self.conversations_collection.find_one(
            {"participants": {"$all": [participant_1, participant_2]}}
        )

        if existing:
            return str(existing["_id"])

        # Create new conversation
        conversation = {
            "participants": [participant_1, participant_2],
            "created_at": datetime.now(timezone.utc),
            "last_message_at": None,
            "archived_by": [],
            "muted_by": [],
        }

        result = await self.conversations_collection.insert_one(conversation)
        conv_id = str(result.inserted_id)

        # Add initial message if provided
        if initial_message:
            await self.send_message(
                conversation_id=conv_id,
                sender_id=participant_1,
                content=initial_message,
                message_type="text",
            )

        return conv_id

    async def send_message(
        self,
        conversation_id: str,
        sender_id: str,
        content: str,
        message_type: str = "text",
        attachment_url: Optional[str] = None,
    ) -> Dict:
        """Send a message in a conversation"""
        # Verify sender is participant
        conv = await self.get_conversation(conversation_id)
        if not conv or sender_id not in conv["participants"]:
            raise ValueError("Invalid conversation or sender not a participant")

        message = {
            "conversation_id": ObjectId(conversation_id),
            "sender_id": sender_id,
            "content": content,
            "message_type": message_type,
            "attachment_url": attachment_url,
            "is_read": False,
            "read_at": None,
            "created_at": datetime.now(timezone.utc),
            "edited": False,
            "edited_at": None,
            "reactions": [],  # emoji reactions
        }

        result = await self.messages_collection.insert_one(message)

        # Update conversation's last message timestamp
        await self.conversations_collection.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {"last_message_at": datetime.now(timezone.utc)}},
        )

        return {"id": str(result.inserted_id), **message, "conversation_id": conversation_id}

    async def get_messages(self, conversation_id: str, page: int = 1, page_size: int = 50) -> Dict:
        """Get paginated message history"""
        skip = (page - 1) * page_size

        messages = (
            await self.messages_collection.find({"conversation_id": ObjectId(conversation_id)})
            .sort("created_at", -1)
            .skip(skip)
            .limit(page_size)
            .to_list(None)
        )

        total = await self.messages_collection.count_documents(
            {"conversation_id": ObjectId(conversation_id)}
        )

        return {
            "messages": [self._format_message(m) for m in reversed(messages)],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size,
            },
        }

    async def get_conversations(self, user_id: str, page: int = 1, page_size: int = 20) -> Dict:
        """Get all conversations for a user"""
        skip = (page - 1) * page_size

        conversations = (
            await self.conversations_collection.find(
                {"participants": user_id, "archived_by": {"$ne": user_id}}
            )
            .sort("last_message_at", -1)
            .skip(skip)
            .limit(page_size)
            .to_list(None)
        )

        total = await self.conversations_collection.count_documents(
            {"participants": user_id, "archived_by": {"$ne": user_id}}
        )

        formatted_convs = []
        for conv in conversations:
            # Get last message
            last_msg = await self.messages_collection.find_one(
                {"conversation_id": conv["_id"]}, sort=[("created_at", -1)]
            )

            # Count unread messages
            unread = await self.messages_collection.count_documents(
                {"conversation_id": conv["_id"], "sender_id": {"$ne": user_id}, "is_read": False}
            )

            formatted_convs.append(
                {
                    "id": str(conv["_id"]),
                    "participants": conv["participants"],
                    "last_message": self._format_message(last_msg) if last_msg else None,
                    "last_message_at": conv.get("last_message_at"),
                    "is_muted": user_id in conv.get("muted_by", []),
                    "unread_count": unread,
                    "created_at": conv["created_at"],
                }
            )

        return {
            "conversations": formatted_convs,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size,
            },
        }

    async def mark_as_read(self, conversation_id: str, user_id: str) -> int:
        """Mark all messages in conversation as read by user"""
        result = await self.messages_collection.update_many(
            {
                "conversation_id": ObjectId(conversation_id),
                "sender_id": {"$ne": user_id},
                "is_read": False,
            },
            {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}},
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
                    "is_read": False,
                }
            },
            {"$group": {"_id": "$conversation_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]

        results = await self.messages_collection.aggregate(pipeline).to_list(None)

        total_unread = sum(r["count"] for r in results)
        conversations = [
            {"conversation_id": str(r["_id"]), "unread_count": r["count"]} for r in results
        ]

        return {"total_unread": total_unread, "conversations": conversations}

    async def search_messages(
        self, conversation_id: str, query: str, page: int = 1, page_size: int = 20
    ) -> Dict:
        """Search messages in a conversation"""
        skip = (page - 1) * page_size

        messages = (
            await self.messages_collection.find(
                {
                    "conversation_id": ObjectId(conversation_id),
                    "content": {"$regex": query, "$options": "i"},
                }
            )
            .sort("created_at", -1)
            .skip(skip)
            .limit(page_size)
            .to_list(None)
        )

        total = await self.messages_collection.count_documents(
            {
                "conversation_id": ObjectId(conversation_id),
                "content": {"$regex": query, "$options": "i"},
            }
        )

        return {
            "messages": [self._format_message(m) for m in reversed(messages)],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def delete_message(self, message_id: str, user_id: str) -> Optional[Dict]:
        """Delete a message (only by sender)"""
        message = await self.get_message_document(message_id)

        if not message or message["sender_id"] != user_id:
            return None

        await self.messages_collection.delete_one({"_id": message["_id"]})
        return self._format_message(message)

    async def edit_message(self, message_id: str, user_id: str, new_content: str) -> Optional[Dict]:
        """Edit a message (only by sender, within 15 minutes)"""
        message = await self.get_message_document(message_id)

        if not message or message["sender_id"] != user_id:
            return None

        # Check if within 15 minutes
        if (datetime.now(timezone.utc) - message["created_at"]).total_seconds() > 900:
            return None

        await self.messages_collection.update_one(
            {"_id": message["_id"]},
            {
                "$set": {
                    "content": new_content,
                    "edited": True,
                    "edited_at": datetime.now(timezone.utc),
                }
            },
        )

        updated = await self.messages_collection.find_one({"_id": message["_id"]})
        return self._format_message(updated)

    async def add_reaction(self, message_id: str, user_id: str, emoji: str) -> Optional[Dict]:
        """Toggle emoji reaction on a message for the current user"""
        message = await self.get_message_document(message_id)
        if not message:
            return None

        conversation_id = str(message.get("conversation_id"))
        if not await self.is_participant(conversation_id, user_id):
            return None

        existing_reaction = next(
            (
                reaction
                for reaction in message.get("reactions", [])
                if reaction.get("emoji") == emoji and reaction.get("user_id") == user_id
            ),
            None,
        )

        if existing_reaction:
            await self.messages_collection.update_one(
                {"_id": message["_id"]},
                {"$pull": {"reactions": {"emoji": emoji, "user_id": user_id}}},
            )
            status = "removed"
        else:
            await self.messages_collection.update_one(
                {"_id": message["_id"]},
                {
                    "$addToSet": {
                        "reactions": {
                            "emoji": emoji,
                            "user_id": user_id,
                            "added_at": datetime.now(timezone.utc),
                        }
                    }
                },
            )
            status = "added"

        updated = await self.messages_collection.find_one({"_id": message["_id"]})
        return {
            "status": status,
            "message": self._format_message(updated),
        }

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
            {"_id": ObjectId(conversation_id)}, {"$addToSet": {"archived_by": user_id}}
        )
        return True

    async def mute_conversation(self, conversation_id: str, user_id: str, mute: bool) -> bool:
        """Mute notifications for conversation"""
        if mute:
            await self.conversations_collection.update_one(
                {"_id": ObjectId(conversation_id)}, {"$addToSet": {"muted_by": user_id}}
            )
        else:
            await self.conversations_collection.update_one(
                {"_id": ObjectId(conversation_id)}, {"$pull": {"muted_by": user_id}}
            )
        return True

    def _format_message(self, msg) -> Optional[Dict]:
        """Format message for API response"""
        if not msg:
            return None

        # Serialize reactions to avoid ObjectId in output
        raw_reactions = msg.get("reactions", [])
        reactions = []
        for r in raw_reactions:
            reactions.append(
                {
                    "emoji": r.get("emoji"),
                    "user_id": r.get("user_id"),
                    "added_at": (
                        r["added_at"].isoformat()
                        if isinstance(r.get("added_at"), datetime)
                        else r.get("added_at")
                    ),
                }
            )

        created_at = msg.get("created_at")
        if isinstance(created_at, datetime):
            created_at = created_at.isoformat()

        return {
            "id": str(msg["_id"]),
            "sender_id": msg["sender_id"],
            "conversation_id": str(msg["conversation_id"]),
            "content": msg.get("content", ""),
            "message_type": msg.get("message_type", "text"),
            "attachment_url": msg.get("attachment_url"),
            "is_read": msg.get("is_read", False),
            "read_at": (
                msg["read_at"].isoformat()
                if isinstance(msg.get("read_at"), datetime)
                else msg.get("read_at")
            ),
            "created_at": created_at,
            "edited": msg.get("edited", False),
            "edited_at": (
                msg["edited_at"].isoformat()
                if isinstance(msg.get("edited_at"), datetime)
                else msg.get("edited_at")
            ),
            "reactions": reactions,
        }


# Global messaging service instance
messaging_service: Optional[MessagingService] = None


async def get_messaging_service() -> MessagingService:
    """Get messaging service instance"""
    global messaging_service
    if not messaging_service:
        messaging_service = MessagingService(get_required_db())
    return messaging_service
