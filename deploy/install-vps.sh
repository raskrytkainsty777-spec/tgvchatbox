#!/bin/bash

# Telegram Chat Panel - Automated VPS Deployment
# Repository: raskrytkainsty777-spec/tgvchatbox

set -e

echo "=========================================="
echo "Telegram Chat Panel - VPS Deployment"
echo "=========================================="
echo ""

# Get VPS IP
read -p "Введите IP адрес вашего VPS: " VPS_IP

if [ -z "$VPS_IP" ]; then
    echo "❌ IP адрес не может быть пустым!"
    exit 1
fi

echo ""
echo "🚀 Начинаем установку на $VPS_IP..."
echo ""

# Update system
echo "[1/8] Обновление системы..."
apt-get update -qq && apt-get upgrade -y -qq

# Install required packages
echo "[2/8] Установка необходимых пакетов..."
apt-get install -y -qq git curl gnupg lsb-release ca-certificates

# Install Docker
echo "[3/8] Установка Docker..."
if ! command -v docker &> /dev/null; then
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl start docker
    systemctl enable docker
    echo "✅ Docker установлен"
else
    echo "✅ Docker уже установлен"
fi

# Clone repository
echo "[4/8] Клонирование репозитория..."
cd /root
if [ -d "telegram-app" ]; then
    echo "Папка telegram-app уже существует, удаляем..."
    rm -rf telegram-app
fi
git clone https://github.com/raskrytkainsty777-spec/tgvchatbox.git telegram-app
cd telegram-app

# Configure IP addresses
echo "[5/8] Настройка конфигурации..."
# Update docker-compose
sed -i "s|YOUR_VPS_IP|$VPS_IP|g" docker-compose.prod.yml

# Update frontend .env
cat > frontend/.env << EOF
REACT_APP_BACKEND_URL=http://$VPS_IP:8001
EOF

# Build Docker images
echo "[6/8] Сборка Docker образов (это займет 5-10 минут)..."
docker compose -f docker-compose.prod.yml build --quiet

# Start containers
echo "[7/8] Запуск приложения..."
docker compose -f docker-compose.prod.yml up -d

# Wait for services to start
echo "Ожидание запуска сервисов..."
sleep 15

# Create admin user
echo "[8/8] Создание администратора..."
docker exec telegram_backend python3 << 'PYTHON_SCRIPT'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime, timezone

async def create_admin():
    try:
        client = AsyncIOMotorClient('mongodb://mongodb:27017')
        db = client.telegram_chat_db
        
        admin = await db.users.find_one({'username': 'admin'})
        if admin:
            print('✅ Admin уже существует')
        else:
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
            print('✅ Администратор создан')
        
        client.close()
    except Exception as e:
        print(f'⚠️  Ошибка создания админа: {e}')

asyncio.run(create_admin())
PYTHON_SCRIPT

echo ""
echo "=========================================="
echo "✅ Установка завершена успешно!"
echo "=========================================="
echo ""
echo "📱 Ваше приложение доступно:"
echo "   👉 http://$VPS_IP"
echo ""
echo "🔐 Данные для входа:"
echo "   Логин: admin"
echo "   Пароль: admin123"
echo ""
echo "📋 Полезные команды:"
echo "   Статус:        docker compose -f docker-compose.prod.yml ps"
echo "   Логи:          docker compose -f docker-compose.prod.yml logs"
echo "   Перезапуск:    docker compose -f docker-compose.prod.yml restart"
echo "   Остановка:     docker compose -f docker-compose.prod.yml down"
echo ""
echo "⚠️  ВАЖНО: Смените пароль администратора после первого входа!"
echo ""
