# 🚀 Быстрый старт - Развертывание на VPS

Репозиторий: `raskrytkainsty777-spec/tgvchatbox`

## Требования
- Ubuntu 24.04
- Root доступ
- IP адрес VPS
- Порты 80, 22 открыты

---

## ⚡ Установка за 3 команды

### На вашем VPS выполните:

```bash
# 1. Скачать установочный скрипт
curl -o install-vps.sh https://raw.githubusercontent.com/raskrytkainsty777-spec/tgvchatbox/main/deploy/install-vps.sh

# 2. Сделать исполняемым
chmod +x install-vps.sh

# 3. Запустить установку
./install-vps.sh
```

Скрипт спросит IP адрес - введите и нажмите Enter.

⏱️ **Время установки: 10-15 минут**

---

## ✅ После установки

Откройте в браузере: **http://ВАШ_IP**

**Данные для входа:**
- Логин: `admin`
- Пароль: `admin123`

⚠️ **Сразу смените пароль!**

---

## 🛠️ Управление приложением

```bash
# Перейти в папку проекта
cd /root/telegram-app

# Статус контейнеров
docker compose -f docker-compose.prod.yml ps

# Посмотреть все логи
docker compose -f docker-compose.prod.yml logs

# Логи backend
docker compose -f docker-compose.prod.yml logs backend

# Логи frontend  
docker compose -f docker-compose.prod.yml logs frontend

# Перезапустить все
docker compose -f docker-compose.prod.yml restart

# Остановить
docker compose -f docker-compose.prod.yml down

# Запустить
docker compose -f docker-compose.prod.yml up -d
```

---

## 🔄 Обновление приложения

```bash
cd /root/telegram-app

# Получить последние изменения
git pull

# Пересобрать и перезапустить
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## 🔒 Firewall (UFW)

```bash
# Открыть необходимые порты
ufw allow 80/tcp
ufw allow 22/tcp
ufw enable
ufw status
```

---

## 💾 Backup базы данных

```bash
# Создать backup
docker exec telegram_mongodb mongodump --out /data/backup --db telegram_chat_db

# Скопировать на локальный компьютер
docker cp telegram_mongodb:/data/backup ./mongodb-backup-$(date +%Y%m%d)
```

---

## 🆘 Решение проблем

### Приложение не открывается

1. Проверьте статус:
```bash
docker compose -f docker-compose.prod.yml ps
```

2. Посмотрите логи:
```bash
docker compose -f docker-compose.prod.yml logs
```

### Порт 80 занят

Если порт 80 используется другим приложением:
```bash
# Найти процесс
lsof -i :80

# Или изменить порт в docker-compose.prod.yml
# nginx -> ports: "8080:80"
```

### Нет свободного места

```bash
# Очистить неиспользуемые образы
docker system prune -a

# Проверить место
df -h
```

---

## 📊 Мониторинг ресурсов

```bash
# Использование ресурсов контейнерами
docker stats

# Использование диска
du -sh /root/telegram-app
```

---

## ⚙️ Минимальные требования

- **RAM**: 2GB (рекомендуется 4GB)
- **Диск**: 20GB
- **CPU**: 2 ядра
- **ОС**: Ubuntu 24.04

---

## 📞 Поддержка

При проблемах проверьте:
1. ✅ Все контейнеры запущены: `docker ps`
2. ✅ Порт 80 открыт: `ufw status`
3. ✅ Логи без ошибок: `docker compose logs`
4. ✅ Достаточно RAM: `free -h`

---

🎉 **Готово! Ваш Telegram Chat Panel работает!**
