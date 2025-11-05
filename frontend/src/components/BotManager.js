import React, { useState } from 'react';
import axios from 'axios';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import './BotManager.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function BotManager({ bots, onClose, onBotAdded, onBotDeleted, embedded = false }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddBot = async (e) => {
    e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    setError('');

    try {
      await axios.post(`${API}/bots`, { token });
      setToken('');
      onBotAdded();
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось добавить бота');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBot = async (botId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого бота?')) return;

    try {
      await axios.delete(`${API}/bots/${botId}`);
      onBotDeleted();
    } catch (err) {
      alert('Не удалось удалить бота');
    }
  };

  const content = (
    <div>
        <div className="modal-header">
          <h2 className="modal-title">Управление ботами</h2>
          <button className="modal-close" onClick={onClose} data-testid="close-bot-manager">
            <FiX />
          </button>
        </div>

        <div className="modal-content">
          {/* Add Bot Form */}
          <form onSubmit={handleAddBot} className="add-bot-form">
            <h3>Добавить нового бота</h3>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Вставьте токен бота (от @BotFather)"
              disabled={loading}
              data-testid="bot-token-input"
            />
            {error && <div className="error-message">{error}</div>}
            <button 
              type="submit" 
              className="btn-primary btn-block"
              disabled={loading || !token.trim()}
              data-testid="add-bot-button"
            >
              <FiPlus /> {loading ? 'Добавление...' : 'Добавить бота'}
            </button>
          </form>

          {/* Bots List */}
          <div className="bots-list">
            <h3>Мои боты ({bots.length})</h3>
            {bots.length === 0 ? (
              <div className="empty-state">Нет добавленных ботов</div>
            ) : (
              <div className="bots-grid">
                {bots.map(bot => (
                  <div key={bot.id} className="bot-card" data-testid={`bot-card-${bot.id}`}>
                    <div className="bot-info">
                      <div className="bot-name">@{bot.username}</div>
                      <div className="bot-meta">{bot.first_name}</div>
                      <div className={`bot-status ${bot.is_active ? 'active' : 'inactive'}`}>
                        {bot.is_active ? '🟢 Активен' : '🔴 Неактивен'}
                      </div>
                    </div>
                    <button 
                      className="btn-icon-small btn-delete"
                      onClick={() => handleDeleteBot(bot.id)}
                      data-testid={`delete-bot-${bot.id}`}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BotManager;
