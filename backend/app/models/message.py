"""Message and Chat models for real-time communication"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    """Create a new message"""

    recipient_id: str
    content: str
    message_type: str = "text"  # text, image, file
    attachment_url: Optional[str] = None


class MessageUpdate(BaseModel):
    """Update a message"""

    content: Optional[str] = None
    is_read: Optional[bool] = None


class MessageResponse(BaseModel):
    """Message response model"""

    id: str
    sender_id: str
    recipient_id: str
    content: str
    message_type: str
    attachment_url: Optional[str] = None
    is_read: bool
    created_at: datetime
    updated_at: datetime
    sender_name: Optional[str] = None
    sender_avatar: Optional[str] = None


class ConversationCreate(BaseModel):
    """Create a new conversation"""

    participant_ids: List[str] = Field(..., min_items=2, max_items=2)
    initial_message: Optional[str] = None


class ConversationResponse(BaseModel):
    """Conversation response model"""

    id: str
    participant_ids: List[str]
    last_message: Optional[MessageResponse] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime
    participants: Optional[List[dict]] = None  # User info for participants


class ChatHistoryRequest(BaseModel):
    """Request for chat history"""

    page: int = 1
    page_size: int = 50
    sort_by: str = "created_at"  # created_at, status


class TypingIndicator(BaseModel):
    """WebSocket typing indicator message"""

    conversation_id: str
    user_id: str
    is_typing: bool


class MessageReaction(BaseModel):
    """Message reaction/emoji response"""

    message_id: str
    emoji: str
    user_id: str


class ConversationListResponse(BaseModel):
    """List of conversations with pagination"""

    conversations: List[ConversationResponse]
    pagination: dict = {"page": 1, "page_size": 20, "total": 0, "total_pages": 1}


class UnreadCountResponse(BaseModel):
    """Unread message count"""

    total_unread: int
    conversations: List[dict] = []  # {"conversation_id": "...", "unread_count": 5}


class MessageSearchRequest(BaseModel):
    """Search messages in a conversation"""

    conversation_id: str
    query: str
    page: int = 1
    page_size: int = 20


class MessageSearchResponse(BaseModel):
    """Message search results"""

    messages: List[MessageResponse]
    total: int
    page: int
    page_size: int
