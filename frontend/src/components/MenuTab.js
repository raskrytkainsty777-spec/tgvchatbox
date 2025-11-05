import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiTrash2, FiEdit, FiX } from 'react-icons/fi';
import './MenuTab.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function MenuTab({ bots = [] }) {
  const [view, setView] = useState('main'); // main, createButton, createMenu, assignMenu, manageButtons, manageMenus
  const [buttons, setButtons] = useState([]);
  const [menus, setMenus] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        loadButtons(),
        loadMenus(),
        loadAssignments(),
        loadLabels()
      ]);
    } catch (err) {
      console.error('Failed to load menu data:', err);
      setError('Не удалось загрузить данные меню');
    } finally {
      setLoading(false);
    }
  };

  const loadButtons = async () => {
    try {
      const response = await axios.get(`${API}/menu-buttons`);
      setButtons(response.data || []);
    } catch (error) {
      console.error('Failed to load buttons:', error);
    }
  };

  const loadMenus = async () => {
    try {
      const response = await axios.get(`${API}/bot-menus`);
      setMenus(response.data || []);
    } catch (error) {
      console.error('Failed to load menus:', error);
    }
  };

  const loadAssignments = async () => {
    try {
      const response = await axios.get(`${API}/bot-menu-assignments`);
      setAssignments(response.data || []);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    }
  };

  const loadLabels = async () => {
    try {
      const response = await axios.get(`${API}/labels`);
      setLabels(response.data || []);
    } catch (error) {
      console.error('Failed to load labels:', error);
    }
  };

  if (error) {
    return (
      <div className="menu-tab">
        <div className="error-state">
          <p>{error}</p>
          <button className="btn-primary" onClick={loadAll}>
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="menu-tab">
        <div className="loading-state">
          Загрузка...
        </div>
      </div>
    );
  }

  return (
    <div className="menu-tab">
      {view === 'main' && (
        <MainView
          buttons={buttons}
          menus={menus}
          onManageButtons={() => setView('manageButtons')}
          onCreateMenu={() => setView('createMenu')}
          onAssignMenu={() => setView('assignMenu')}
        />
      )}

      {view === 'manageButtons' && (
        <ManageButtonsView
          labels={labels}
          buttons={buttons}
          onBack={() => { setView('main'); loadAll(); }}
        />
      )}

      {view === 'createMenu' && (
        <CreateMenuView
          buttons={buttons}
          menus={menus}
          onBack={() => { setView('main'); loadAll(); }}
        />
      )}

      {view === 'assignMenu' && (
        <AssignMenuView
          bots={bots}
          menus={menus}
          assignments={assignments}
          onBack={() => { setView('main'); loadAll(); }}
        />
      )}
    </div>
  );
}

// Main View with action buttons
function MainView({ buttons, menus, onCreateButton, onCreateMenu, onAssignMenu, onManageButtons, onManageMenus }) {
  return (
    <div className="main-view">
      <h3>Управление меню ботов</h3>
      <div className="menu-actions">
        <button className="btn-primary menu-action-btn" onClick={onCreateButton} data-testid="create-button-btn">
          <FiPlus /> Создать кнопки
        </button>
        <button className="btn-primary menu-action-btn" onClick={onCreateMenu} data-testid="create-menu-btn">
          <FiPlus /> Создать меню
        </button>
        <button className="btn-primary menu-action-btn" onClick={onAssignMenu} data-testid="assign-menu-btn">
          <FiEdit /> Добавить меню в бота
        </button>
      </div>

      <div className="stats-section">
        <div className="stat-card clickable" onClick={onManageButtons}>
          <div className="stat-number">{buttons.length}</div>
          <div className="stat-label">Кнопок создано</div>
          <div className="stat-action">Нажмите для управления</div>
        </div>
        <div className="stat-card clickable" onClick={onManageMenus}>
          <div className="stat-number">{menus.length}</div>
          <div className="stat-label">Меню создано</div>
          <div className="stat-action">Нажмите для управления</div>
        </div>
      </div>
    </div>
  );
}

