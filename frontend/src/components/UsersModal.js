import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiX, FiPlus, FiEdit2, FiTrash2, FiCopy, FiCheck } from 'react-icons/fi';
import './UsersModal.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function UsersModal({ bots, onClose }) {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    bot_ids: [],
    role: 'user'
  });
  const [copiedToken, setCopiedToken] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleBotToggle = (botId) => {
    setFormData(prev => ({
      ...prev,
      bot_ids: prev.bot_ids.includes(botId)
        ? prev.bot_ids.filter(id => id !== botId)
        : [...prev.bot_ids, botId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      alert('Введите логин и пароль');
      return;
    }

    try {
      if (editingUser) {
        // Update user
        await axios.patch(`${API}/users/${editingUser.id}`, {
          username: formData.username,
          password: formData.password,
          bot_ids: formData.bot_ids
        });
        alert('Пользователь обновлён!');
      } else {
        // Create user
        await axios.post(`${API}/users`, formData);
        alert('Пользователь создан!');
      }
      
      setShowForm(false);
      setEditingUser(null);
      setFormData({ username: '', password: '', bot_ids: [], role: 'user' });
      loadUsers();
    } catch (error) {
      alert(error.response?.data?.detail || 'Ошибка при сохранении пользователя');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: user.password || '',
      bot_ids: user.bot_ids || [],
      role: user.role
    });
    setShowForm(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Удалить пользователя?')) return;

    try {
      await axios.delete(`${API}/users/${userId}`);
      alert('Пользователь удалён!');
      loadUsers();
    } catch (error) {
      alert('Ошибка при удалении пользователя');
    }
  };

  const handleCopyLink = (token) => {
    const link = `${window.location.origin}/login?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({ username: '', password: '', bot_ids: [], role: 'user' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="users-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Управление пользователями</h2>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-content">
          {!showForm ? (
            <>
              <button className="add-user-button" onClick={() => setShowForm(true)}>
                <FiPlus /> Добавить пользователя
              </button>

              <div className="users-list">
                {users.length === 0 ? (
                  <p className="no-users">Пользователей пока нет</p>
                ) : (
                  users.map(user => (
                    <div key={user.id} className="user-item">
                      <div className="user-info">
                        <div className="user-name">{user.username}</div>
                        <div className="user-details">
                          <span className={`user-role ${user.role}`}>
                            {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                          </span>
                          <span className="user-bots">
                            {user.bot_ids.length} {user.bot_ids.length === 1 ? 'бот' : 'ботов'}
                          </span>
                        </div>
                      </div>

                      <div className="user-actions">
                        <button
                          className="action-button copy-button"
                          onClick={() => handleCopyLink(user.access_token)}
                          title="Скопировать ссылку для входа"
                        >
                          {copiedToken === user.access_token ? <FiCheck /> : <FiCopy />}
                        </button>
                        <button
                          className="action-button edit-button"
                          onClick={() => handleEdit(user)}
                          title="Редактировать"
                        >
                          <FiEdit2 />
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            className="action-button delete-button"
                            onClick={() => handleDelete(user.id)}
                            title="Удалить"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="user-form">
              <h3>{editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}</h3>

              <div className="form-group">
                <label>Логин</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Введите логин"
                  required
                />
              </div>

              <div className="form-group">
                <label>Пароль</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Введите пароль"
                  required
                />
              </div>

              {editingUser && (
                <div className="form-group">
                  <label>Ссылка для входа</label>
                  <div className="link-container">
                    <input
                      type="text"
                      value={`${window.location.origin}/login?token=${editingUser.access_token}`}
                      readOnly
                      className="link-input"
                    />
                    <button
                      type="button"
                      className="copy-link-button"
                      onClick={() => handleCopyLink(editingUser.access_token)}
                    >
                      {copiedToken === editingUser.access_token ? <FiCheck /> : <FiCopy />}
                    </button>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Доступ к ботам</label>
                <div className="bots-checkboxes">
                  {bots.map(bot => (
                    <label key={bot.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.bot_ids.includes(bot.id)}
                        onChange={() => handleBotToggle(bot.id)}
                      />
                      @{bot.username}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-buttons">
                <button type="submit" className="submit-button">
                  {editingUser ? 'Сохранить' : 'Создать'}
                </button>
                <button type="button" className="cancel-button" onClick={handleCancel}>
                  Отмена
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default UsersModal;
