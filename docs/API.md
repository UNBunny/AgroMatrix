# API Documentation

## Базовые URL

| Окружение | URL |
|-----------|-----|
| Локальная разработка | `http://localhost:8080` (Gateway) |
| ML Service | `http://localhost:8090` |
| Eureka | `http://localhost:8761` |

## Аутентификация

Все запросы (кроме логина/регистрации) требуют JWT токена в cookie `access_token`.

### Получение токена

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}' \
  --cookie-jar cookies.txt
```

### Использование токена

```bash
curl http://localhost:8080/api/fields \
  --cookie cookies.txt
```

## Auth API

### Регистрация
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password",
  "firstName": "Иван",
  "lastName": "Иванов"
}
```

### Вход
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Ответ**: Устанавливает cookies `access_token` и `refresh_token`

### Обновление токена
```http
POST /api/auth/refresh
```

### Выход
```http
POST /api/auth/logout
```

## Farm API

### Создание хозяйства
```http
POST /api/farms
Content-Type: application/json
X-Auth-User-Id: {userId}

{
  "name": "ООО АгроПоле",
  "region": "Омская область"
}
```

**Ответ**:
```json
{
  "id": 1,
  "name": "ООО АгроПоле",
  "inviteCode": "ABC123",
  "region": "Омская область"
}
```

### Получение хозяйства
```http
GET /api/farms/{id}
```

### Присоединение по коду
```http
POST /api/farms/join?inviteCode=ABC123
```

## Fields API

### Список полей
```http
GET /api/fields
X-Auth-Farm-Id: {farmId}
```

### Создание поля
```http
POST /api/fields
Content-Type: application/json
X-Auth-Farm-Id: {farmId}

{
  "name": "Поле 1",
  "area": 150.5,
  "coordinates": [
    [55.0, 73.0],
    [55.1, 73.0],
    [55.1, 73.1],
    [55.0, 73.1]
  ],
  "soilType": "чернозем",
  "currentCropId": 1
}
```

### Получение поля
```http
GET /api/fields/{id}
```

### Обновление поля
```http
PUT /api/fields/{id}
Content-Type: application/json

{
  "name": "Новое название",
  "area": 160.0
}
```

### Удаление поля
```http
DELETE /api/fields/{id}
```

## Crops API

### Справочник культур
```http
GET /api/crops/types
```

**Ответ**:
```json
[
  {
    "id": 1,
    "name": "Пшеница",
    "category": "зерновые"
  }
]
```

### Справочник сортов
```http
GET /api/crops/varieties?cropTypeId=1
```

### История посевов
```http
GET /api/crops/history?fieldId=1
```

### Добавление посева
```http
POST /api/crops/history
Content-Type: application/json

{
  "fieldId": 1,
  "cropVarietyId": 2,
  "plantingDate": "2024-04-15",
  "harvestDate": "2024-08-20",
  "yield": 35.5
}
```

## Rotation API

### Правила севооборота
```http
GET /api/rotation/rules?cropId=1
```

### Рекомендации
```http
GET /api/rotation/recommendations?fieldId=1&nextYear=2025
```

## Disease API

### Справочник болезней
```http
GET /api/disease
```

### Оценка риска
```http
POST /api/disease/risk/assess
Content-Type: application/json

{
  "fieldId": 1,
  "cropId": 1,
  "growthStage": "heading"
}
```

### Устойчивость сортов
```http
GET /api/disease/resistance?varietyId=1
```

## Protection API

### Каталог средств защиты
```http
GET /api/protection/catalog?diseaseId=1&bbchStage=50
```

### Решения по защите
```http
POST /api/protection/decisions
Content-Type: application/json

{
  "fieldId": 1,
  "threats": ["septoria", "fusarium"],
  "weatherData": {
    "temperature": 22.5,
    "humidity": 80
  }
}
```

## Reports API

### Отчеты по полям
```http
GET /api/reports/fields?fieldId=1&season=2024
```

### Планы сезона
```http
GET /api/reports/plans?farmId=1&year=2024
```

### Создание плана
```http
POST /api/reports/plans
Content-Type: application/json

{
  "farmId": 1,
  "year": 2025,
  "operations": [
    {
      "fieldId": 1,
      "operation": "seeding",
      "plannedDate": "2025-04-20",
      "cropId": 1
    }
  ]
}
```

### Журнал аудита
```http
GET /api/reports/audit?farmId=1&startDate=2024-01-01&endDate=2024-12-31
```

### Экспорт в Excel
```http
GET /api/reports/export/xls?farmId=1&reportType=fields
```

## Weather API

### Текущая погода
```http
GET /api/weather/current?lat=55.0&lon=73.0
```

**Ответ**:
```json
{
  "temperature": 22.5,
  "humidity": 65,
  "windSpeed": 3.5,
  "precipitation": 0.0,
  "description": "ясно"
}
```

### Прогноз
```http
GET /api/weather/forecast?lat=55.0&lon=73.0&days=7
```

