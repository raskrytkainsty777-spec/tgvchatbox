from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone
import aiofiles
import uuid

from models import (
    BotCreate, BotResponse, Chat, Message, MessageCreate, 
    BroadcastMessage, MarkReadRequest,
    Label, LabelCreate, LabelResponse,
    QuickReply, QuickReplyCreate, QuickReplyResponse,
    AutoReply, AutoReplyCreate, AutoReplyResponse,
    SetLabelsRequest,
    WelcomeMessage, WelcomeMessageCreate, WelcomeMessageResponse,
    MenuButton, MenuButtonCreate, MenuButtonResponse,
    BotMenu, BotMenuCreate, BotMenuResponse,
    BotMenuAssignment, BotMenuAssignmentResponse
)
from telegram_manager import get_telegram_manager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Telegram manager
telegram_manager = get_telegram_manager(db)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============= BOT ENDPOINTS =============

@api_router.post("/bots", response_model=BotResponse)
async def add_bot(bot_data: BotCreate):
    """Add a new Telegram bot"""
    try:
        bot_id = str(uuid.uuid4())
        bot_info = await telegram_manager.add_bot(bot_id, bot_data.token)
        
        # Save bot to database
        bot_doc = {
            "id": bot_id,
            "token": bot_data.token,
            "username": bot_info["username"],
            "first_name": bot_info["first_name"],
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        }
        await db.bots.insert_one(bot_doc)
        
        return BotResponse(
            id=bot_id,
            username=bot_info["username"],
            first_name=bot_info["first_name"],
            is_active=True,
            created_at=bot_doc["created_at"]
        )
    except Exception as e:
        logger.error(f"Failed to add bot: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/bots", response_model=List[BotResponse])
async def get_bots():
    """Get all bots"""
    bots = await db.bots.find({}, {"_id": 0}).to_list(100)
    return [BotResponse(**bot) for bot in bots]

@api_router.delete("/bots/{bot_id}")
async def delete_bot(bot_id: str):
    """Delete a bot"""
    try:
        await telegram_manager.remove_bot(bot_id)
        await db.bots.delete_one({"id": bot_id})
        await db.chats.delete_many({"bot_id": bot_id})
        await db.messages.delete_many({"bot_id": bot_id})
        return {"success": True, "message": "Bot deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete bot: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.patch("/bots/{bot_id}/toggle")
async def toggle_bot(bot_id: str):
    """Toggle bot active status"""
    bot = await db.bots.find_one({"id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    new_status = not bot.get("is_active", True)
    await db.bots.update_one(
        {"id": bot_id},
        {"$set": {"is_active": new_status}}
    )
    return {"success": True, "is_active": new_status}

# ============= CHAT ENDPOINTS =============

@api_router.get("/chats", response_model=List[Chat])
async def get_chats(
    bot_ids: Optional[str] = None, 
    search: Optional[str] = None,
    unread_only: Optional[bool] = None,
    label_id: Optional[str] = None
):
    """Get all chats with optional filtering"""
    query = {}
    
    # Filter by bot IDs
    if bot_ids:
        bot_id_list = bot_ids.split(",")
        query["bot_id"] = {"$in": bot_id_list}
    
    # Search by username or name
    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}}
        ]
    
    # Filter unread only
    if unread_only:
        query["unread_count"] = {"$gt": 0}
    
    # Filter by label
    if label_id:
        query["label_ids"] = label_id
    
    chats = await db.chats.find(query, {"_id": 0}).sort("last_message_time", -1).to_list(1000)
    return [Chat(**chat) for chat in chats]

@api_router.get("/chats/{chat_id}", response_model=Chat)
async def get_chat(chat_id: str):
    """Get single chat"""
    chat = await db.chats.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return Chat(**chat)

# ============= MESSAGE ENDPOINTS =============

