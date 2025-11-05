import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiX, FiCheckSquare, FiSquare } from 'react-icons/fi';
import './BroadcastModal.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function BroadcastModal({ bots, onClose, onSuccess }) {
  const [selectedBots, setSelectedBots] = useState([]);
  const [recipientType, setRecipientType] = useState('all'); // all, label
  const [selectedLabelIds, setSelectedLabelIds] = useState([]);
  const [excludeLabelIds, setExcludeLabelIds] = useState([]);
  const [message, setMessage] = useState('');
  const [labels, setLabels] = useState([]);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, total: 0, percent: 0, statuses: [] });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadLabels();
    // По умолчанию выбрать все активные боты
    setSelectedBots(bots.filter(b => b.is_active).map(b => b.id));
  }, [bots]);

  const loadLabels = async () => {
    try {
      const response = await axios.get(`${API}/labels`);
      setLabels(response.data);
    } catch (error) {
      console.error('Failed to load labels:', error);
    }
  };

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

  const handleToggleIncludeLabel = (labelId) => {
    setSelectedLabelIds(prev => {
      if (prev.includes(labelId)) {
        return prev.filter(id => id !== labelId);
      } else {
        return [...prev, labelId];
      }
    });
  };

  const handleToggleExcludeLabel = (labelId) => {
    setExcludeLabelIds(prev => {
      if (prev.includes(labelId)) {
        return prev.filter(id => id !== labelId);
      } else {
        return [...prev, labelId];
      }
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || selectedBots.length === 0) {
      alert('Заполните все поля');
      return;
    }

    setSending(true);
    setIsSending(true);

    try {
      // Получить список всех чатов для выбранных ботов
      let allChats = [];
      
      for (const botId of selectedBots) {
        const params = { bot_ids: botId };
        const response = await axios.get(`${API}/chats`, { params });
        allChats = [...allChats, ...response.data];
      }

      // Удалить дубликаты
      const uniqueChats = allChats.filter((chat, index, self) =>
        index === self.findIndex(c => c.id === chat.id)
      );

      // Фильтрация по меткам
      let filteredChats = uniqueChats;

      // Включить только чаты с выбранными метками
      if (selectedLabelIds.length > 0) {
        filteredChats = filteredChats.filter(chat => {
          const chatLabels = chat.label_ids || [];
          return selectedLabelIds.some(labelId => chatLabels.includes(labelId));
        });
      }

      // Исключить чаты с выбранными метками
      if (excludeLabelIds.length > 0) {
        filteredChats = filteredChats.filter(chat => {
          const chatLabels = chat.label_ids || [];
          return !excludeLabelIds.some(labelId => chatLabels.includes(labelId));
        });
      }

      const uniqueFilteredChats = filteredChats;

      const total = uniqueChats.length;
      let sent = 0;
      const statuses = [];

      // Отправка по одному
      for (const chat of uniqueChats) {
        try {
          await axios.post(`${API}/messages`, {
            bot_id: chat.bot_id,
            user_id: chat.user_id,
            text: message
          });
          sent++;
          statuses.push({ chat: chat.first_name || chat.username, success: true });
        } catch (error) {
          statuses.push({ chat: chat.first_name || chat.username, success: false, error: error.message });
        }
        setProgress({ sent, total, percent: Math.round((sent / total) * 100), statuses });
      }

      setSending(false);
      alert(`Рассылка завершена! Отправлено: ${sent} / ${total}`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (error) {
      alert('Ошибка при рассылке: ' + error.message);
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" data-testid="broadcast-modal">
      <div className="modal broadcast-modal">
        <div className="modal-header">
          <h2 className="modal-title">Массовая отправка</h2>
          <button className="modal-close" onClick={onClose} disabled={sending}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSend} className="broadcast-form">
          {/* 1. Выбор ботов */}
          <div className="form-section">
            <h3>1. По каким ботам рассылать:</h3>
            <div className="bots-selection">
              <button
                type="button"
                className="select-all-btn"
                onClick={handleSelectAllBots}
                disabled={sending}
              >
                {selectedBots.length === bots.length ? (
                  <FiCheckSquare className="checkbox checked" />
                ) : (
                  <FiSquare className="checkbox" />
                )}
                <span>Выбрать все</span>
              </button>
              <div className="bots-list">
                {bots.map(bot => (
                  <label key={bot.id} className="bot-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedBots.includes(bot.id)}
                      onChange={() => handleToggleBot(bot.id)}
                      disabled={sending}
                    />
                    <span>@{bot.username}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Получатели */}
          <div className="form-section">
            <h3>2. По кому рассылать:</h3>
            <select
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value)}
              disabled={sending}
              className="recipient-select"
            >
              <option value="all">По всем пользователям в боте</option>
              <option value="label">По меткам</option>
            </select>

            {recipientType === 'label' && (
              <select
                value={selectedLabelId}
                onChange={(e) => setSelectedLabelId(e.target.value)}
                disabled={sending}
                className="label-select"
              >
                <option value="">Выберите метку</option>
                {labels.map(label => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 3. Текст сообщения */}
          <div className="form-section">
            <h3>3. Текст сообщения:</h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Введите текст сообщения..."
              rows="5"
              disabled={sending}
              data-testid="broadcast-message-input"
            />
          </div>

          {/* Прогресс */}
          {isSending && (
            <div className="progress-section">
              <div className="progress-info">
                <span>Отправлено: {progress.sent} / {progress.total}</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              
              {progress.statuses.length > 0 && (
                <div className="statuses-list">
                  <h4>Статусы отправки:</h4>
                  <div className="statuses-scroll">
                    {progress.statuses.map((status, index) => (
                      <div key={index} className={`status-item ${status.success ? 'success' : 'error'}`}>
                        {status.success ? '✅' : '❌'} {status.chat}
                        {!status.success && <span className="error-msg">: {status.error}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Кнопки */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={sending || !message.trim() || selectedBots.length === 0}
              data-testid="start-broadcast-button"
            >
              {sending ? 'Отправка...' : 'Создать'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={sending}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BroadcastModal;
