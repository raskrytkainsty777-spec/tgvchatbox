import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import { FiSend, FiPaperclip, FiSmile } from 'react-icons/fi';
import './ChatView.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function ChatView({ chat, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quickReplies, setQuickReplies] = useState([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (chat) {
      loadMessages();
      markAsRead();
    }
    loadQuickReplies();
  }, [chat?.id]);

  const loadQuickReplies = async () => {
    try {
      const response = await axios.get(`${API}/quick-replies`);
      setQuickReplies(response.data);
    } catch (error) {
      console.error('Failed to load quick replies:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!chat) return;
    
    const interval = setInterval(() => {
      loadMessages();
    }, 2000); // Обновление сообщений каждые 2 секунды
    
    return () => clearInterval(interval);
  }, [chat?.id]);

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API}/messages/${chat.id}`);
      setMessages(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await axios.patch(`${API}/messages/read`, { chat_id: chat.id });
      onMessageSent();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    setSending(true);
    try {
      await axios.post(`${API}/messages`, {
        bot_id: chat.bot_id,
        user_id: chat.user_id,
        text: messageText
      });
      setMessageText('');
      setShowEmojiPicker(false);
      await loadMessages();
      onMessageSent();
    } catch (error) {
      alert('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bot_id', chat.bot_id);
      formData.append('user_id', chat.user_id);
      formData.append('caption', messageText || '');

      await axios.post(`${API}/messages/file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setMessageText('');
      await loadMessages();
      onMessageSent();
    } catch (error) {
      alert('Не удалось отправить файл');
    } finally {
      setSending(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessageText(prev => prev + emojiData.emoji);
  };

  const handleMessageTextChange = (e) => {
    const text = e.target.value;
    setMessageText(text);
    
    // Check for quick reply trigger - показать ВСЕ при /
    if (text.startsWith('/')) {
      setShowQuickReplies(quickReplies.length > 0);
    } else {
      setShowQuickReplies(false);
    }
  };

  const handleSelectQuickReply = (reply) => {
    setMessageText(reply.text);
    setShowQuickReplies(false);
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  if (!chat) return null;

  return (
    <div className="chat-view" data-testid="chat-view">
      {/* Chat Header */}
      <div className="chat-header-bar">
        <div className="chat-header-info">
          <div className="chat-header-avatar">
            {(chat.first_name || chat.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="chat-header-name">
              {chat.first_name || chat.username || 'User'}
              {chat.last_name && ` ${chat.last_name}`}
            </div>
            <div className="chat-header-username">@{chat.username || 'unknown'}</div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="messages-container">
        {loading ? (
          <div className="loading-messages">Загрузка...</div>
        ) : messages.length === 0 ? (
          <div className="no-messages">Нет сообщений</div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.is_from_bot ? 'outgoing' : 'incoming'}`}
                data-testid={`message-${message.id}`}
              >
                <div className="message-bubble">
                  {message.text && <div className="message-text">{message.text}</div>}
                  {message.file_id && (
                    <div className="message-file">
                      📄 {message.file_type === 'photo' ? 'Фото' : 'Файл'}
                    </div>
                  )}
                  <div className="message-time">{formatMessageTime(message.created_at)}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="message-input-container">
        {showEmojiPicker && (
          <div className="emoji-picker-wrapper">
            <EmojiPicker 
              onEmojiClick={handleEmojiClick}
              theme="dark"
              width="100%"
              height="350px"
            />
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="message-input-form">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            data-testid="file-input"
          />
          
          <button
            type="button"
            className="input-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            data-testid="attach-file-button"
          >
            <FiPaperclip size={20} />
          </button>

          <input
            type="text"
            value={messageText}
            onChange={handleMessageTextChange}
            placeholder="Напишите сообщение... (/ для быстрых ответов)"
            disabled={sending}
            className="message-input"
            data-testid="message-input"
          />

          {showQuickReplies && (
            <div className="quick-replies-menu">
              {quickReplies.map(reply => (
                <div
                  key={reply.id}
                  className="quick-reply-option"
                  onClick={() => handleSelectQuickReply(reply)}
                >
                  <div className="qr-shortcut">/{reply.shortcut}</div>
                  <div className="qr-text">{reply.text.substring(0, 50)}{reply.text.length > 50 ? '...' : ''}</div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className="input-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={sending}
            data-testid="emoji-button"
          >
            <FiSmile size={20} />
          </button>

          <button
            type="submit"
            className="send-btn"
            disabled={!messageText.trim() || sending}
            data-testid="send-button"
          >
            <FiSend size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatView;
