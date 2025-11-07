import React from 'react';
import { FiMessageSquare, FiBarChart2, FiUser, FiSend } from 'react-icons/fi';
import './BottomNavigation.css';

function BottomNavigation({ activeTab, onTabChange, isAdmin }) {
  const tabs = [
    { id: 'chats', label: 'Чаты', icon: FiMessageSquare },
    { id: 'statistics', label: 'Статистика', icon: FiBarChart2 },
    ...(isAdmin ? [{ id: 'users', label: 'Пользователи', icon: FiUser }] : []),
    { id: 'broadcast', label: 'Рассылка', icon: FiSend }
  ];

  return (
    <div className="bottom-navigation">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            data-testid={`bottom-nav-${tab.id}`}
          >
            <Icon size={24} className="bottom-nav-icon" />
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default BottomNavigation;
