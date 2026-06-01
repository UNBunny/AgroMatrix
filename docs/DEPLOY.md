# Руководство по развертыванию

## Содержание

1. [Локальная разработка](#локальная-разработка)
2. [Production деплой](#production-деплой)
3. [Docker деплой](#docker-деплой)
4. [Облачные провайдеры](#облачные-провайдеры)

---

## Локальная разработка

### Требования

- Java 21
- Node.js 18+
- Python 3.11
- PostgreSQL 15+ с PostGIS
- Redis 7+
- Kafka 3.6+ (опционально)
- Docker Desktop (для инфраструктуры)

### Шаг 1: Инфраструктура

```bash
# Запуск PostgreSQL, Redis, Kafka
docker compose up -d postgres redis zookeeper kafka
```

### Шаг 2: Базы данных

```sql
-- Создание баз
createdb agro_plan
createdb agro_auth

-- PostGIS
createlang plpgsql agro_plan
psql -d agro_plan -c "CREATE EXTENSION postgis;"
```

### Шаг 3: Backend

```bash
# Сборка
./mvnw.cmd clean package

# Запуск Eureka
./mvnw.cmd spring-boot:run -pl eureka-server

# В другом терминале - Gateway
./mvnw.cmd spring-boot:run -pl api-gateway

# В другом терминале - Auth Service
./mvnw.cmd spring-boot:run -pl auth-service

# В другом терминале - Field Service
./mvnw.cmd spring-boot:run -pl agriculture-field-service

# Опционально: Weather и NDVI
./mvnw.cmd spring-boot:run -pl weather-service,ndvi-service
```

### Шаг 4: ML Service

```bash
cd agro-ml-service

# Виртуальное окружение
python -m venv .venv
.venv\Scripts\activate

# Зависимости
pip install -r requirements.txt

# Обучение моделей (первый запуск)
python train/train_agro_models.py

# Запуск
python app/main.py
```

### Шаг 5: Frontend

```bash
cd frontend
npm install
npm run dev
```

Открыть http://localhost:5173

---

## Production деплой

### Сборка артефактов

```bash
# Backend
./mvnw.cmd clean package -DskipTests

# Frontend
cd frontend
npm install
npm run build
```

### Конфигурация окружения

Создать `application-prod.yml` в каждом сервисе:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://prod-db:5432/agro_plan
    username: ${DB_USER}
    password: ${DB_PASSWORD}
  
server:
  port: ${PORT:8080}

eureka:
  client:
    service-url:
      defaultZone: ${EUREKA_URL}
```

### Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DB_URL` | JDBC URL базы | `jdbc:postgresql://db:5432/agro_plan` |
| `DB_USER` | Пользователь БД | `agro_user` |
| `DB_PASSWORD` | Пароль БД | `***` |
| `EUREKA_URL` | URL Eureka | `http://eureka:8761/eureka` |
| `JWT_SECRET` | Секрет JWT | `min256chars...` |
| `REDIS_HOST` | Хост Redis | `redis` |
| `ML_SERVICE_URL` | URL ML сервиса | `http://agro-ml:8090` |

---

## Docker деплой

### Production Docker Compose

```yaml
version: '3.8'

services:
  # Инфраструктура
  postgres:
    image: postgis/postgis:16-3.4-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: agro_plan
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - agro-network

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - agro-network

  # Java сервисы
  eureka-server:
    build:
      context: .
      dockerfile: eureka-server/Dockerfile
    ports:
      - "8761:8761"
    networks:
      - agro-network

  api-gateway:
    build:
      context: .
      dockerfile: api-gateway/Dockerfile
    ports:
      - "8080:8080"
    environment:
      EUREKA_URL: http://eureka-server:8761/eureka/
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - eureka-server
    networks:
      - agro-network

  auth-service:
    build:
      context: .
      dockerfile: auth-service/Dockerfile
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/agro_plan
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      EUREKA_URL: http://eureka-server:8761/eureka/
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
      - eureka-server
    networks:
      - agro-network

  field-service:
    build:
      context: .
      dockerfile: agriculture-field-service/Dockerfile
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/agro_plan
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      EUREKA_URL: http://eureka-server:8761/eureka/
      ML_SERVICE_URL: http://agro-ml:8090
    depends_on:
      - postgres
      - eureka-server
      - agro-ml
    networks:
      - agro-network

  # ML Service
  agro-ml:
    build:
      context: ./agro-ml-service
    environment:
      HOST: 0.0.0.0
      PORT: 8090
      REDIS_HOST: redis
    depends_on:
      - redis
    volumes:
      - ./agro-ml-service/models:/app/models:ro
    networks:
      - agro-network

  # Frontend (Nginx)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "80:80"
    depends_on:
      - api-gateway
    networks:
      - agro-network

volumes:
  postgres_data:
  redis_data:

networks:
  agro-network:
    driver: bridge
```

### Запуск

```bash
# Создать .env файл
cp .env.example .env
# Отредактировать .env

# Запуск
docker compose -f docker-compose.prod.yml up -d

# Масштабирование
docker compose -f docker-compose.prod.yml up -d --scale field-service=3
```

---

## Облачные провайдеры

### Yandex Cloud

```bash
# Создание кластера Kubernetes
yc managed-kubernetes cluster create \
  --name agro-cluster \
  --network-name default \
  --zone ru-central1-a

# Деплой
kubectl apply -f k8s/
```

### AWS

```bash
# ECR - репозиторий образов
aws ecr create-repository --repository-name agro-matrix

# EKS - Kubernetes
eksctl create cluster --name agro-cluster --region eu-west-1

# Деплой
kubectl apply -f k8s/aws/
```

### VPS (Hetzner, DigitalOcean)

```bash
# Установка Docker
curl -fsSL https://get.docker.com | sh

# Клонирование
git clone https://github.com/UNBunny/AgroMatrix.git
cd AgroMatrix

# Запуск
docker compose -f docker-compose.prod.yml up -d

# Nginx reverse proxy
sudo apt install nginx
cat > /etc/nginx/sites-available/agro << 'EOF'
server {
    listen 80;
    server_name agro.example.com;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/agro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL / HTTPS

### Let's Encrypt

```bash
# Certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d agro.example.com

# Автообновление
sudo systemctl enable certbot.timer
```

### Docker с SSL

```yaml
# docker-compose.ssl.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
```

---

## Мониторинг

### Health Checks

```bash
# Eureka
curl http://localhost:8761/actuator/health

# Gateway
curl http://localhost:8080/actuator/health

# ML Service
curl http://localhost:8090/health
```

### Логи

```bash
# Docker логи
docker logs -f agro-gateway

# Все сервисы
docker compose logs -f
```

### Метрики (Prometheus)

```yaml
# actuator + micrometer
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
```

---

## Troubleshooting

### Проблема: Сервисы не регистрируются в Eureka

**Решение**:
```bash
# Проверка сети
docker network ls
docker network inspect agro-network

# Перезапуск
docker compose restart eureka-server
```

### Проблема: ML сервис не находит модели

**Решение**:
```bash
# Проверка пути
ls -la agro-ml-service/models/

# Обучение моделей
cd agro-ml-service
python train/train_agro_models.py
```

### Проблема: База данных не инициализирована

**Решение**:
```bash
# Liquibase
docker compose exec field-service java -jar app.jar liquibase update
```

### Проблема: CORS ошибки

**Решение**:
```yaml
# application.yml
spring:
  cloud:
    gateway:
      globalcors:
        cors-configurations:
          '[/**]':
            allowedOrigins: "https://your-domain.com"
```

---

## Проверка деплоя

```bash
# 1. Eureka доступен
curl http://your-domain:8761

# 2. Gateway отвечает
curl http://your-domain:8080/actuator/health

# 3. Auth работает
curl -X POST http://your-domain:8080/api/auth/login \
  -d '{"email":"test@test.com","password":"test"}'

# 4. ML доступен
curl http://your-domain:8090/health

# 5. Frontend загружается
open http://your-domain
```
