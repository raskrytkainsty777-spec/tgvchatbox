import asyncio
import logging
from typing import Dict, Optional, List
from telegram import Bot, Update, File
from telegram.ext import Application, MessageHandler, filters, ContextTypes
from telegram.error import TelegramError
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

logger = logging.getLogger(__name__)

class TelegramBotManager:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.applications: Dict[str, Application] = {}
        self.bots: Dict[str, Bot] = {}
        
    async def add_bot(self, bot_id: str, token: str) -> dict:
        """Add a new bot and start listening for messages"""
        try:
            # Create bot instance
            bot = Bot(token=token)
            bot_info = await bot.get_me()
            
            # Create application
            application = Application.builder().token(token).build()
            
            # Add message handler
            async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
                await self._handle_incoming_message(update, bot_id)
            
            # Add callback query handler for button presses
            async def handle_callback_query(update: Update, context: ContextTypes.DEFAULT_TYPE):
                await self._handle_button_press(update, bot_id)
            
            from telegram.ext import CallbackQueryHandler
            application.add_handler(MessageHandler(filters.ALL, handle_message))
            application.add_handler(CallbackQueryHandler(handle_callback_query))
            
            # Start application in background
            await application.initialize()
            await application.start()
            await application.updater.start_polling()
            
            self.applications[bot_id] = application
            self.bots[bot_id] = bot
            
            return {
                "id": bot_id,
                "username": bot_info.username,
                "first_name": bot_info.first_name,
                "success": True
            }
        except TelegramError as e:
            logger.error(f"Failed to add bot: {e}")
            raise Exception(f"Invalid token or bot error: {str(e)}")
    
    async def remove_bot(self, bot_id: str):
        """Remove a bot and stop listening"""
        if bot_id in self.applications:
            app = self.applications[bot_id]
            await app.updater.stop()
            await app.stop()
            await app.shutdown()
            del self.applications[bot_id]
            del self.bots[bot_id]
    
    async def _handle_incoming_message(self, update: Update, bot_id: str):
        """Handle incoming message from user"""
        if not update.message:
            return
            
        message = update.message
        user = message.from_user
        
        # Проверяем команду /start
        if message.text and message.text.strip().lower() == '/start':
            await self._send_welcome_message(bot_id, user.id)
        
        # Save or update chat
        chat_id = f"{bot_id}_{user.id}"
        chat_data = {
            "id": chat_id,
            "bot_id": bot_id,
            "user_id": user.id,
            "username": user.username or "",
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "last_message": message.text or "[File]",
            "last_message_time": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        existing_chat = await self.db.chats.find_one({"id": chat_id})
        if existing_chat:
            await self.db.chats.update_one(
                {"id": chat_id},
                {
                    "$set": chat_data,
                    "$inc": {"unread_count": 1}
                }
            )
        else:
            chat_data["unread_count"] = 1
            chat_data["created_at"] = datetime.now(timezone.utc)
            await self.db.chats.insert_one(chat_data)
        
        # Save message
        message_data = {
            "id": str(uuid.uuid4()),
            "chat_id": chat_id,
            "bot_id": bot_id,
            "user_id": user.id,
            "text": message.text or "",
            "file_id": message.document.file_id if message.document else (message.photo[-1].file_id if message.photo else None),
            "file_type": "document" if message.document else ("photo" if message.photo else None),
            "is_from_bot": False,
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        }
        await self.db.messages.insert_one(message_data)
        
        # Check for auto-replies
        if message.text:
            await self._check_auto_reply(bot_id, user.id, message.text)
    
    async def send_message(self, bot_id: str, user_id: int, text: str, file_id: Optional[str] = None) -> dict:
        """Send message to user"""
        if bot_id not in self.bots:
            raise Exception("Bot not found")
        
        bot = self.bots[bot_id]
        chat_id = f"{bot_id}_{user_id}"
        
        try:
            if file_id:
                sent_message = await bot.send_document(chat_id=user_id, document=file_id, caption=text or None)
            else:
                sent_message = await bot.send_message(chat_id=user_id, text=text)
            
            # Save message to database
            message_data = {
                "id": str(uuid.uuid4()),
                "chat_id": chat_id,
                "bot_id": bot_id,
                "user_id": user_id,
                "text": text,
                "file_id": file_id,
                "is_from_bot": True,
                "is_read": True,
                "created_at": datetime.now(timezone.utc)
            }
            await self.db.messages.insert_one(message_data)
            
            # Update chat last message
            await self.db.chats.update_one(
                {"id": chat_id},
                {
                    "$set": {
                        "last_message": text or "[File]",
                        "last_message_time": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            return message_data
        except TelegramError as e:
            logger.error(f"Failed to send message: {e}")
            raise Exception(f"Failed to send message: {str(e)}")
    
    async def send_file(self, bot_id: str, user_id: int, file_path: str, caption: str = "") -> dict:
        """Send file to user"""
        if bot_id not in self.bots:
            raise Exception("Bot not found")
        
        bot = self.bots[bot_id]
        chat_id = f"{bot_id}_{user_id}"
        
        try:
            with open(file_path, 'rb') as file:
                sent_message = await bot.send_document(chat_id=user_id, document=file, caption=caption or None)
            
            # Save message to database
            message_data = {
                "id": str(uuid.uuid4()),
                "chat_id": chat_id,
                "bot_id": bot_id,
                "user_id": user_id,
                "text": caption,
                "file_id": sent_message.document.file_id,
                "file_type": "document",
                "is_from_bot": True,
                "is_read": True,
                "created_at": datetime.now(timezone.utc)
            }
            await self.db.messages.insert_one(message_data)
            
            return message_data
        except Exception as e:
            logger.error(f"Failed to send file: {e}")
            raise Exception(f"Failed to send file: {str(e)}")
    
    async def broadcast_message(self, bot_id: str, user_ids: List[int], text: str, file_id: Optional[str] = None) -> dict:
        """Send message to multiple users"""
        success_count = 0
        failed_count = 0
        
        for user_id in user_ids:
            try:
                await self.send_message(bot_id, user_id, text, file_id)
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to send to user {user_id}: {e}")
                failed_count += 1
        
        return {
            "success_count": success_count,
            "failed_count": failed_count,
            "total": len(user_ids)
        }
    
    async def _send_welcome_message(self, bot_id: str, user_id: int):
        """Send welcome message and menu if configured for this bot"""
        try:
            # Get welcome message for this bot
            welcome_msg = await self.db.welcome_messages.find_one({
                "bot_id": bot_id,
                "is_active": True
            })
            
            if welcome_msg:
                # Send welcome message
                await self.send_message(bot_id, user_id, welcome_msg["text"])
                logger.info(f"Welcome message sent to user {user_id} for bot {bot_id}")
            
            # Send menu if assigned to this bot
            await self._send_bot_menu(bot_id, user_id)
        except Exception as e:
            logger.error(f"Failed to send welcome message: {e}")
    
    async def _check_auto_reply(self, bot_id: str, user_id: int, text: str):
        """Check if message triggers auto-reply"""
        # Get active auto-replies
        auto_replies = await self.db.auto_replies.find({"is_active": True}).to_list(100)
        
        # Normalize text
        text_lower = text.lower()
        words = text_lower.split()
        
        for auto_reply in auto_replies:
            keywords = [kw.lower() for kw in auto_reply.get("keywords", [])]
            
            # Check if any keyword matches
            for keyword in keywords:
                if keyword in words:
                    # Send auto-reply
                    try:
                        await self.send_message(bot_id, user_id, auto_reply["message"])
                        logger.info(f"Auto-reply sent to user {user_id} for keyword '{keyword}'")
                    except Exception as e:
                        logger.error(f"Failed to send auto-reply: {e}")
                    break  # Only one auto-reply per message

    async def _send_bot_menu(self, bot_id: str, user_id: int):
        """Send bot menu with inline keyboard buttons"""
        try:
            from telegram import InlineKeyboardButton, InlineKeyboardMarkup
            
            # Get menu assignment for this bot
            assignment = await self.db.bot_menu_assignments.find_one({"bot_id": bot_id})
            if not assignment:
                logger.info(f"No menu assigned to bot {bot_id}")
                return
            
            # Get menu
            menu = await self.db.bot_menus.find_one({"id": assignment["menu_id"]})
            if not menu:
                logger.error(f"Menu {assignment['menu_id']} not found")
                return
            
            # Get buttons
            button_ids = menu.get("button_ids", [])
            if not button_ids:
                logger.info(f"Menu {menu['name']} has no buttons")
                return
            
            # Fetch button details
            buttons_cursor = self.db.menu_buttons.find({"id": {"$in": button_ids}})
            buttons = await buttons_cursor.to_list(length=100)
            
            # Create inline keyboard
            keyboard = []
            for button in buttons:
                # Store button data for callback
                callback_data = f"btn_{button['id']}"
                keyboard.append([InlineKeyboardButton(button["name"], callback_data=callback_data)])
            
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            # Send menu
            bot = self.bots[bot_id]
            await bot.send_message(
                chat_id=user_id,
                text=f"📋 {menu['name']}",
                reply_markup=reply_markup
            )
            logger.info(f"Menu sent to user {user_id} for bot {bot_id}")
            
        except Exception as e:
            logger.error(f"Failed to send bot menu: {e}")
            import traceback
            traceback.print_exc()

    async def _handle_button_press(self, update: Update, bot_id: str):
        """Handle button press from inline keyboard"""
        query = update.callback_query
        if not query:
            return
        
        await query.answer()
        
        user_id = query.from_user.id
        callback_data = query.data
        
        # Parse button id from callback data
        if not callback_data.startswith("btn_"):
            return
        
        button_id = callback_data[4:]  # Remove "btn_" prefix
        
        try:
            # Get button details
            button = await self.db.menu_buttons.find_one({"id": button_id})
            if not button:
                logger.error(f"Button {button_id} not found")
                return
            
            chat_id = f"{bot_id}_{user_id}"
            
            # Execute button actions
            for action in button.get("actions", []):
                action_type = action.get("type")
                action_value = action.get("value")
                
                if action_type == "text" and action_value:
                    # Send text message
                    text = action_value.get("text", "")
                    await self.send_message(bot_id, user_id, text)
                
                elif action_type == "url" and action_value:
                    # Send URL as text (user can click it)
                    url = action_value.get("url", "")
                    await self.send_message(bot_id, user_id, f"🔗 {url}")
                
                elif action_type == "label" and action_value:
                    # Add label to chat
                    label_id = action_value.get("label_id")
                    if label_id:
                        await self.db.chats.update_one(
                            {"id": chat_id},
                            {"$addToSet": {"labels": label_id}}
                        )
                        logger.info(f"Label {label_id} added to chat {chat_id}")
                
                elif action_type == "block" and action_value:
                    # Send block text with nested buttons
                    text = action_value.get("text", "")
                    nested_button_ids = action_value.get("button_ids", [])
                    
                    if nested_button_ids:
                        from telegram import InlineKeyboardButton, InlineKeyboardMarkup
                        
                        # Fetch nested buttons
                        nested_buttons_cursor = self.db.menu_buttons.find({"id": {"$in": nested_button_ids}})
                        nested_buttons = await nested_buttons_cursor.to_list(length=100)
                        
                        # Create keyboard
                        keyboard = []
                        for nb in nested_buttons:
                            callback_data = f"btn_{nb['id']}"
                            keyboard.append([InlineKeyboardButton(nb["name"], callback_data=callback_data)])
                        
                        reply_markup = InlineKeyboardMarkup(keyboard)
                        
                        bot = self.bots[bot_id]
                        await bot.send_message(chat_id=user_id, text=text, reply_markup=reply_markup)
                    else:
                        await self.send_message(bot_id, user_id, text)
                
                elif action_type == "back":
                    # Send menu again (go back to main menu)
                    await self._send_bot_menu(bot_id, user_id)
            
            logger.info(f"Button {button['name']} executed for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to handle button press: {e}")
            import traceback
            traceback.print_exc()

            )
            logger.info(f"Menu sent to user {user_id} for bot {bot_id}")
            
        except Exception as e:
            logger.error(f"Failed to send bot menu: {e}")
            import traceback
            traceback.print_exc()

                        logger.info(f"Auto-reply sent to user {user_id} for keyword '{keyword}'")
                    except Exception as e:
                        logger.error(f"Failed to send auto-reply: {e}")
                    break  # Only one auto-reply per message

# Global instance
telegram_manager: Optional[TelegramBotManager] = None

def get_telegram_manager(db: AsyncIOMotorDatabase) -> TelegramBotManager:
    global telegram_manager
    if telegram_manager is None:
        telegram_manager = TelegramBotManager(db)
    return telegram_manager