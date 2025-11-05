import React from 'react';
import { FiSearch, FiCheckSquare, FiSquare } from 'react-icons/fi';
import './ChatList.css';

function ChatList({ 
  chats, 
  bots, 
  selectedBots, 
  selectedChat, 
  searchQuery, 
  onChatSelect, 
  onSearchChange,
  onToggleBotFilter 
}) {
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    
    if (hours < 1) {
      const minutes = Math.floor(diff / 60000);
      return minutes < 1 ? 'сейчас' : `${minutes}м`;
    } else if (hours < 24) {
      return `${hours}ч`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}д`;
    }
  };

  return (
    <div className="chat-list">
      {/* Search Bar */}
      <div className="search-bar">
        <FiSearch className="search-icon" />
        <input
          type="text"
          placeholder="Поиск..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          data-testid="search-input"
        />
      </div>

      {/* Bot Filters */}
      {bots.length > 0 && (
        <div className="bot-filters">
          <div className="filter-title">Фильтр по ботам:</div>
          <div className="filter-list">
            {bots.map(bot => (
              <div 
                key={bot.id} 
                className="filter-item"
                onClick={() => onToggleBotFilter(bot.id)}
                data-testid={`bot-filter-${bot.id}`}
              >
                {selectedBots.includes(bot.id) ? (
                  <FiCheckSquare className="checkbox checked" />
                ) : (
                  <FiSquare className="checkbox" />
                )}
                <span className="filter-name">@{bot.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chats List */}
      <div className="chats-container">
        {chats.length === 0 ? (
          <div className="empty-chats">
            <p>Нет чатов</p>
          </div>
        ) : (
          chats.map(chat => (
            <div
              key={chat.id}
              className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
              onClick={() => onChatSelect(chat)}
              data-testid={`chat-item-${chat.id}`}
            >
              <div className="chat-avatar">
                {(chat.first_name || chat.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="chat-content">
                <div className="chat-header">
                  <div className="chat-name">
                    {chat.first_name || chat.username || 'User'}
                    {chat.last_name && ` ${chat.last_name}`}
                  </div>
                  <div className="chat-time">
                    {formatTime(chat.last_message_time)}
                  </div>
                </div>
                <div className="chat-preview">
                  <div className="preview-text">{chat.last_message}</div>
                  {chat.unread_count > 0 && (
                    <div className="unread-badge" data-testid={`unread-${chat.id}`}>
                      {chat.unread_count}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ChatList;
