# AgroMatrix

**AgroMatrix** — платформа для управления сельскохозяйственными полями с ML-прогнозами урожайности, погодным мониторингом и аналитикой NDVI.

## Быстрый старт

```bash
# 1. Запуск инфраструктуры
docker compose up -d

# 2. Запуск frontend
cd frontend && npm install && npm run dev
```

Открой http://localhost:5173

## Что дальше

| Ресурс | Описание |
|--------|----------|
| [Полная документация](./docs/ARCHITECTURE.md) | Архитектура, API, деплой |
| [Swagger UI](http://localhost:8090/docs) | Документация ML API |
| [Swagger Gateway](http://localhost:8080/swagger-ui.html) | Документация backend API |

## Структура проекта

```
+-- api-gateway/          # API Gateway (Spring Cloud)
+-- auth-service/         # Аутентификация JWT
+-- agriculture-field-service/  # Управление полями и хозяйствами
+-- weather-service/      # Погодные данные
+-- ndvi-service/         # Спутниковая аналитика
+-- agro-ml-service/      # ML прогнозы (Python/FastAPI)
+-- frontend/             # React + Vite
L-- docker-compose.yml    # Инфраструктура
```

## Требования

- Java 21
- Node.js 18+
- Python 3.11 (для ML)
- Docker Desktop

## Основные порты

| Сервис | Порт |
|--------|------|
| Frontend | 5173 |
| API Gateway | 8080 |
| ML Service | 8090 |
| Eureka | 8761 |

## Лицензия

MIT

