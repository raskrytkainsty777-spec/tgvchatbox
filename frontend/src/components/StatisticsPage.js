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

    const filtered = {
      total_sales: 0,
      total_buyers: 0,
      sales_by_bot: [],
      sales_by_day: []
    };

    // Фильтруем по ботам
    const botStats = statistics.sales_by_bot.filter(bot => {
      return selectedBots.length === 0 || selectedBots.some(selectedId => {
        const selectedBot = bots.find(b => b.id === selectedId);
        return selectedBot && selectedBot.username === bot.bot_username;
      });
    });

    // Фильтруем по датам
    const dayStats = statistics.sales_by_day.filter(day => {
      const dayDate = new Date(day.date);
      if (startDate && dayDate < startDate) return false;
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

      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon total">
            <FiDollarSign />
          </div>
          <div className="stat-content">
            <div className="stat-label">Общая сумма</div>
            <div className="stat-value">{statistics?.total_sales?.toFixed(2) || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon buyers">
            <FiUsers />
          </div>
          <div className="stat-content">
            <div className="stat-label">Всего покупателей</div>
            <div className="stat-value">{statistics?.total_buyers || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon average">
            <FiTrendingUp />
          </div>
          <div className="stat-content">
            <div className="stat-label">Средний чек</div>
            <div className="stat-value">
              {statistics?.total_buyers > 0
                ? (statistics.total_sales / statistics.total_buyers).toFixed(2)
                : 0}
            </div>
          </div>
        </div>
      </div>

      <div className="stats-sections">
        {/* Sales by Bot */}
        <div className="stats-section">
          <h2>Продажи по ботам</h2>
          <div className="stats-table">
            {!statistics?.sales_by_bot || statistics.sales_by_bot.length === 0 ? (
              <div className="no-data">Нет данных</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{width: '50%'}}>Бот</th>
                    <th style={{width: '15%'}}>Кол-во</th>
                    <th style={{width: '35%'}}>Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.sales_by_bot.map((bot, index) => (
                    <tr key={index}>
                      <td>@{bot.bot_username}</td>
                      <td>{bot.count}</td>
                      <td className="amount">{bot.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sales by Day */}
        <div className="stats-section">
          <h2>Продажи по дням</h2>
          <div className="stats-table">
            {!statistics?.sales_by_day || statistics.sales_by_day.length === 0 ? (
              <div className="no-data">Нет данных</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{width: '50%'}}>Дата</th>
                    <th style={{width: '15%'}}>Кол-во</th>
                    <th style={{width: '35%'}}>Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.sales_by_day.map((day, index) => (
                    <tr key={index}>
                      <td>{day.date}</td>
                      <td>{day.count}</td>
                      <td className="amount">{day.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatisticsPage;