@api_router.get("/messages/{chat_id}", response_model=List[Message])
async def get_messages(chat_id: str, limit: int = 100):
    """Get messages for a chat"""
    messages = await db.messages.find(
        {"chat_id": chat_id}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Reverse to show oldest first
    messages.reverse()
    return [Message(**msg) for msg in messages]

@api_router.post("/messages", response_model=Message)
async def send_message(message_data: MessageCreate):
    """Send a message to user"""
    try:
        message = await telegram_manager.send_message(
            message_data.bot_id,
            message_data.user_id,
            message_data.text,
            message_data.file_id
        )
        return Message(**message)
    except Exception as e:
        logger.error(f"Failed to send message: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/messages/broadcast")
async def broadcast_message(broadcast_data: BroadcastMessage):
    """Send message to multiple users"""
    try:
        result = await telegram_manager.broadcast_message(
            broadcast_data.bot_id,
            broadcast_data.user_ids,
            broadcast_data.text,
            broadcast_data.file_id
        )
        return result
    except Exception as e:
        logger.error(f"Failed to broadcast message: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/messages/file")
async def send_file(
    bot_id: str = Form(...),
    user_id: int = Form(...),
    caption: str = Form(""),
    file: UploadFile = File(...)
):
    """Upload and send file to user"""
    try:
        # Save file temporarily
        file_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        # Send file
        message = await telegram_manager.send_file(bot_id, user_id, file_path, caption)
        
        # Clean up temp file
        os.remove(file_path)
        
        return Message(**message)
    except Exception as e:
        logger.error(f"Failed to send file: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.patch("/messages/read")
async def mark_messages_read(request: MarkReadRequest):
    """Mark all messages in chat as read"""
    await db.messages.update_many(
        {"chat_id": request.chat_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    await db.chats.update_one(
        {"id": request.chat_id},
        {"$set": {"unread_count": 0}}
    )
    return {"success": True}

# ============= LABEL ENDPOINTS =============

@api_router.get("/labels", response_model=List[LabelResponse])
async def get_labels():
    """Get all labels"""
    labels = await db.labels.find({}, {"_id": 0}).to_list(100)
    return [LabelResponse(**label) for label in labels]

@api_router.post("/labels", response_model=LabelResponse)
async def create_label(label_data: LabelCreate):
    """Create a new label"""
    label_doc = {
        "id": str(uuid.uuid4()),
        "name": label_data.name,
        "color": label_data.color,
        "created_at": datetime.now(timezone.utc)
    }
    await db.labels.insert_one(label_doc)
    return LabelResponse(**label_doc)

@api_router.delete("/labels/{label_id}")
async def delete_label(label_id: str):
    """Delete a label"""
    await db.labels.delete_one({"id": label_id})
    # Remove label from all chats
    await db.chats.update_many(
        {},
        {"$pull": {"label_ids": label_id}}
    )
    return {"success": True}

@api_router.patch("/chats/labels")
async def set_chat_labels(request: SetLabelsRequest):
    """Set labels for chats"""
    await db.chats.update_many(
        {"id": {"$in": request.chat_ids}},
        {"$set": {"label_ids": request.label_ids}}
    )
    return {"success": True}

# ============= QUICK REPLY ENDPOINTS =============

@api_router.get("/quick-replies", response_model=List[QuickReplyResponse])
async def get_quick_replies():
    """Get all quick replies"""
    replies = await db.quick_replies.find({}, {"_id": 0}).to_list(100)
    return [QuickReplyResponse(**reply) for reply in replies]

@api_router.post("/quick-replies", response_model=QuickReplyResponse)
async def create_quick_reply(reply_data: QuickReplyCreate):
    """Create a new quick reply"""
    reply_doc = {
        "id": str(uuid.uuid4()),
        "shortcut": reply_data.shortcut,
        "text": reply_data.text,
        "created_at": datetime.now(timezone.utc)
    }
    await db.quick_replies.insert_one(reply_doc)
    return QuickReplyResponse(**reply_doc)

@api_router.delete("/quick-replies/{reply_id}")
async def delete_quick_reply(reply_id: str):
    """Delete a quick reply"""
    await db.quick_replies.delete_one({"id": reply_id})
    return {"success": True}

# ============= AUTO REPLY ENDPOINTS =============

@api_router.get("/auto-replies", response_model=List[AutoReplyResponse])
async def get_auto_replies():
    """Get all auto replies"""
    replies = await db.auto_replies.find({}, {"_id": 0}).to_list(100)
    return [AutoReplyResponse(**reply) for reply in replies]

@api_router.post("/auto-replies", response_model=AutoReplyResponse)
async def create_auto_reply(reply_data: AutoReplyCreate):
    """Create a new auto reply"""
    reply_doc = {
        "id": str(uuid.uuid4()),
        "keywords": reply_data.keywords,
        "message": reply_data.message,
        "is_active": reply_data.is_active,
        "created_at": datetime.now(timezone.utc)
    }
    await db.auto_replies.insert_one(reply_doc)
    return AutoReplyResponse(**reply_doc)

@api_router.patch("/auto-replies/{reply_id}")
async def update_auto_reply(reply_id: str, reply_data: AutoReplyCreate):
    """Update an auto reply"""
    await db.auto_replies.update_one(
        {"id": reply_id},
        {"$set": {
            "keywords": reply_data.keywords,
            "message": reply_data.message,
            "is_active": reply_data.is_active
        }}
    )
    return {"success": True}

@api_router.delete("/auto-replies/{reply_id}")
async def delete_auto_reply(reply_id: str):
    """Delete an auto reply"""
    await db.auto_replies.delete_one({"id": reply_id})
    return {"success": True}

# ============= WELCOME MESSAGE ENDPOINTS =============

@api_router.get("/welcome-messages", response_model=List[WelcomeMessageResponse])
async def get_welcome_messages():
    """Get all welcome messages"""
    messages = await db.welcome_messages.find({}, {"_id": 0}).to_list(100)
    return [WelcomeMessageResponse(**msg) for msg in messages]

@api_router.post("/welcome-messages")
async def create_welcome_message(message_data: WelcomeMessageCreate):
    """Create welcome message for multiple bots"""
    created_messages = []
    for bot_id in message_data.bot_ids:
        # Проверяем нет ли уже приветственного сообщения для этого бота
        existing = await db.welcome_messages.find_one({"bot_id": bot_id})
        if existing:
            # Обновляем существующее
            await db.welcome_messages.update_one(
                {"bot_id": bot_id},
                {"$set": {
                    "text": message_data.text,
                    "is_active": message_data.is_active
                }}
            )
            created_messages.append({
                "id": existing["id"],
                "bot_id": bot_id,
                "text": message_data.text,
                "is_active": message_data.is_active,
                "created_at": existing["created_at"]
            })
        else:
            # Создаем новое
            msg_doc = {
                "id": str(uuid.uuid4()),
                "bot_id": bot_id,
                "text": message_data.text,
                "is_active": message_data.is_active,
                "created_at": datetime.now(timezone.utc)
            }
            await db.welcome_messages.insert_one(msg_doc)
            created_messages.append(msg_doc)
    
    return {"success": True, "messages": created_messages}

@api_router.patch("/welcome-messages/{message_id}")
async def update_welcome_message(message_id: str, message_data: WelcomeMessageCreate):
    """Update a welcome message"""
    await db.welcome_messages.update_one(
        {"id": message_id},
        {"$set": {
            "text": message_data.text,
            "is_active": message_data.is_active
        }}
    )
    return {"success": True}

@api_router.delete("/welcome-messages/{message_id}")
async def delete_welcome_message(message_id: str):
    """Delete a welcome message"""
    await db.welcome_messages.delete_one({"id": message_id})
    return {"success": True}

# ============= MENU BUTTON ENDPOINTS =============

@api_router.get("/menu-buttons", response_model=List[MenuButtonResponse])
async def get_menu_buttons():
    """Get all menu buttons"""
    buttons = await db.menu_buttons.find({}, {"_id": 0}).to_list(100)
    return [MenuButtonResponse(**btn) for btn in buttons]

@api_router.post("/menu-buttons", response_model=MenuButtonResponse)
async def create_menu_button(button_data: MenuButtonCreate):
    """Create a menu button"""
    button_doc = {
        "id": str(uuid.uuid4()),
        "name": button_data.name,
        "actions": [action.dict() for action in button_data.actions],
        "created_at": datetime.now(timezone.utc)
    }
    await db.menu_buttons.insert_one(button_doc)
    return MenuButtonResponse(**button_doc)

@api_router.delete("/menu-buttons/{button_id}")
async def delete_menu_button(button_id: str):
    """Delete a menu button"""
    await db.menu_buttons.delete_one({"id": button_id})
    return {"success": True}

# ============= BOT MENU ENDPOINTS =============

@api_router.get("/bot-menus", response_model=List[BotMenuResponse])
async def get_bot_menus():
    """Get all bot menus"""
    menus = await db.bot_menus.find({}, {"_id": 0}).to_list(100)
    return [BotMenuResponse(**menu) for menu in menus]

@api_router.post("/bot-menus", response_model=BotMenuResponse)
async def create_bot_menu(menu_data: BotMenuCreate):
    """Create a bot menu"""
    menu_doc = {
        "id": str(uuid.uuid4()),
        "name": menu_data.name,
        "button_ids": menu_data.button_ids,
        "created_at": datetime.now(timezone.utc)
    }
    await db.bot_menus.insert_one(menu_doc)
    return BotMenuResponse(**menu_doc)

@api_router.patch("/bot-menus/{menu_id}")
async def update_bot_menu(menu_id: str, menu_data: BotMenuCreate):
    """Update a bot menu"""
    await db.bot_menus.update_one(
        {"id": menu_id},
        {"$set": {
            "name": menu_data.name,
            "button_ids": menu_data.button_ids
        }}
    )
    return {"success": True}

@api_router.delete("/bot-menus/{menu_id}")
async def delete_bot_menu(menu_id: str):
    """Delete a bot menu"""
    await db.bot_menus.delete_one({"id": menu_id})
    # Remove from bot assignments
    await db.bot_menu_assignments.delete_many({"menu_id": menu_id})
    return {"success": True}

# ============= BOT MENU ASSIGNMENT ENDPOINTS =============

@api_router.get("/bot-menu-assignments", response_model=List[BotMenuAssignmentResponse])
async def get_bot_menu_assignments():
    """Get all bot-menu assignments"""
    assignments = await db.bot_menu_assignments.find({}, {"_id": 0}).to_list(100)
    result = []
    for assignment in assignments:
        menu = await db.bot_menus.find_one({"id": assignment["menu_id"]})
        result.append({
            "bot_id": assignment["bot_id"],
            "menu_id": assignment["menu_id"],
            "menu_name": menu["name"] if menu else None
        })
    return result

@api_router.post("/bot-menu-assignments")
async def assign_menu_to_bot(assignment: BotMenuAssignment):
    """Assign menu to bot (one menu per bot)"""
    # Remove existing assignment for this bot
    await db.bot_menu_assignments.delete_many({"bot_id": assignment.bot_id})
    
    # Create new assignment
    assignment_doc = {
        "bot_id": assignment.bot_id,
        "menu_id": assignment.menu_id
    }
    await db.bot_menu_assignments.insert_one(assignment_doc)
    return {"success": True}

@api_router.delete("/bot-menu-assignments/{bot_id}")
async def remove_bot_menu_assignment(bot_id: str):
    """Remove menu assignment from bot"""
    await db.bot_menu_assignments.delete_many({"bot_id": bot_id})
    return {"success": True}

@api_router.get("/stats")
async def get_stats():
    """Get statistics"""
    total_bots = await db.bots.count_documents({})
    active_bots = await db.bots.count_documents({"is_active": True})
    total_chats = await db.chats.count_documents({})
    total_messages = await db.messages.count_documents({})
    unread_count = await db.chats.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$unread_count"}}}
    ]).to_list(1)
    
    return {
        "total_bots": total_bots,
        "active_bots": active_bots,
        "total_chats": total_chats,
        "total_messages": total_messages,
        "total_unread": unread_count[0]["total"] if unread_count else 0
    }

# Health check
@api_router.get("/")
async def root():
    return {"message": "Telegram Chat Panel API", "status": "running"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize bots on startup"""
    logger.info("Starting up... Loading existing bots")
    bots = await db.bots.find({"is_active": True}).to_list(100)
    for bot in bots:
        try:
            await telegram_manager.add_bot(bot["id"], bot["token"])
            logger.info(f"Loaded bot: {bot['username']}")
        except Exception as e:
            logger.error(f"Failed to load bot {bot['id']}: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Shutdown all bots"""
    for bot_id in list(telegram_manager.applications.keys()):
        try:
            await telegram_manager.remove_bot(bot_id)
        except Exception as e:
            logger.error(f"Failed to remove bot {bot_id}: {e}")
    client.close()
