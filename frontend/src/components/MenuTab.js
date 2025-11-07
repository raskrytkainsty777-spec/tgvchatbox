import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiTrash2, FiEdit, FiX, FiCopy } from 'react-icons/fi';
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
function MainView({ buttons, menus, onManageButtons, onCreateMenu, onAssignMenu }) {
  return (
    <div className="main-view">
      <h3>Управление меню ботов</h3>
      <div className="menu-actions">
        <button className="btn-primary menu-action-btn" onClick={onManageButtons} data-testid="manage-buttons-btn">
          <FiEdit /> Создать кнопки
        </button>
        <button className="btn-primary menu-action-btn" onClick={onCreateMenu} data-testid="create-menu-btn">
          <FiPlus /> Создать меню
        </button>
        <button className="btn-primary menu-action-btn" onClick={onAssignMenu} data-testid="assign-menu-btn">
          <FiEdit /> Добавить меню в бота
        </button>
      </div>

      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-number">{buttons.length}</div>
          <div className="stat-label">Кнопок создано</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{menus.length}</div>
          <div className="stat-label">Меню создано</div>
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
function CreateMenuView({ buttons, menus, onBack }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [name, setName] = useState('');
  const [selectedButtons, setSelectedButtons] = useState([]);
  const [currentButtonId, setCurrentButtonId] = useState('');

  const handleAddButton = () => {
    if (!currentButtonId) {
      alert('Выберите кнопку');
      return;
    }
    if (selectedButtons.includes(currentButtonId)) {
      alert('Эта кнопка уже добавлена');
      return;
    }
    setSelectedButtons([...selectedButtons, currentButtonId]);
    setCurrentButtonId('');
  };

  const handleRemoveButton = (buttonId) => {
    setSelectedButtons(selectedButtons.filter(id => id !== buttonId));
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
      if (editingMenu) {
        // Update existing menu
        await axios.put(`${API}/bot-menus/${editingMenu.id}`, { name, button_ids: selectedButtons });
        alert('Меню обновлено!');
      } else {
        // Create new menu
        await axios.post(`${API}/bot-menus`, { name, button_ids: selectedButtons });
        alert('Меню создано!');
      }
      setName('');
      setSelectedButtons([]);
      setShowCreateForm(false);
      setEditingMenu(null);
      onBack();
    } catch (error) {
      console.error('Failed to save menu:', error);
      alert('Ошибка при сохранении меню');
    }
  };

  const handleEdit = (menu) => {
    setEditingMenu(menu);
    setName(menu.name);
    setSelectedButtons(menu.button_ids);
    setShowCreateForm(true);
  };

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

  const handleCancelEdit = () => {
    setShowCreateForm(false);
    setEditingMenu(null);
    setName('');
    setSelectedButtons([]);
  };

  const getButtonName = (buttonId) => {
    const button = buttons.find(b => b.id === buttonId);
    return button ? button.name : buttonId;
  };

  return (
    <div className="create-menu-view">
      <div className="view-header">
        <h3>Создать меню ({menus.length})</h3>
        <button className="btn-secondary" onClick={onBack}>
          <FiX /> Назад
        </button>
      </div>

      {/* Create/Edit Menu Form */}
      {!showCreateForm ? (
        <button 
          className="btn-primary btn-block" 
          onClick={() => setShowCreateForm(true)}
          style={{ marginBottom: '20px' }}
        >
          <FiPlus /> Добавить новое меню
        </button>
      ) : (
        <div className="create-form" style={{ marginBottom: '20px' }}>
          <h4>{editingMenu ? 'Редактировать меню' : 'Новое меню'}</h4>
          
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
            <div className="section-header">
              <label>Кнопки меню:</label>
            </div>
            
            {buttons.length === 0 ? (
              <div className="empty-state">Сначала создайте кнопки в разделе "Создать кнопки"</div>
            ) : (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <select
                value={currentButtonId}
                onChange={(e) => setCurrentButtonId(e.target.value)}
                className="action-select"
                style={{ flex: 1 }}
              >
                <option value="">Выберите кнопку</option>
                {buttons.map(btn => (
                  <option key={btn.id} value={btn.id}>{btn.name}</option>
                ))}
              </select>
              <button 
                className="btn-primary btn-sm" 
                onClick={handleAddButton}
                style={{ whiteSpace: 'nowrap' }}
              >
                <FiPlus /> Добавить кнопку
              </button>
            </div>

            {selectedButtons.length > 0 && (
              <div className="selected-buttons-list">
                <div style={{ fontSize: '13px', color: '#8d969e', marginBottom: '10px' }}>
                  Добавленные кнопки ({selectedButtons.length}):
                </div>
                {selectedButtons.map((buttonId, index) => (
                  <div key={buttonId} className="selected-button-item">
                    <span className="button-order">#{index + 1}</span>
                    <span className="button-name" style={{ flex: 1 }}>{getButtonName(buttonId)}</span>
                    <button
                      className="btn-icon-small btn-delete"
                      onClick={() => handleRemoveButton(buttonId)}
                      title="Удалить кнопку"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn-primary" 
              onClick={handleSave} 
              data-testid="save-menu-btn"
              disabled={selectedButtons.length === 0}
            >
              {editingMenu ? 'Обновить меню' : 'Сохранить меню'}
            </button>
            <button 
              className="btn-secondary" 
              onClick={handleCancelEdit}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* List of existing menus */}
      <h4 style={{ marginBottom: '15px', color: '#fff' }}>Созданные меню</h4>
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-icon-small"
                  onClick={() => handleEdit(menu)}
                  title="Редактировать меню"
                >
                  <FiEdit />
                </button>
                <button
                  className="btn-icon-small btn-delete"
                  onClick={() => handleDelete(menu.id, menu.name)}
                  title="Удалить меню"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Assign Menu to Bot View
function AssignMenuView({ bots, menus, assignments, onBack }) {
  const [botMenus, setBotMenus] = useState({});

  // Filter menus to show only recent ones (created in last 24 hours)
  const recentMenus = menus.filter(menu => {
    if (!menu.created_at) return true; // Show if no timestamp
    const created = new Date(menu.created_at);
    const now = new Date();
    const hoursDiff = (now - created) / (1000 * 60 * 60);
    return hoursDiff < 24; // Last 24 hours
  });

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

  const handleRefreshCommands = async (botId) => {
    // Get current assignment for this bot
    const assignment = assignments.find(a => a.bot_id === botId);
    if (!assignment) {
      alert('У этого бота нет назначенного меню');
      return;
    }

    try {
      // Re-assign the same menu to refresh commands
      await axios.post(`${API}/bot-menu-assignments`, { 
        bot_id: botId, 
        menu_id: assignment.menu_id 
      });
      alert('✅ Команды обновлены!\n\nТеперь:\n1. Закройте и откройте бота\n2. Или подождите 30 секунд');
    } catch (error) {
      console.error('Failed to refresh commands:', error);
      alert('Ошибка при обновлении команд');
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

      {recentMenus.length === 0 ? (
        <div className="empty-state">
          {menus.length === 0 
            ? 'Сначала создайте меню' 
            : 'Нет новых меню. Показываются только меню, созданные за последние 24 часа.'}
        </div>
      ) : (
        <>
          <div style={{ fontSize: '13px', color: '#8d969e', marginBottom: '15px', padding: '0 5px' }}>
            Показаны меню за последние 24 часа ({recentMenus.length})
          </div>
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
                    {recentMenus.map(menu => (
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
                
                {/* Refresh commands button - shown only if bot has assigned menu */}
                {assignments.find(a => a.bot_id === bot.id) && (
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => handleRefreshCommands(bot.id)}
                    style={{ marginTop: '10px', width: '100%' }}
                    title="Переназначить меню для обновления команд в Telegram"
                  >
                    🔄 Обновить команды
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Manage Buttons View (with create functionality)
function ManageButtonsView({ labels, buttons, onBack }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBulkCreateForm, setShowBulkCreateForm] = useState(false);
  const [editingButton, setEditingButton] = useState(null);
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [level, setLevel] = useState(1);
  const [actions, setActions] = useState([]);
  const [showActionMenu, setShowActionMenu] = useState(false);
  
  // Bulk create states
  const [bulkPrefix, setBulkPrefix] = useState('');
  const [bulkLevel, setBulkLevel] = useState(1);
  const [bulkUrls, setBulkUrls] = useState('');

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

  const handleSaveButton = async () => {
    if (!name.trim()) {
      alert('Введите название кнопки');
      return;
    }

    // Auto-generate command from name if not provided
    const generateCommand = (name) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9а-яё\s]/gi, '') // Remove special chars
        .replace(/[а-яё]/g, (char) => {
          // Transliterate Russian to Latin
          const map = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
          };
          return map[char] || char;
        })
        .trim()
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 32); // Limit to 32 chars
    };

    const autoCommand = generateCommand(name);

    // Format actions for API
    const formattedActions = actions.map(action => {
      let formattedValue = action.value;
      
      if (action.type === 'text' && typeof action.value === 'string') {
        formattedValue = { text: action.value };
      } else if (action.type === 'url' && typeof action.value === 'string') {
        formattedValue = { url: action.value };
      } else if (action.type === 'label' && typeof action.value === 'string') {
        formattedValue = { label_id: action.value };
      } else if (action.type === 'back') {
        formattedValue = null;
      }
      
      return {
        type: action.type,
        value: formattedValue
      };
    });

    try {
      const buttonData = { 
        name, 
        command: autoCommand,
        level: level,
        actions: formattedActions 
      };
      
      if (editingButton) {
        // Update existing button
        await axios.put(`${API}/menu-buttons/${editingButton.id}`, buttonData);
        alert('Кнопка обновлена!');
      } else {
        // Create new button
        await axios.post(`${API}/menu-buttons`, buttonData);
        alert('Кнопка создана!');
      }
      setName('');
      setCommand('');
      setLevel(1);
      setActions([]);
      setShowCreateForm(false);
      setEditingButton(null);
      onBack();
    } catch (error) {
      console.error('Failed to save button:', error);
      alert('Ошибка при сохранении кнопки');
    }
  };

  const handleBulkCreate = async () => {
    if (!bulkPrefix.trim()) {
      alert('Введите начало названия кнопки');
      return;
    }

    const urls = bulkUrls.split('\n').map(url => url.trim()).filter(url => url.length > 0);
    
    if (urls.length === 0) {
      alert('Введите хотя бы одну ссылку');
      return;
    }

    try {
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < urls.length; i++) {
        const buttonName = `${bulkPrefix}${i + 1}`;
        const buttonData = {
          name: buttonName,
          command: generateCommand(buttonName),
          level: bulkLevel,
          actions: [{
            type: 'url',
            value: { url: urls[i] }
          }]
        };

        try {
          await axios.post(`${API}/menu-buttons`, buttonData);
          successCount++;
        } catch (error) {
          console.error(`Failed to create button ${buttonName}:`, error);
          failCount++;
        }
      }

      if (failCount > 0) {
        alert(`Создано кнопок: ${successCount}\nОшибок: ${failCount}`);
      } else {
        alert(`Успешно создано ${successCount} кнопок!`);
      }

      // Reset form
      setBulkPrefix('');
      setBulkLevel(1);
      setBulkUrls('');
      setShowBulkCreateForm(false);
      onBack();
    } catch (error) {
      console.error('Bulk create error:', error);
      alert('Ошибка при массовом создании кнопок');
    }
  };

  const generateCommand = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9а-яё\s]/gi, '')
      .replace(/[а-яё]/g, (char) => {
        const map = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
          'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        };
        return map[char] || char;
      })
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 32);
  };

  const handleEdit = (button) => {
    setEditingButton(button);
    setName(button.name);
    setCommand(button.command || '');
    setLevel(button.level || 1);
    
    // Parse actions back to editable format
    const parsedActions = button.actions.map(action => {
      let value = action.value;
      
      if (action.type === 'text' && action.value?.text) {
        value = action.value.text;
      } else if (action.type === 'url' && action.value?.url) {
        value = action.value.url;
      } else if (action.type === 'label' && action.value?.label_id) {
        value = action.value.label_id;
      }
      
      return {
        type: action.type,
        value: value
      };
    });
    
    setActions(parsedActions);
    setShowCreateForm(true);
  };

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

  const handleCancelEdit = () => {
    setShowCreateForm(false);
    setEditingButton(null);
    setName('');
    setCommand('');
    setLevel(1);
    setActions([]);
  };

  const handleCopy = (button) => {
    // Set button data without setting editingButton (so it creates new instead of updating)
    setEditingButton(null);
    setName(`${button.name} (копия)`);
    setCommand(button.command || '');
    setLevel(button.level || 1);
    
    // Parse actions back to editable format
    const parsedActions = button.actions.map(action => {
      let value = action.value;
      
      if (action.type === 'text' && action.value?.text) {
        value = action.value.text;
      } else if (action.type === 'url' && action.value?.url) {
        value = action.value.url;
      } else if (action.type === 'label' && action.value?.label_id) {
        value = action.value.label_id;
      }
      
      return {
        type: action.type,
        value: value
      };
    });
    
    setActions(parsedActions);
    setShowCreateForm(true);
  };

  return (
    <div className="manage-buttons-view">
      <div className="view-header">
        <h3>Создать кнопки ({buttons.length})</h3>
        <button className="btn-secondary" onClick={onBack}>
          <FiX /> Назад
        </button>
      </div>

      {/* Create Button Form */}
      {!showCreateForm ? (
        <button 
          className="btn-primary btn-block" 
          onClick={() => setShowCreateForm(true)}
          style={{ marginBottom: '20px' }}
        >
          <FiPlus /> Добавить новую кнопку
        </button>
      ) : (
        <div className="create-form" style={{ marginBottom: '20px' }}>
          <h4>{editingButton ? 'Редактировать кнопку' : 'Новая кнопка'}</h4>
          <div className="form-group">
            <label>Название кнопки:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Главное меню"
              data-testid="button-name-input"
            />
          </div>

          <div className="form-group">
            <label>Уровень меню:</label>
            <select
              value={level}
              onChange={(e) => setLevel(parseInt(e.target.value))}
              className="action-select"
            >
              <option value={1}>Уровень 1</option>
              <option value={2}>Уровень 2</option>
              <option value={3}>Уровень 3</option>
            </select>
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
                  Вернуться на шаг назад
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

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary" onClick={handleSaveButton} data-testid="save-button-btn">
              {editingButton ? 'Обновить кнопку' : 'Сохранить кнопку'}
            </button>
            <button 
              className="btn-secondary" 
              onClick={handleCancelEdit}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* List of existing buttons */}
      <h4 style={{ marginBottom: '15px', color: '#fff' }}>Созданные кнопки</h4>
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-icon-small"
                  onClick={() => handleCopy(button)}
                  title="Копировать кнопку"
                >
                  <FiCopy />
                </button>
                <button
                  className="btn-icon-small"
                  onClick={() => handleEdit(button)}
                  title="Редактировать кнопку"
                >
                  <FiEdit />
                </button>
                <button
                  className="btn-icon-small btn-delete"
                  onClick={() => handleDelete(button.id, button.name)}
                  title="Удалить кнопку"
                >
                  <FiTrash2 />
                </button>
              </div>
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