### Агрометеорологические показатели
```http
GET /api/agro-metrics?lat=55.0&lon=73.0&startDate=2024-04-01&endDate=2024-08-31
```

### Гидротермический коэффициент (ГТК)
```http
GET /api/agro-metrics/gtk?lat=55.0&lon=73.0&month=7
```

## NDVI API

### История NDVI для поля
```http
GET /api/ndvi/fields/{fieldId}?startDate=2024-04-01&endDate=2024-08-31
```

**Ответ**:
```json
{
  "fieldId": 1,
  "measurements": [
    {
      "date": "2024-05-15",
      "ndvi": 0.65,
      "source": "sentinel-2"
    }
  ]
}
```

### Расчет NDVI для полигона
```http
POST /api/ndvi/calculate
Content-Type: application/json

{
  "coordinates": [
    [55.0, 73.0],
    [55.1, 73.0],
    [55.1, 73.1],
    [55.0, 73.1],
    [55.0, 73.0]
  ],
  "date": "2024-06-15"
}
```

### Статистика по регионам
```http
GET /api/ndvi/stats?region=Омская%20область&date=2024-06-15
```

## ML Service API

Базовый URL: `http://localhost:8090`

Документация Swagger: `http://localhost:8090/docs`

### Прогноз урожайности

```http
POST /api/yield/predict
Content-Type: application/json

{
  "region_code": "RU-OMS",
  "crop": "spring_wheat",
  "year": 2026,
  "as_of_date": "2026-06-01",
  "precip_oct_mar": 120.5,
  "precip_apr_may": 85.3,
  "temp_sum_apr_may": 1250.0
}
```

**Ответ**:
```json
{
  "region_code": "RU-OMS",
  "crop": "spring_wheat",
  "year": 2026,
  "predicted_yield_centners_per_ha": 28.45,
  "weather_completeness_pct": 75.0
}
```

### Массовый прогноз по регионам

```http
GET /api/yield/regions?crop=spring_wheat&year=2026
```

### Прогноз цены

```http
POST /api/price/predict
Content-Type: application/json

{
  "region": "Омская область",
  "crop": "wheat",
  "year": 2026,
  "month": 8,
  "price_lag1": 12500.0,
  "price_lag12": 11800.0,
  "price_ma3": 12200.0
}
```

### Рекомендация культуры

```http
POST /api/crop/recommend
Content-Type: application/json

{
  "N": 90,
  "P": 42,
  "K": 43,
  "temperature": 20.8,
  "humidity": 82.0,
  "ph": 6.5,
  "rainfall": 202.0
}
```

**Ответ**:
```json
{
  "recommended_crop": "wheat",
  "confidence": 0.85,
  "alternatives": ["barley", "oat"]
}
```

### Оценка риска заболеваний

```http
POST /api/disease/predict
Content-Type: application/json

{
  "crop": "wheat",
  "temperature": 22.5,
  "humidity": 85.0,
  "rainfall": 15.0,
  "growth_stage": "heading"
}
```

**Ответ**:
```json
{
  "disease": "septoria",
  "risk_level": "HIGH",
  "probability": 0.78,
  "recommendations": ["Обработка фунгицидом"]
}
```

### NDVI со спутника

```http
POST /api/ndvi/satellite
Content-Type: application/json

{
  "coordinates": [[55.0, 73.0], [55.1, 73.0], [55.1, 73.1], [55.0, 73.1], [55.0, 73.0]],
  "date_start": "2024-06-01",
  "date_end": "2024-06-30",
  "max_cloud_pct": 70,
  "scale": 10
}
```

**Ответ**:
```json
{
  "ndvi_mean": 0.67,
  "ndvi_min": 0.45,
  "ndvi_max": 0.82,
  "pixel_count": 1250,
  "images_used": 3
}
```

### Анализ угроз и рекомендации

```http
POST /api/ml/analyze-threats
Content-Type: application/json

{
  "crop_code": "wheat",
  "bbch_stage": 50,
  "ndvi_data": {
    "current_ndvi": 0.72,
    "ndvi_delta": -0.05
  },
  "weather_data": {
    "avg_humidity_48h": 85.0,
    "avg_temp_48h": 22.5,
    "total_precip_48h": 12.0,
    "rain_expected_in_3h": true
  },
  "target_diseases": ["septoria", "fusarium"]
}
```

## Коды ответов

| Код | Описание |
|-----|----------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (невалидные данные) |
| 401 | Unauthorized (нет токена) |
| 403 | Forbidden (нет прав) |
| 404 | Not Found |
| 503 | Service Unavailable (ML модель не загружена) |

## Пагинация

Для списков поддерживается пагинация:

```http
GET /api/fields?page=0&size=20&sort=name,asc
```

## Фильтрация

```http
GET /api/crops/history?fieldId=1&season=2024&cropType=wheat
```

## Ошибки

Формат ошибки:

```json
{
  "timestamp": "2024-06-15T10:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Поле с таким названием уже существует",
  "path": "/api/fields"
}
```
