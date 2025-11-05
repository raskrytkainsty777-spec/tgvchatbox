import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiSearch, FiCheckSquare, FiSquare, FiFilter, FiSend, FiStar } from 'react-icons/fi';
import './ChatList.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function ChatList({ 
  chats, 
  bots, 
  selectedBots, 
  selectedChat, 
  searchQuery, 
  onChatSelect, 
  onSearchChange,
  onToggleBotFilter,
  onChatsUpdate,
  onFilterChange 
}) {
  const [selectedChats, setSelectedChats] = useState([]);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [labels, setLabels] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]); // массив активных фильтров
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showSalePopup, setShowSalePopup] = useState(false);
  const [saleChat, setSaleChat] = useState(null);
  const [saleAmount, setSaleAmount] = useState('');

  useEffect(() => {
    loadLabels();
  }, []);

  const loadLabels = async () => {
    try {
      const response = await axios.get(`${API}/labels`);
      setLabels(response.data);
    } catch (error) {
      console.error('Failed to load labels:', error);
    }
  };

  // Count chats matching a specific filter
  const countChatsForFilter = (filterType, labelId = null) => {
    if (filterType === 'unread') {
      return chats.filter(chat => chat.unread_count > 0).length;
    } else if (filterType === 'label' && labelId) {
      return chats.filter(chat => 
        chat.label_ids && chat.label_ids.includes(labelId)
      ).length;
    }
    return 0;
  };

  const handleSelectChat = (chatId) => {
    setSelectedChats(prev => {
      if (prev.includes(chatId)) {
        return prev.filter(id => id !== chatId);
      } else {
        return [...prev, chatId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedChats.length === chats.length) {
      setSelectedChats([]);
    } else {
      setSelectedChats(chats.map(c => c.id));
    }
  };

  const handleSetLabel = async (labelId) => {
    if (selectedChats.length === 0) return;
    
    try {
      await axios.patch(`${API}/chats/labels`, {
        chat_ids: selectedChats,
        label_ids: [labelId]
      });
      setSelectedChats([]);
      setShowLabelMenu(false);
      onChatsUpdate();
    } catch (error) {
      alert('Не удалось установить метку');
    }
  };

  const handleRemoveLabel = async () => {
    if (selectedChats.length === 0) return;
    
    try {
      await axios.patch(`${API}/chats/labels`, {
        chat_ids: selectedChats,
        label_ids: []
      });
      setSelectedChats([]);
      setShowLabelMenu(false);
      onChatsUpdate();
    } catch (error) {
      alert('Не удалось снять метку');
    }
  };

  const applyFilter = (type, labelId = null, labelName = null) => {
    setShowFilterMenu(false);
    
    // Заменяем существующий фильтр такого же типа
    let updatedFilters = activeFilters.filter(f => {
      if (type === 'unread') return f.type !== 'unread';
      if (type === 'label') return f.type !== 'label' || f.labelId !== labelId;
      return true;
    });
    
    // Добавляем новый фильтр
    const newFilter = { type, labelId, labelName };
    updatedFilters.push(newFilter);
    
    setActiveFilters(updatedFilters);
    applyFiltersToParent(updatedFilters);
  };

  const removeFilter = (index) => {
    const updatedFilters = activeFilters.filter((_, i) => i !== index);
    setActiveFilters(updatedFilters);
    applyFiltersToParent(updatedFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    if (onFilterChange) {
      onFilterChange('all', null);
    }
  };

  const applyFiltersToParent = (filters) => {
    if (!onFilterChange) return;
    
    if (filters.length === 0) {
      console.log('ChatList: Clearing filters'); // Отладка
      onFilterChange('all', null);
      return;
    }
    
    // Применяем ПОСЛЕДНИЙ добавленный фильтр
    // Backend не поддерживает комбинирование unread + label
    const lastFilter = filters[filters.length - 1];
    console.log('ChatList: Applying filter', lastFilter); // Отладка
    onFilterChange(lastFilter.type, lastFilter.labelId);
  };

  const getChatLabels = (chat) => {
    if (!chat.label_ids || chat.label_ids.length === 0) return [];
    return labels.filter(l => chat.label_ids.includes(l.id));
  };

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

  const handleStarClick = (chat, e) => {
    e.stopPropagation();
    setSaleChat(chat);
    setSaleAmount(chat.sale_amount || '');
    setShowSalePopup(true);
  };

  const handleSaveSale = async () => {
    if (!saleAmount || parseFloat(saleAmount) <= 0) {
      alert('Введите корректную сумму');
      return;
    }

    try {
      await axios.post(`${API}/chats/${saleChat.id}/sale`, {
        chat_id: saleChat.id,
        amount: parseFloat(saleAmount)
      });
      
      setShowSalePopup(false);
      setSaleChat(null);
      setSaleAmount('');
      onChatsUpdate(); // Refresh chats to show updated data
      loadLabels(); // Refresh labels to show "Покупатели" if new
    } catch (error) {
      alert('Не удалось сохранить продажу');
      console.error('Sale error:', error);
    }
  };

  return (
    <div className="chat-list">
      {/* Search Bar */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            data-testid="search-input"
          />
        </div>
        <button
          className={`filter-btn ${activeFilters.length > 0 ? 'active' : ''}`}
          onClick={() => setShowFilterMenu(!showFilterMenu)}
          data-testid="filter-button"
        >
          <FiFilter />
          {activeFilters.length > 0 && (
            <span className="filter-count">{activeFilters.length}</span>
          )}
        </button>
        
        {showFilterMenu && (
          <div className="filter-menu">
            <div className="filter-option" onClick={clearAllFilters}>
              <span>Все</span>
              <span className="filter-count">{chats.length}</span>
            </div>
            <div className="filter-option" onClick={() => applyFilter('unread')}>
              <span>Непрочитанные</span>
              <span className="filter-count">{countChatsForFilter('unread')}</span>
            </div>
            <div className="filter-divider">По меткам:</div>
            {labels.length === 0 ? (
              <div className="filter-option" style={{ color: '#8d969e', cursor: 'default' }}>
                Нет меток
              </div>
            ) : (
              labels.map(label => (
                <div
                  key={label.id}
                  className="filter-option"
                  onClick={() => applyFilter('label', label.id, label.name)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span className="label-dot" style={{ backgroundColor: label.color }}></span>
                    <span>{label.name}</span>
                  </div>
                  <span className="filter-count">{countChatsForFilter('label', label.id)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="active-filters-bar">
          {activeFilters.map((filter, index) => (
            <div key={index} className="filter-chip">
              {filter.type === 'unread' && 'Непрочитанные'}
              {filter.type === 'label' && filter.labelName}
              <button
                className="filter-chip-remove"
                onClick={() => removeFilter(index)}
              >
                ×
              </button>
            </div>
          ))}
          <button className="clear-filters-btn" onClick={clearAllFilters}>
            Очистить все
          </button>
        </div>
      )}

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

      {/* Selection Actions */}
      {selectedChats.length > 0 && (
        <div className="selection-bar">
          <div className="selection-info">
            Выбрано: {selectedChats.length}
          </div>
          <div className="selection-actions">
            <button
              className="action-btn"
              onClick={() => setShowLabelMenu(!showLabelMenu)}
            >
              Установить метку
            </button>
            <button
              className="action-btn"
              onClick={() => setShowBroadcastModal(true)}
            >
              <FiSend /> Отправить
            </button>
          </div>
          
          {showLabelMenu && (
            <div className="label-menu">
              {labels.map(label => (
                <div
                  key={label.id}
                  className="label-option"
                  onClick={() => handleSetLabel(label.id)}
                >
                  <span className="label-color" style={{ backgroundColor: label.color }}></span>
                  {label.name}
                </div>
              ))}
              <div className="label-divider"></div>
              <div className="label-option" onClick={handleRemoveLabel}>
                Снять метку
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chats List */}
      <div className="chats-container">
        {chats.length > 0 && (
          <div className="select-all-bar">
            <button
              className="select-all-btn"
              onClick={handleSelectAll}
              data-testid="select-all-button"
            >
              {selectedChats.length === chats.length ? (
                <FiCheckSquare className="checkbox checked" />
              ) : (
                <FiSquare className="checkbox" />
              )}
              <span>Выбрать все</span>
            </button>
          </div>
        )}

        {chats.length === 0 ? (
          <div className="empty-chats">
            <p>
              {selectedBots.length === 0 
                ? 'Выберите хотя бы одного бота' 
                : 'Нет чатов'}
            </p>
          </div>
        ) : (
          chats.map(chat => {
            const chatLabels = getChatLabels(chat);
            return (
              <div
                key={chat.id}
                className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                data-testid={`chat-item-${chat.id}`}
              >
                <div
                  className="chat-checkbox"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectChat(chat.id);
                  }}
                >
                  {selectedChats.includes(chat.id) ? (
                    <FiCheckSquare className="checkbox checked" />
                  ) : (
                    <FiSquare className="checkbox" />
                  )}
                </div>
                <div 
                  className="chat-star-container"
                  onClick={(e) => handleStarClick(chat, e)}
                >
                  <FiStar 
                    className={`chat-star ${chat.sale_amount ? 'filled' : ''}`}
                    fill={chat.sale_amount ? '#FFD700' : 'none'}
                  />
                  {chat.sale_amount && (
                    <div className="sale-amount">{chat.sale_amount}</div>
                  )}
                </div>
                <div
                  className="chat-item-content"
                  onClick={() => onChatSelect(chat)}
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
                    {chatLabels.length > 0 && (
                      <div className="chat-labels">
                        {chatLabels.map(label => (
                          <span
                            key={label.id}
                            className="chat-label"
                            style={{ backgroundColor: label.color }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <BroadcastToSelectedModal
          selectedChats={selectedChats.map(id => chats.find(c => c.id === id)).filter(Boolean)}
          bots={bots}
          onClose={() => setShowBroadcastModal(false)}
          onSent={() => {
            setShowBroadcastModal(false);
            setSelectedChats([]);
          }}
        />
      )}

      {/* Sale Popup */}
      {showSalePopup && (
        <div className="modal-overlay" onClick={() => setShowSalePopup(false)}>
          <div className="sale-popup" onClick={(e) => e.stopPropagation()}>
            <h3>Сумма продажи</h3>
            <p className="sale-chat-name">
              {saleChat?.first_name || saleChat?.username || 'User'}
            </p>
            <input
              type="number"
              placeholder="Введите сумму"
              value={saleAmount}
              onChange={(e) => setSaleAmount(e.target.value)}
              className="sale-input"
              autoFocus
            />
            <div className="sale-actions">
              <button onClick={() => setShowSalePopup(false)} className="cancel-btn">
                Отмена
              </button>
              <button onClick={handleSaveSale} className="save-btn">
                ОК
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Broadcast Modal for selected chats
function BroadcastToSelectedModal({ selectedChats, bots, onClose, onSent }) {
  const [message, setMessage] = useState('');
  const [selectedBotId, setSelectedBotId] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, total: 0, percent: 0 });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (bots.length > 0) {
      setSelectedBotId(bots[0].id);
    }
  }, [bots]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedBotId) return;

    setSending(true);
    setIsSending(true);
    const total = selectedChats.length;
    let sent = 0;

    for (const chat of selectedChats) {
      try {
        await axios.post(`${API}/messages`, {
          bot_id: selectedBotId,
          user_id: chat.user_id,
          text: message
        });
        sent++;
      } catch (error) {
        console.error(`Failed to send to ${chat.user_id}:`, error);
      }
      setProgress({ sent, total, percent: Math.round((sent / total) * 100) });
    }

    setSending(false);
    setTimeout(() => {
      onSent();
    }, 1000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Массовая отправка ({selectedChats.length} чатов)</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSend}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#8d969e' }}>
              Выберите бота:
            </label>
            <select
              value={selectedBotId}
              onChange={(e) => setSelectedBotId(e.target.value)}
              disabled={sending}
              style={{
                width: '100%',
                padding: '10px',
                background: '#0e1621',
                border: '1px solid #242f3d',
                borderRadius: '8px',
                color: '#fff'
              }}
            >
              {bots.map(bot => (
                <option key={bot.id} value={bot.id}>
                  @{bot.username}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#8d969e' }}>
              Сообщение:
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Введите сообщение..."
              rows="5"
              disabled={sending}
            />
          </div>

          {isSending && (
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '13px', color: '#8d969e', marginBottom: '8px' }}>
                Отправлено: {progress.sent} / {progress.total} ({progress.percent}%)
              </div>
              <div style={{ background: '#0e1621', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                <div
                  style={{
                    background: '#5288c1',
                    height: '100%',
                    width: `${progress.percent}%`,
                    transition: 'width 0.3s'
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary" disabled={sending || !message.trim()}>
              {sending ? 'Отправка...' : 'Отправить'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={sending}>
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChatList;
