# Архитектура AgroMatrix

## Общая схема

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│  Frontend   │──────│ API Gateway  │──────│  Auth Service   │
│  (React)    │      │   (8080)     │      │    (8085)       │
└─────────────┘      └──────────────┘      └─────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐  ┌────────▼────────┐  ┌──────▼──────┐
│   Agriculture │  │  Weather        │  │    NDVI     │
│   Field       │  │  Service        │  │   Service   │
│   Service     │  │  (8082)         │  │   (8083)    │
│   (8081)      │  │                 │  │             │
└──────────────┘  └─────────────────┘  └─────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                   ┌────────▼────────┐
                   │   ML Service    │
                   │   (8090)        │
                   └─────────────────┘
```

## Компоненты системы

### 1. Frontend (React + Vite)

- **Порт**: 5173
- **Технологии**: React 18, TypeScript, Vite, Leaflet (карты), Recharts (графики)
- **Основные функции**:
  - Управление полями на карте
  - Просмотр погодных данных
  - ML-прогнозы и рекомендации
  - Административная панель

### 2. API Gateway (Spring Cloud Gateway)

- **Порт**: 8080
- **Назначение**: Единая точка входа для всех запросов
- **Функции**:
  - Маршрутизация запросов в сервисы
  - JWT-фильтрация
  - Проверка прав доступа
  - Проксирование на Eureka для service discovery

### 3. Auth Service (Spring Boot)

- **Порт**: 8085
- **Назначение**: Аутентификация и авторизация
- **Основные эндпоинты**:
  - `POST /api/auth/register` - регистрация
  - `POST /api/auth/login` - вход
  - `POST /api/auth/refresh` - обновление токена
  - `POST /api/auth/logout` - выход
- **Технологии**: JWT, Spring Security, PostgreSQL

### 4. Agriculture Field Service (Spring Boot)

- **Порт**: 8081
- **Назначение**: Основной бизнес-логика аграрного управления
- **Модули**:
  - Управление хозяйствами (`/api/farms`)
  - Управление полями (`/api/fields`)
  - Справочники культур (`/api/crops`)
  - Севооборот (`/api/rotation`)
  - Болезни и риски (`/api/disease`)
  - Защита растений (`/api/protection`)
  - Отчеты и планы (`/api/reports`)
- **База данных**: PostgreSQL + PostGIS

### 5. Weather Service (Spring Boot)

- **Порт**: 8082
- **Назначение**: Работа с погодными данными
- **Источники**: Open-Meteo API
- **Функции**:
  - Текущая погода по координатам
  - Прогноз на 14 дней
  - Агрометеорологические показатели (ГТК, ОСР)
- **Кэширование**: Redis + Caffeine (двухуровневое)

### 6. NDVI Service (Spring Boot)

- **Порт**: 8083
- **Назначение**: Спутниковый мониторинг
- **Функции**:
  - Получение истории NDVI для полей
  - Интеграция с ML-сервисом для расчета
  - Анализ динамики вегетации
- **Интеграция**: Kafka (события создания полей)

### 7. ML Service (Python + FastAPI)

- **Порт**: 8090
- **Назначение**: Машинное обучение и прогнозы
- **Модели**:
  - Прогноз урожайности (LightGBM)
  - Прогноз цен (LightGBM)
  - Рекомендации культур (scikit-learn)
  - Рекомендации удобрений (scikit-learn)
  - Рекомендации пестицидов (scikit-learn)
  - Оценка рисков болезней (scikit-learn)
- **Интеграция**: Google Earth Engine (NDVI со спутников)

### 8. Eureka Server (Spring Cloud Netflix)

- **Порт**: 8761
- **Назначение**: Service Discovery
- **Функции**:
  - Регистрация всех сервисов
  - Health checks
  - Балансировка нагрузки

## Инфраструктура

### Базы данных

| Сервис | База данных | Назначение |
|--------|-------------|------------|
| Auth Service | `agro_auth` | Пользователи, роли, токены |
| Agriculture Field Service | `agro_plan` | Поля, культуры, отчеты |
| Weather Service | `agro_plan` | Погодные данные |
| NDVI Service | `agro_plan` | Данные NDVI |

### Кэширование

- **Redis** (порт 6379):
  - Сессии пользователей
  - Кэш погодных данных
  - Кэш ML-прогнозов
  - Двухуровневое кэширование (Caffeine L1 + Redis L2)

### Message Broker

- **Kafka** (порт 9092):
  - Событие `field-created` → триггер NDVI-анализа
  - Асинхронная коммуникация между сервисами

## Потоки данных

### 1. Аутентификация

```
Frontend → API Gateway → Auth Service → JWT Token → Cookie
```

### 2. Создание поля

```
Frontend → Gateway → Agriculture Field Service → PostgreSQL
                                    ↓
                              Kafka (field-created)
                                    ↓
                              NDVI Service → ML Service → NDVI расчет
```

### 3. Прогноз урожайности

```
Frontend → Gateway → Agriculture Field Service
                           ↓
                    ML Service (HTTP)
                           ↓
                    Возврат прогноза
```

### 4. Погодные данные

```
Frontend → Gateway → Weather Service
                           ↓
                    Open-Meteo API (при промахе кэша)
                           ↓
                    Redis (кэширование)
```

## Безопасность

- **JWT-токены**: Access (15 мин) + Refresh (7 дней) в HTTP-only cookies
- **X-Auth-User-Id**: Заголовок для идентификации пользователя
- **X-Auth-Farm-Id**: Заголовок для идентификации хозяйства
- **CORS**: Настроен для localhost:5173

## Масштабирование

- **Горизонтальное**: Каждый сервис можно масштабировать независимо
- **Балансировка**: Eureka + Spring Cloud LoadBalancer
- **Кэширование**: Redis как распределенный кэш

## Мониторинг

- **Actuator**: `/actuator/health` на всех Java-сервисах
- **Eureka Dashboard**: `http://localhost:8761`
- **ML Service Health**: `http://localhost:8090/health`