// Create Button View
function CreateButtonView({ labels, buttons, onBack }) {
  const [name, setName] = useState('');
  const [actions, setActions] = useState([]);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const handleAddAction = (type) => {
    const newAction = { type, value: null };
    setActions([...actions, newAction]);
    setShowActionMenu(false);
  };

  const handleUpdateAction = (index, value) => {
    const updated = [...actions];
    updated[index].value = value;
    setActions(updated);
  };

  const handleRemoveAction = (index) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Введите название кнопки');
      return;
    }

    // Format actions for API - convert string values to dict format
    const formattedActions = actions.map(action => {
      let formattedValue = action.value;
      
      // Convert string values to dict format based on action type
      if (action.type === 'text' && typeof action.value === 'string') {
        formattedValue = { text: action.value };
      } else if (action.type === 'url' && typeof action.value === 'string') {
        formattedValue = { url: action.value };
      } else if (action.type === 'label' && typeof action.value === 'string') {
        formattedValue = { label_id: action.value };
      } else if (action.type === 'back') {
        formattedValue = null;
      }
      // 'block' type already has dict format from BlockActionEditor
      
      return {
        type: action.type,
        value: formattedValue
      };
    });

    try {
      await axios.post(`${API}/menu-buttons`, { name, actions: formattedActions });
      alert('Кнопка создана!');
      onBack();
    } catch (error) {
      console.error('Failed to create button:', error);
      alert('Ошибка при создании кнопки');
    }
  };

  return (
    <div className="create-button-view">
      <div className="view-header">
        <h3>Создать кнопку</h3>
        <button className="btn-secondary" onClick={onBack}>
          <FiX /> Назад
        </button>
      </div>

      <div className="form-group">
        <label>Название кнопки (отображается на кнопке):</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например: Каталог товаров"
          data-testid="button-name-input"
        />
      </div>

      <div className="form-group">
        <div className="section-header">
          <label>Действия кнопки:</label>
          <button
            className="btn-primary btn-sm"
            onClick={() => setShowActionMenu(!showActionMenu)}
            data-testid="add-action-btn"
          >
            <FiPlus /> Добавить действие
          </button>
        </div>

        {showActionMenu && (
          <div className="action-menu">
            <div className="action-option" onClick={() => handleAddAction('label')}>
              Пометить меткой
            </div>
            <div className="action-option" onClick={() => handleAddAction('url')}>
              Открыть URL
            </div>
            <div className="action-option" onClick={() => handleAddAction('text')}>
              Отправить текст
            </div>
            <div className="action-option" onClick={() => handleAddAction('block')}>
              Отправить блок
            </div>
            <div className="action-option" onClick={() => handleAddAction('back')}>
              Назад (вернуться на предыдущий уровень)
            </div>
          </div>
        )}

        <div className="actions-list">
          {actions.map((action, index) => (
            <ActionEditor
              key={index}
              action={action}
              index={index}
              labels={labels}
              buttons={buttons}
              onUpdate={(value) => handleUpdateAction(index, value)}
              onRemove={() => handleRemoveAction(index)}
            />
          ))}
          {actions.length === 0 && (
            <div className="empty-state">Добавьте действия для кнопки</div>
          )}
        </div>
      </div>

      <button className="btn-primary btn-block" onClick={handleSave} data-testid="save-button-btn">
        Сохранить кнопку
      </button>
    </div>
  );
}

// Action Editor Component
function ActionEditor({ action, index, labels, buttons, onUpdate, onRemove }) {
  const getActionLabel = () => {
    switch (action.type) {
      case 'label': return '🏷️ Пометить меткой';
      case 'url': return '🔗 Открыть URL';
      case 'text': return '💬 Отправить текст';
      case 'block': return '📦 Отправить блок';
      case 'back': return '⬅️ Назад';
      default: return action.type;
    }
  };

  return (
    <div className="action-editor">
      <div className="action-header">
        <span className="action-number">#{index + 1}</span>
        <span className="action-type">{getActionLabel()}</span>
        <button className="btn-icon-small btn-delete" onClick={onRemove}>
          <FiTrash2 />
        </button>
      </div>

      {action.type === 'label' && (
        <select
          value={action.value || ''}
          onChange={(e) => onUpdate(e.target.value)}
          className="action-select"
        >
          <option value="">Выберите метку</option>
          {labels.map(label => (
            <option key={label.id} value={label.id}>{label.name}</option>
          ))}
        </select>
      )}

      {action.type === 'url' && (
        <input
          type="text"
          value={action.value || ''}
          onChange={(e) => onUpdate(e.target.value)}
          placeholder="https://example.com"
          className="action-input"
        />
      )}

      {action.type === 'text' && (
        <textarea
          value={action.value || ''}
          onChange={(e) => onUpdate(e.target.value)}
          placeholder="Введите текст сообщения"
          rows="3"
          className="action-textarea"
        />
      )}

      {action.type === 'block' && (
        <BlockActionEditor
          value={action.value || {}}
          buttons={buttons}
          onUpdate={onUpdate}
        />
      )}

      {action.type === 'back' && (
        <div className="info-text">Вернет пользователя на предыдущий уровень меню</div>
      )}
    </div>
  );
}

