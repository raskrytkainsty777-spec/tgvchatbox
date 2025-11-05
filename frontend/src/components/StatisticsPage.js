import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FiTrendingUp, FiDollarSign, FiUsers, FiArrowLeft, FiCalendar } from 'react-icons/fi';
import './StatisticsPage.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function StatisticsPage({ onBack }) {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bots, setBots] = useState([]);
  const [selectedBots, setSelectedBots] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    loadBots();
    loadStatistics();
  }, []);

  const loadBots = async () => {
    try {
      const response = await axios.get(`${API}/bots`);
      setBots(response.data);
      // По умолчанию выбираем все боты
      setSelectedBots(response.data.map(b => b.id));
    } catch (error) {
      console.error('Failed to load bots:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await axios.get(`${API}/statistics/sales`);
      setStatistics(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load statistics:', error);
      setLoading(false);
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

  // Фильтруем данные по выбранным ботам и датам
  const getFilteredStatistics = () => {
    if (!statistics) return null;

    // Если не выбран ни один бот, возвращаем нули
    if (selectedBots.length === 0) {
      return {
        total_sales: 0,
        total_buyers: 0,
        sales_by_bot: [],
        sales_by_day: []
      };
    }

    const filtered = {
      total_sales: 0,
      total_buyers: 0,
      sales_by_bot: [],
      sales_by_day: []
    };

    // Фильтруем по ботам
    const selectedBotUsernames = selectedBots.map(id => {
      const bot = bots.find(b => b.id === id);
      return bot ? bot.username : null;
    }).filter(Boolean);

    const botStats = statistics.sales_by_bot.filter(bot => 
      selectedBotUsernames.includes(bot.bot_username)
    );

    // Фильтруем по датам
    const dayStats = statistics.sales_by_day.filter(day => {
      const dayDate = new Date(day.date);
      if (startDate) {
        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0);
        if (dayDate < startDateTime) return false;
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        if (dayDate > endDateTime) return false;
      }
      return true;
    });

    // Вычисляем отфильтрованные итоги
    filtered.sales_by_bot = botStats;
    filtered.sales_by_day = dayStats;
    filtered.total_sales = dayStats.reduce((sum, day) => sum + day.total, 0);
    filtered.total_buyers = dayStats.reduce((sum, day) => sum + day.count, 0);

    return filtered;
  };

  // Пересчитываем при изменении фильтров
  const filteredStats = getFilteredStatistics();

  if (loading) {
    return (
      <div className="statistics-page">
        <div className="loading">Загрузка статистики...</div>
      </div>
    );
  }

  return (
    <div className="statistics-page">
      <div className="stats-header">
        <button className="back-btn" onClick={onBack}>
          <FiArrowLeft /> Назад
        </button>
        <h1>Статистика продаж</h1>
      </div>

      <div className="stats-container">
        {/* Левая колонка - Фильтры */}
        <div className="stats-sidebar">
          <div className="filter-section">
            <h3>Фильтр по ботам</h3>
            <div className="bots-filter">
              <label className="bot-checkbox">
                <input
                  type="checkbox"
                  checked={selectedBots.length === bots.length}
                  onChange={handleSelectAllBots}
                />
                <span>Все боты ({bots.length})</span>
              </label>
              {bots.map(bot => (
                <label key={bot.id} className="bot-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedBots.includes(bot.id)}
                    onChange={() => handleToggleBot(bot.id)}
                  />
                  <span>@{bot.username}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>Период</h3>
            <div className="date-filter">
              <div className="date-input-group">
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  placeholderText="От"
                  dateFormat="dd.MM.yyyy"
                  isClearable
                  className="date-input"
                />
              </div>
              <div className="date-input-group">
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  placeholderText="До"
                  dateFormat="dd.MM.yyyy"
                  isClearable
                  className="date-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Правая колонка - Статистика */}
        <div className="stats-content">
          <div className="stats-overview">
            <div className="stat-card">
              <div className="stat-icon total">
                <FiDollarSign />
              </div>
              <div className="stat-content">
                <div className="stat-label">Общая сумма</div>
                <div className="stat-value">{filteredStats?.total_sales?.toFixed(2) || 0}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon buyers">
                <FiUsers />
              </div>
              <div className="stat-content">
                <div className="stat-label">Всего покупателей</div>
                <div className="stat-value">{filteredStats?.total_buyers || 0}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon average">
                <FiTrendingUp />
              </div>
              <div className="stat-content">
                <div className="stat-label">Средний чек</div>
                <div className="stat-value">
                  {filteredStats?.total_buyers > 0
                    ? (filteredStats.total_sales / filteredStats.total_buyers).toFixed(2)
                    : 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatisticsPage;
