import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './App.css';
import { useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import SettingsModal from './components/SettingsModal';
import ChatList from './components/ChatList';
import ChatView from './components/ChatView';
import StatisticsPage from './components/StatisticsPage';
import UsersModal from './components/UsersModal';
import { FiSettings, FiSend, FiBarChart2, FiUser } from 'react-icons/fi';
import BroadcastModal from './components/BroadcastModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const { user, loading } = useAuth();
  const [bots, setBots] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedBots, setSelectedBots] = useState([]);
  const [showBotManager, setShowBotManager] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState(null);
  const [filterType, setFilterType] = useState('all'); // all, unread, label
  const [filterLabelId, setFilterLabelId] = useState(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);

  useEffect(() => {
    loadBots();
    loadStats();
    
    // Initialize WebSocket connection
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling']
    });
    
    socket.on('connect', () => {
      console.log('WebSocket connected');
    });
    
    socket.on('chat_status_update', (data) => {
      console.log('Chat status update received:', data);
      // Update chat status in state
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === data.chat_id 
            ? { ...chat, bot_status: data.bot_status }
            : chat
        )
      );
    });
    
    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    console.log('useEffect triggered:', { selectedBots, searchQuery, filterType, filterLabelId });
    loadChats();
    // Автообновление каждые 10 секунд (увеличено для отладки)
    const interval = setInterval(() => {
      loadChats();
      loadStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedBots, searchQuery, filterType, filterLabelId]);

  const loadBots = async () => {
    try {
      const response = await axios.get(`${API}/bots`);
      let botsData = response.data;
      
      // Фильтровать ботов на основе прав пользователя
      if (user && user.role === 'user' && user.bot_ids.length > 0) {
        botsData = botsData.filter(bot => user.bot_ids.includes(bot.id));
      }
      
      setBots(botsData);
      
      // Автоматически выбрать все активные боты при первой загрузке
      if (selectedBots.length === 0 && botsData.length > 0) {
        const activeBotIds = botsData.filter(b => b.is_active).map(b => b.id);
        console.log('Auto-selecting active bots:', activeBotIds); // Отладка
        setSelectedBots(activeBotIds);
      }
    } catch (error) {
      console.error('Failed to load bots:', error);
    }
  };

  const loadChats = useCallback(async () => {
    try {
      // Если нет выбранных ботов - показываем пустой список
      if (bots.length > 0 && selectedBots.length === 0) {
        console.log('No bots selected - showing empty list');
        setChats([]);
        return;
      }

      const params = {};
      
      // Фильтр по ботам - ВСЕГДА передаем если есть выбранные боты
      if (selectedBots.length > 0) {
        params.bot_ids = selectedBots.join(',');
      }
      
      // Поиск
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      // Фильтр непрочитанные
      if (filterType === 'unread') {
        params.unread_only = true;
      }
      
      // Фильтр по метке
      if (filterType === 'label' && filterLabelId) {
        params.label_id = filterLabelId;
      }
      
      // Фильтр по статусу (online/offline)
      if (filterType === 'online') {
        params.bot_status = 'active';
      } else if (filterType === 'offline') {
        params.bot_status = 'blocked';
      }
      
      console.log('Loading chats with params:', params);
      const response = await axios.get(`${API}/chats`, { params });
      console.log(`Loaded ${response.data.length} chats`);
      setChats(response.data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  }, [selectedBots, searchQuery, filterType, filterLabelId, bots.length]);

  const handleFilterChange = (type, labelId = null) => {
    console.log('handleFilterChange called:', { type, labelId }); // Для отладки
    setFilterType(type);
    setFilterLabelId(labelId);
    // loadChats вызовется автоматически через useEffect
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleBotAdded = () => {
    loadBots();
    setShowBotManager(false);
  };

  const handleChatSelect = async (chat) => {
    setSelectedChat(chat);
    
    // Automatically mark messages as read when chat is opened
    if (chat && chat.unread_count > 0) {
      try {
        await axios.patch(`${API}/messages/read`, {
          chat_id: chat.id
        });
        
        // Refresh chats to update unread count
        loadChats();
        loadStats();
      } catch (error) {
        console.error('Failed to mark messages as read:', error);
      }
    }
  };

  const handleToggleBotFilter = (botId) => {
    setSelectedBots(prev => {
      const newSelection = prev.includes(botId) 
        ? prev.filter(id => id !== botId)
        : [...prev, botId];
      console.log('Bot filter toggled. Selected bots:', newSelection); // Отладка
      return newSelection;
    });
  };

  // Show login page if not authenticated
  if (loading) {
    return <div className="loading-screen">Загрузка...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  const isAdmin = user && user.role === 'admin';

  return (
    <div className="telegram-app" data-testid="telegram-app">
      {/* Header */}
      <div className="app-header">
        <div className="header-left">
          {isAdmin && (
            <button 
              className="btn-icon user-icon"
              onClick={() => setShowUsersModal(true)}
              title="Управление пользователями"
            >
              <FiUser size={20} />
            </button>
          )}
          <h1 className="app-title">Telegram Chat Panel</h1>
        </div>
        <div className="header-actions">
          {stats && (
            <div className="stats-bar" data-testid="stats-bar">
              <span>Боты: {stats.active_bots}/{stats.total_bots}</span>
              <span>Чаты: {stats.total_chats}</span>
              <span className="unread-badge">Непрочитанные: {stats.total_unread}</span>
            </div>
          )}
          <button 
            className="btn-primary btn-statistics"
            onClick={() => setShowStatistics(true)}
            title="Статистика продаж"
          >
            <FiBarChart2 size={16} /> Статистика
          </button>
          <button 
            className="btn-primary btn-broadcast"
            onClick={() => setShowBroadcastModal(true)}
            data-testid="broadcast-button"
          >
            <FiSend size={16} /> Массовая отправка
          </button>
          <button 
            className="btn-icon"
            onClick={() => setShowBotManager(!showBotManager)}
            data-testid="settings-button"
          >
            <FiSettings size={20} />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showBotManager && (
        <SettingsModal 
          bots={bots}
          onClose={() => setShowBotManager(false)}
          onBotUpdated={handleBotAdded}
          userRole={user?.role}
        />
      )}

      {/* Users Modal */}
      {showUsersModal && isAdmin && (
        <UsersModal 
          bots={bots}
          onClose={() => setShowUsersModal(false)}
        />
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <BroadcastModal
          bots={bots}
          onClose={() => setShowBroadcastModal(false)}
          onSuccess={loadChats}
        />
      )}

      {/* Main Content */}
      <div className="app-content">
        {showStatistics ? (
          <StatisticsPage onBack={() => setShowStatistics(false)} />
        ) : (
          <>
            {/* Sidebar */}
            <div className="sidebar">
              <ChatList 
                chats={chats}
                bots={bots}
                selectedBots={selectedBots}
                selectedChat={selectedChat}
                searchQuery={searchQuery}
                onChatSelect={handleChatSelect}
                onSearchChange={setSearchQuery}
                onToggleBotFilter={handleToggleBotFilter}
                onChatsUpdate={loadChats}
                onFilterChange={handleFilterChange}
                userRole={user?.role}
              />
            </div>

            {/* Chat View */}
            <div className="chat-area">
              {selectedChat ? (
                <ChatView 
                  chat={selectedChat}
                  onMessageSent={loadChats}
                />
              ) : (
                <div className="no-chat-selected" data-testid="no-chat-selected">
                  <div className="placeholder">
                    <h2>Выберите чат</h2>
                    <p>Выберите чат из списка слева, чтобы начать общение</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
