import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '@/App.css';
import SettingsModal from './components/SettingsModal';
import ChatList from './components/ChatList';
import ChatView from './components/ChatView';
import { FiSettings } from 'react-icons/fi';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
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

  useEffect(() => {
    loadBots();
    loadStats();
    const interval = setInterval(() => {
      loadChats();
      loadStats();
    }, 3000); // Обновление каждые 3 секунды
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadChats();
  }, [selectedBots, searchQuery]);

  const loadBots = async () => {
    try {
      const response = await axios.get(`${API}/bots`);
      setBots(response.data);
      if (selectedBots.length === 0) {
        setSelectedBots(response.data.filter(b => b.is_active).map(b => b.id));
      }
    } catch (error) {
      console.error('Failed to load bots:', error);
    }
  };

  const loadChats = async () => {
    try {
      const params = {};
      if (selectedBots.length > 0) {
        params.bot_ids = selectedBots.join(',');
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const response = await axios.get(`${API}/chats`, { params });
      setChats(response.data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
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

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
  };

  const handleToggleBotFilter = (botId) => {
    setSelectedBots(prev => {
      if (prev.includes(botId)) {
        return prev.filter(id => id !== botId);
      } else {
        return [...prev, botId];
      }
    });
  };

  return (
    <div className="telegram-app" data-testid="telegram-app">
      {/* Header */}
      <div className="app-header">
        <h1 className="app-title">Telegram Chat Panel</h1>
        <div className="header-actions">
          {stats && (
            <div className="stats-bar" data-testid="stats-bar">
              <span>Боты: {stats.active_bots}/{stats.total_bots}</span>
              <span>Чаты: {stats.total_chats}</span>
              <span className="unread-badge">Непрочитанные: {stats.total_unread}</span>
            </div>
          )}
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
        />
      )}

      {/* Main Content */}
      <div className="app-content">
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
      </div>
    </div>
  );
}

export default App;