// Block Action Editor
function BlockActionEditor({ value, buttons, onUpdate }) {
  const [text, setText] = useState(value.text || '');
  const [selectedButtons, setSelectedButtons] = useState(value.button_ids || []);

  const handleUpdate = (newText, newButtons) => {
    onUpdate({ text: newText, button_ids: newButtons });
  };

  const toggleButton = (buttonId) => {
    const updated = selectedButtons.includes(buttonId)
      ? selectedButtons.filter(id => id !== buttonId)
      : [...selectedButtons, buttonId];
    setSelectedButtons(updated);
    handleUpdate(text, updated);
  };

  return (
    <div className="block-editor">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          handleUpdate(e.target.value, selectedButtons);
        }}
        placeholder="Текст блока"
        rows="3"
        className="action-textarea"
      />
      <div className="button-selector">
        <label>Выберите кнопки для блока:</label>
        {buttons.map(btn => (
          <label key={btn.id} className="checkbox-label">
            <input
              type="checkbox"
              checked={selectedButtons.includes(btn.id)}
              onChange={() => toggleButton(btn.id)}
            />
            {btn.name}
          </label>
        ))}
      </div>
    </div>
  );
}

// Create Menu View
function CreateMenuView({ buttons, onBack }) {
  const [name, setName] = useState('');
  const [selectedButtons, setSelectedButtons] = useState([]);

  const toggleButton = (buttonId) => {
    setSelectedButtons(prev =>
      prev.includes(buttonId)
        ? prev.filter(id => id !== buttonId)
        : [...prev, buttonId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Введите название меню');
      return;
    }

    if (selectedButtons.length === 0) {
      alert('Добавьте хотя бы одну кнопку');
      return;
    }

    try {
      await axios.post(`${API}/bot-menus`, { name, button_ids: selectedButtons });
      alert('Меню создано!');
      onBack();
    } catch (error) {
      alert('Ошибка при создании меню');
    }
  };

  return (
    <div className="create-menu-view">
      <div className="view-header">
        <h3>Создать меню</h3>
        <button className="btn-secondary" onClick={onBack}>
          <FiX /> Назад
        </button>
      </div>

      <div className="form-group">
        <label>Название меню:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например: Главное меню"
          data-testid="menu-name-input"
        />
      </div>

      <div className="form-group">
        <label>Добавить кнопки:</label>
        {buttons.length === 0 ? (
          <div className="empty-state">Сначала создайте кнопки</div>
        ) : (
          <div className="buttons-list">
            {buttons.map(btn => (
              <label key={btn.id} className="button-card">
                <input
                  type="checkbox"
                  checked={selectedButtons.includes(btn.id)}
                  onChange={() => toggleButton(btn.id)}
                />
                <span className="button-name">{btn.name}</span>
                <span className="button-actions">{btn.actions.length} действий</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <button className="btn-primary btn-block" onClick={handleSave} data-testid="save-menu-btn">
        Сохранить меню
      </button>
    </div>
  );
}

// Assign Menu to Bot View
function AssignMenuView({ bots, menus, assignments, onBack }) {
  const [botMenus, setBotMenus] = useState({});

  useEffect(() => {
    // Initialize with current assignments
    const initial = {};
    assignments.forEach(assignment => {
      initial[assignment.bot_id] = assignment.menu_id;
    });
    setBotMenus(initial);
  }, [assignments]);

  const handleMenuChange = (botId, menuId) => {
    setBotMenus(prev => ({
      ...prev,
      [botId]: menuId
    }));
  };

  const handleSave = async (botId) => {
    const menuId = botMenus[botId];
    if (!menuId) {
      alert('Выберите меню');
      return;
    }

    try {
      await axios.post(`${API}/bot-menu-assignments`, { bot_id: botId, menu_id: menuId });
      alert('Меню назначено боту!');
      onBack();
    } catch (error) {
      alert('Ошибка при назначении меню');
    }
  };

  return (
    <div className="assign-menu-view">
      <div className="view-header">
        <h3>Добавить меню в бота</h3>
        <button className="btn-secondary" onClick={onBack}>
          <FiX /> Назад
        </button>
      </div>

      {menus.length === 0 ? (
        <div className="empty-state">Сначала создайте меню</div>
      ) : (
        <div className="bot-menu-list">
          {bots.map(bot => (
            <div key={bot.id} className="bot-menu-card">
              <div className="bot-info">
                <div className="bot-name">@{bot.username}</div>
              </div>
              <div className="menu-selector">
                <select
                  value={botMenus[bot.id] || ''}
                  onChange={(e) => handleMenuChange(bot.id, e.target.value)}
                  className="menu-select"
                >
                  <option value="">Выберите меню</option>
                  {menus.map(menu => (
                    <option key={menu.id} value={menu.id}>{menu.name}</option>
                  ))}
                </select>
                <button
                  className="btn-primary btn-sm"
                  onClick={() => handleSave(bot.id)}
                  disabled={!botMenus[bot.id]}
                  data-testid={`save-bot-menu-${bot.id}`}
                >
                  Сохранить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Manage Buttons View
function ManageButtonsView({ buttons, onBack }) {
  const handleDelete = async (buttonId, buttonName) => {
    if (!window.confirm(`Удалить кнопку "${buttonName}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/menu-buttons/${buttonId}`);
      alert('Кнопка удалена!');
      onBack();
    } catch (error) {
      console.error('Failed to delete button:', error);
      alert('Ошибка при удалении кнопки');
    }
  };

  return (
    <div className="manage-buttons-view">
      <div className="view-header">
        <h3>Управление кнопками ({buttons.length})</h3>
        <button className="btn-secondary" onClick={onBack}>
          <FiX /> Назад
        </button>
      </div>

      {buttons.length === 0 ? (
        <div className="empty-state">Нет созданных кнопок</div>
      ) : (
        <div className="manage-list">
          {buttons.map(button => (
            <div key={button.id} className="manage-item">
              <div className="manage-item-info">
                <div className="manage-item-name">{button.name}</div>
                <div className="manage-item-meta">
                  {button.actions.length} действий
                </div>
              </div>
              <button
                className="btn-icon-small btn-delete"
                onClick={() => handleDelete(button.id, button.name)}
                title="Удалить кнопку"
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Manage Menus View
function ManageMenusView({ menus, onBack }) {
  const handleDelete = async (menuId, menuName) => {
    if (!window.confirm(`Удалить меню "${menuName}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/bot-menus/${menuId}`);
      alert('Меню удалено!');
      onBack();
    } catch (error) {
      console.error('Failed to delete menu:', error);
      alert('Ошибка при удалении меню');
    }
  };

  return (
    <div className="manage-menus-view">
      <div className="view-header">
        <h3>Управление меню ({menus.length})</h3>
        <button className="btn-secondary" onClick={onBack}>
          <FiX /> Назад
        </button>
      </div>

      {menus.length === 0 ? (
        <div className="empty-state">Нет созданных меню</div>
      ) : (
        <div className="manage-list">
          {menus.map(menu => (
            <div key={menu.id} className="manage-item">
              <div className="manage-item-info">
                <div className="manage-item-name">{menu.name}</div>
                <div className="manage-item-meta">
                  {menu.button_ids.length} кнопок
                </div>
              </div>
              <button
                className="btn-icon-small btn-delete"
                onClick={() => handleDelete(menu.id, menu.name)}
                title="Удалить меню"
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export default MenuTab;
