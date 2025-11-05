import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiX, FiPlus, FiTrash2, FiTag, FiZap, FiMessageCircle } from 'react-icons/fi';
import BotManager from './BotManager';
import './SettingsModal.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function SettingsModal({ bots, onClose, onBotUpdated }) {
  const [activeTab, setActiveTab] = useState('bots');
  const [labels, setLabels] = useState([]);
  const [quickReplies, setQuickReplies] = useState([]);
  const [autoReplies, setAutoReplies] = useState([]);

  useEffect(() => {
    loadLabels();
    loadQuickReplies();
    loadAutoReplies();
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

export default SettingsModal;
