#!/bin/bash

# Telegram Chat Panel VPS Installation Script
# Ubuntu 24.04

set -e

echo "=========================================="
echo "Telegram Chat Panel - VPS Installation"
echo "=========================================="
echo ""

# Get VPS IP
echo "Введите IP адрес вашего VPS:"
read VPS_IP

echo ""
echo "Начинаем установку..."
echo ""

# Update system
echo "[1/7] Обновление системы..."
apt-get update && apt-get upgrade -y

# Install Docker
echo "[2/7] Установка Docker..."
apt-get install -y ca-certificates curl gnupg lsb-release
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker
echo "[3/7] Запуск Docker..."
systemctl start docker
systemctl enable docker

# Replace IP in configs
echo "[4/7] Настройка конфигурации..."
sed -i "s/YOUR_VPS_IP/$VPS_IP/g" docker-compose.prod.yml
sed -i "s/YOUR_VPS_IP/$VPS_IP/g" frontend/.env

# Build and start containers
echo "[5/7] Сборка Docker образов (это займет 5-10 минут)..."
docker compose -f docker-compose.prod.yml build

echo "[6/7] Запуск приложения..."
docker compose -f docker-compose.prod.yml up -d

# Create admin user
echo "[7/7] Создание администратора..."
sleep 10

docker exec telegram_backend python3 -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime, timezone

async def create_admin():
    client = AsyncIOMotorClient('mongodb://mongodb:27017')
    db = client.telegram_chat_db
    
    admin = await db.users.find_one({'username': 'admin'})
    if admin:
        print('Admin already exists')
        client.close()
        return
    
    admin_id = str(uuid.uuid4())
    access_token = str(uuid.uuid4())
    
    admin_data = {
        'id': admin_id,
        'username': 'admin',
        'password': 'admin123',
        'access_token': access_token,
        'bot_ids': [],
        'role': 'admin',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_data)
    print('✅ Admin created: admin / admin123')
    
    client.close()

asyncio.run(create_admin())
" 2>/dev/null || echo "Admin creation skipped"

echo ""
echo "=========================================="
echo "✅ Установка завершена!"
echo "=========================================="
echo ""
echo "Ваше приложение доступно по адресу:"
echo "👉 http://$VPS_IP"
echo ""
echo "Данные для входа:"
echo "Логин: admin"
echo "Пароль: admin123"
echo ""
echo "Полезные команды:"
echo "  Посмотреть логи:      docker compose -f docker-compose.prod.yml logs"
echo "  Остановить:           docker compose -f docker-compose.prod.yml down"
echo "  Перезапустить:        docker compose -f docker-compose.prod.yml restart"
echo "  Статус контейнеров:   docker compose -f docker-compose.prod.yml ps"
echo ""
echo "Для добавления ботов откройте http://$VPS_IP и войдите как admin"
echo ""
