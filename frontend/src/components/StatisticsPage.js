import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiTrendingUp, FiDollarSign, FiUsers, FiArrowLeft } from 'react-icons/fi';
import './StatisticsPage.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function StatisticsPage({ onBack }) {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

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
                    <th>Бот</th>
                    <th>Продаж</th>
                    <th>Сумма</th>
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
                    <th>Дата</th>
                    <th>Продаж</th>
                    <th>Сумма</th>
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
