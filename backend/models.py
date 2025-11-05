from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

class Bot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    token: str
    username: str
    first_name: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BotCreate(BaseModel):
    token: str

class BotResponse(BaseModel):
    id: str
    username: str
    first_name: str
    is_active: bool
    created_at: datetime

class Chat(BaseModel):
    id: str
    bot_id: str
    user_id: int
    username: str
    first_name: str
    last_name: str
    last_message: str
    last_message_time: datetime
    unread_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chat_id: str
    bot_id: str
    user_id: int
    text: str
    file_id: Optional[str] = None
    file_type: Optional[str] = None
    is_from_bot: bool
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MessageCreate(BaseModel):
    bot_id: str
    user_id: int
    text: str
    file_id: Optional[str] = None

class BroadcastMessage(BaseModel):
    bot_id: str
    user_ids: List[int]
    text: str
    file_id: Optional[str] = None

class MarkReadRequest(BaseModel):
    chat_id: str