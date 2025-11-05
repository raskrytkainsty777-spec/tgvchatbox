import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiX, FiPlus, FiTrash2, FiTag, FiZap, FiMessageCircle, FiMenu, FiEdit, FiCheck } from 'react-icons/fi';
import BotManager from './BotManager';
import MenuTab from './MenuTab';
import './SettingsModal.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function SettingsModal({ bots, onClose, onBotUpdated }) {
  const [activeTab, setActiveTab] = useState('bots');
  const [labels, setLabels] = useState([]);
  const [quickReplies, setQuickReplies] = useState([]);
  const [autoReplies, setAutoReplies] = useState([]);
  const [welcomeMessages, setWelcomeMessages] = useState([]);
  const [showMenuManager, setShowMenuManager] = useState(false);

  useEffect(() => {
    loadLabels();
    loadQuickReplies();
    loadAutoReplies();
    loadWelcomeMessages();
  }, []);

  const loadLabels = async () => {
    try {
      const response = await axios.get(`${API}/labels`);
      setLabels(response.data);
    } catch (error) {
      console.error('Failed to load labels:', error);
    }
  };

  const loadQuickReplies = async () => {
    try {
      const response = await axios.get(`${API}/quick-replies`);
      setQuickReplies(response.data);
    } catch (error) {
      console.error('Failed to load quick replies:', error);
    }
  };

  const loadAutoReplies = async () => {
    try {
      const response = await axios.get(`${API}/auto-replies`);
      setAutoReplies(response.data);
    } catch (error) {
      console.error('Failed to load auto replies:', error);
    }
  };

  const loadWelcomeMessages = async () => {
    try {
      const response = await axios.get(`${API}/welcome-messages`);
      setWelcomeMessages(response.data);
    } catch (error) {
      console.error('Failed to load welcome messages:', error);
    }
  };

  return (
    <div className="modal-overlay" data-testid="settings-modal">
      <div className="modal settings-modal">
        <div className="modal-header">
          <h2 className="modal-title">Настройки</h2>
          <button className="modal-close" onClick={onClose} data-testid="close-settings">
            <FiX />
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={`tab ${activeTab === 'bots' ? 'active' : ''}`}
            onClick={() => setActiveTab('bots')}
          >
            Боты
          </button>
          <button
            className={`tab ${activeTab === 'labels' ? 'active' : ''}`}
            onClick={() => setActiveTab('labels')}
          >
            <FiTag /> Метки
          </button>
          <button
            className={`tab ${activeTab === 'quick' ? 'active' : ''}`}
            onClick={() => setActiveTab('quick')}
          >
            <FiZap /> Быстрые ответы
          </button>
          <button
            className={`tab ${activeTab === 'auto' ? 'active' : ''}`}
            onClick={() => setActiveTab('auto')}
          >
            <FiMessageCircle /> Автоответы
          </button>
          <button
            className={`tab ${activeTab === 'welcome' ? 'active' : ''}`}
            onClick={() => setActiveTab('welcome')}
          >
            <FiMessageCircle /> Приветствие
          </button>
          <button
            className={`tab ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            <FiMenu /> Меню
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'bots' && (
            <BotsTab bots={bots} onBotUpdated={onBotUpdated} />
          )}
          {activeTab === 'labels' && (
            <LabelsTab labels={labels} onUpdate={loadLabels} />
          )}
          {activeTab === 'quick' && (
            <QuickRepliesTab replies={quickReplies} onUpdate={loadQuickReplies} />
          )}
          {activeTab === 'auto' && (
            <AutoRepliesTab replies={autoReplies} onUpdate={loadAutoReplies} />
          )}
          {activeTab === 'welcome' && (
            <WelcomeMessagesTab 
              messages={welcomeMessages} 
              bots={bots}
              onUpdate={loadWelcomeMessages} 
            />
          )}
          {activeTab === 'menu' && (
            <MenuTab bots={bots} />
          )}
        </div>
      </div>
    </div>
  );
}

function BotsTab({ bots, onBotUpdated }) {
  return (
    <div className="tab-content">
      <BotManager
        bots={bots}
        onClose={() => {}}
        onBotAdded={onBotUpdated}
        onBotDeleted={onBotUpdated}
        embedded={true}
      />
    </div>
  );
}

function LabelsTab({ labels, onUpdate }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#5288c1');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await axios.post(`${API}/labels`, { name, color });
      setName('');
      setColor('#5288c1');
      onUpdate();
    } catch (error) {
      alert('Не удалось создать метку');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить метку?')) return;
    try {
      await axios.delete(`${API}/labels/${id}`);
      onUpdate();
    } catch (error) {
      alert('Не удалось удалить метку');
    }
  };

  return (
    <div className="tab-content">
      <form onSubmit={handleCreate} className="create-form">
        <h3>Создать метку</h3>
        <div className="form-row">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название метки"
            disabled={loading}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={loading}
            className="color-picker"
          />
          <button type="submit" className="btn-primary" disabled={loading || !name.trim()}>
            <FiPlus /> Создать
          </button>
        </div>
      </form>

      <div className="items-list">
        <h3>Мои метки ({labels.length})</h3>
        {labels.length === 0 ? (
          <div className="empty-state">Нет меток</div>
        ) : (
          <div className="items-grid">
            {labels.map(label => (
              <div key={label.id} className="item-card">
                <div className="label-preview" style={{ backgroundColor: label.color }}>
                  {label.name}
                </div>
                <button
                  className="btn-icon-small btn-delete"
                  onClick={() => handleDelete(label.id)}
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickRepliesTab({ replies, onUpdate }) {
  const [shortcut, setShortcut] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!shortcut.trim() || !text.trim()) return;

    setLoading(true);
    try {
      await axios.post(`${API}/quick-replies`, { shortcut, text });
      setShortcut('');
      setText('');
      onUpdate();
    } catch (error) {
      alert('Не удалось создать быстрый ответ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить быстрый ответ?')) return;
    try {
      await axios.delete(`${API}/quick-replies/${id}`);
      onUpdate();
    } catch (error) {
      alert('Не удалось удалить');
    }
  };

  return (
    <div className="tab-content">
      <form onSubmit={handleCreate} className="create-form">
        <h3>Создать быстрый ответ</h3>
        <input
          type="text"
          value={shortcut}
          onChange={(e) => setShortcut(e.target.value)}
          placeholder="Ключевое слово (например: привет)"
          disabled={loading}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Текст ответа"
          rows="3"
          disabled={loading}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          <FiPlus /> Создать
        </button>
        <p className="hint">Используйте: /{shortcut} в чате для вставки</p>
      </form>

      <div className="items-list">
        <h3>Быстрые ответы ({replies.length})</h3>
        {replies.length === 0 ? (
          <div className="empty-state">Нет быстрых ответов</div>
        ) : (
          <div className="items-grid">
            {replies.map(reply => (
              <div key={reply.id} className="item-card reply-card">
                <div className="reply-info">
                  <div className="reply-shortcut">/{reply.shortcut}</div>
                  <div className="reply-text">{reply.text}</div>
                </div>
                <button
                  className="btn-icon-small btn-delete"
                  onClick={() => handleDelete(reply.id)}
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AutoRepliesTab({ replies, onUpdate }) {
  const [keywords, setKeywords] = useState('');
  const [message, setMessage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!keywords.trim() || !message.trim()) return;

    setLoading(true);
    try {
      const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);
      await axios.post(`${API}/auto-replies`, {
        keywords: keywordList,
        message,
        is_active: isActive
      });
      setKeywords('');
      setMessage('');
      onUpdate();
    } catch (error) {
      alert('Не удалось создать автоответ');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      const reply = replies.find(r => r.id === id);
      await axios.patch(`${API}/auto-replies/${id}`, {
        keywords: reply.keywords,
        message: reply.message,
        is_active: !currentStatus
      });
      onUpdate();
    } catch (error) {
      alert('Не удалось изменить статус');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить автоответ?')) return;
    try {
      await axios.delete(`${API}/auto-replies/${id}`);
      onUpdate();
    } catch (error) {
      alert('Не удалось удалить');
    }
  };

  return (
    <div className="tab-content">
      <form onSubmit={handleCreate} className="create-form">
        <h3>Создать автоответ</h3>
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="Ключевые слова через запятую (цена, стоимость, сколько)"
          disabled={loading}
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Сообщение для автоответа"
          rows="3"
          disabled={loading}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Включить автоответ
        </label>
        <button type="submit" className="btn-primary" disabled={loading}>
          <FiPlus /> Создать
        </button>
      </form>

      <div className="items-list">
        <h3>Автоответы ({replies.length})</h3>
        {replies.length === 0 ? (
          <div className="empty-state">Нет автоответов</div>
        ) : (
          <div className="items-grid">
            {replies.map(reply => (
              <div key={reply.id} className="item-card auto-reply-card">
                <div className="auto-reply-info">
                  <div className="auto-reply-keywords">
                    {reply.keywords.join(', ')}
                  </div>
                  <div className="auto-reply-message">{reply.message}</div>
                  <div className="auto-reply-actions">
                    <button
                      className={`btn-toggle ${reply.is_active ? 'active' : ''}`}
                      onClick={() => handleToggle(reply.id, reply.is_active)}
                    >
                      {reply.is_active ? '🟢 Включено' : '🔴 Выключено'}
                    </button>
                  </div>
                </div>
                <button
                  className="btn-icon-small btn-delete"
                  onClick={() => handleDelete(reply.id)}
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WelcomeMessagesTab({ messages, bots, onUpdate }) {
  const [selectedBots, setSelectedBots] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  const handleToggleBot = (botId) => {
    setSelectedBots(prev => {
      if (prev.includes(botId)) {
        return prev.filter(id => id !== botId);
      } else {
        return [...prev, botId];
      }
    });
  };

  const handleSelectAllBots = () => {
    if (selectedBots.length === bots.length) {
      setSelectedBots([]);
    } else {
      setSelectedBots(bots.map(b => b.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || selectedBots.length === 0) {
      alert('Выберите ботов и введите текст сообщения');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/welcome-messages`, {
        bot_ids: selectedBots,
        text: text,
        is_active: true
      });
      setText('');
      setSelectedBots([]);
      setEditingGroup(null);
      onUpdate();
    } catch (error) {
      alert(editingGroup ? 'Не удалось обновить приветственное сообщение' : 'Не удалось создать приветственное сообщение');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить приветственное сообщение?')) return;
    try {
      await axios.delete(`${API}/welcome-messages/${id}`);
      onUpdate();
    } catch (error) {
      alert('Не удалось удалить');
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setText(group.text);
    setSelectedBots(group.bot_ids);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!text.trim() || selectedBots.length === 0) {
      alert('Выберите ботов и введите текст сообщения');
      return;
    }

    setLoading(true);
    try {
      // Update all messages in the group
      await axios.post(`${API}/welcome-messages`, {
        bot_ids: selectedBots,
        text: text,
        is_active: true
      });
      setText('');
      setSelectedBots([]);
      setEditingGroup(null);
      onUpdate();
    } catch (error) {
      alert('Не удалось обновить приветственное сообщение');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingGroup(null);
    setText('');
    setSelectedBots([]);
  };

  // Группируем сообщения по тексту
  const groupedMessages = messages.reduce((acc, msg) => {
    const existing = acc.find(g => g.text === msg.text);
    if (existing) {
      existing.bot_ids.push(msg.bot_id);
      existing.ids.push(msg.id);
    } else {
      acc.push({
        text: msg.text,
        bot_ids: [msg.bot_id],
        ids: [msg.id],
        is_active: msg.is_active
      });
    }
    return acc;
  }, []);

  const getBotUsername = (botId) => {
    const bot = bots.find(b => b.id === botId);
    return bot ? bot.username : 'Unknown';
  };

  return (
    <div className="tab-content">
      <form onSubmit={handleSubmit} className="create-form">
        <h3>{editingGroup ? 'Редактировать приветственное сообщение' : 'Создать приветственное сообщение'}</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#8d969e' }}>
            Выберите ботов:
          </label>
          <button
            type="button"
            className="select-all-btn"
            onClick={handleSelectAllBots}
            disabled={loading}
            style={{ marginBottom: '10px' }}
          >
            {selectedBots.length === bots.length ? '☑' : '☐'} Выбрать все
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bots.map(bot => (
              <label key={bot.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedBots.includes(bot.id)}
                  onChange={() => handleToggleBot(bot.id)}
                  disabled={loading}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ color: '#fff' }}>@{bot.username}</span>
              </label>
            ))}
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Привет! 👋 Я бот-помощник. Чем могу помочь?"
          rows="4"
          disabled={loading}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className="btn-primary" disabled={loading || !text.trim() || selectedBots.length === 0}>
            {editingGroup ? <FiCheck /> : <FiPlus />} {loading ? (editingGroup ? 'Сохранение...' : 'Создание...') : (editingGroup ? 'Сохранить' : 'Добавить')}
          </button>
          {editingGroup && (
            <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
              Отмена
            </button>
          )}
        </div>
        <p className="hint">Это сообщение будет отправляться пользователю при команде /start</p>
      </form>

      <div className="items-list">
        <h3>Приветственные сообщения ({groupedMessages.length})</h3>
        {groupedMessages.length === 0 ? (
          <div className="empty-state">Нет приветственных сообщений</div>
        ) : (
          <div className="items-grid">
            {groupedMessages.map((group, index) => (
              <div key={index} className="item-card welcome-card">
                <div className="welcome-info">
                  <div className="welcome-bots">
                    {group.bot_ids.map(botId => (
                      <span key={botId} className="bot-badge">
                        @{getBotUsername(botId)}
                      </span>
                    ))}
                  </div>
                  <div className="welcome-text">{group.text}</div>
                  <div className="welcome-status">
                    {group.is_active ? '🟢 Активно' : '🔴 Неактивно'}
                  </div>
                </div>
                <div className="card-actions">
                  <button
                    className="btn-icon-small btn-edit"
                    onClick={() => handleEdit(group)}
                    title="Редактировать"
                  >
                    <FiEdit />
                  </button>
                  <button
                    className="btn-icon-small btn-delete"
                    onClick={() => {
                      // Удаляем все сообщения этой группы
                      group.ids.forEach(id => handleDelete(id));
                    }}
                    title="Удалить"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsModal;
