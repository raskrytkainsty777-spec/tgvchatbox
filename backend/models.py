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
    label_ids: List[str] = []
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

# ============= NEW MODELS =============

class Label(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: str  # hex color like #FF5733
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LabelCreate(BaseModel):
    name: str
    color: str

class LabelResponse(BaseModel):
    id: str
    name: str
    color: str
    created_at: datetime

class QuickReply(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    shortcut: str  # например "привет" для /привет
    text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class QuickReplyCreate(BaseModel):
    shortcut: str
    text: str

class QuickReplyResponse(BaseModel):
    id: str
    shortcut: str
    text: str
    created_at: datetime

class AutoReply(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    keywords: List[str]  # ключевые слова
    message: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AutoReplyCreate(BaseModel):
    keywords: List[str]
    message: str
    is_active: bool = True

class AutoReplyResponse(BaseModel):
    id: str
    keywords: List[str]
    message: str
    is_active: bool
    created_at: datetime

class SetLabelsRequest(BaseModel):
    chat_ids: List[str]
    label_ids: List[str]

class WelcomeMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    bot_id: str
    text: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class WelcomeMessageCreate(BaseModel):
    bot_ids: List[str]  # Может быть несколько ботов
    text: str
    is_active: bool = True

class WelcomeMessageResponse(BaseModel):
    id: str
    bot_id: str
    text: str
    is_active: bool
    created_at: datetime

# ============= MENU SYSTEM MODELS =============

class ButtonAction(BaseModel):
    type: str  # "label", "url", "text", "block", "back"
    value: Optional[dict] = None  # Для разных типов разные значения

class MenuButton(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # Название на кнопке
    actions: List[ButtonAction] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MenuButtonCreate(BaseModel):
    name: str
    actions: List[ButtonAction] = []

class MenuButtonResponse(BaseModel):
    id: str
    name: str
    actions: List[ButtonAction]
    created_at: datetime

class BotMenu(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    button_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BotMenuCreate(BaseModel):
    name: str
    button_ids: List[str] = []

class BotMenuResponse(BaseModel):
    id: str
    name: str
    button_ids: List[str]
    created_at: datetime

class BotMenuAssignment(BaseModel):
    bot_id: str
    menu_id: str

class BotMenuAssignmentResponse(BaseModel):
    bot_id: str
    menu_id: str
    menu_name: Optional[str] = None