# API Анализа Климатической Пригодности

## Endpoint

```
GET /api/fields/{fieldId}/climate-suitability/{cropTypeId}?years={years}
```

### Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `fieldId` | Long | ID поля (координаты для определения региона) |
| `cropTypeId` | Long | ID типа культуры для анализа |
| `years` | Integer (opt) | Количество лет для анализа (default: 5, max: 10) |

### Пример запроса

```bash
curl "http://localhost:8081/api/fields/1/climate-suitability/5?years=5"
```

## Пример ответа

```json
{
  "cropTypeId": 5,
  "cropTypeName": "Подсолнечник",
  "regionName": "Омская область",
  "analyzedYears": 5,
  "verdict": "SUITABLE",
  "overallScore": 0.72,
  "periodAnalyses": [
    {
      "period": "Апрель-Май",
      "parameter": "Осадки",
      "requiredMin": 60.0,
      "requiredMax": 140.0,
      "actualAvg": 95.5,
      "matchScore": 0.91,
      "status": "OPTIMAL"
    },
    {
      "period": "Июнь-Июль",
      "parameter": "ГТК",
      "requiredMin": 0.8,
      "requiredMax": 1.5,
      "actualAvg": 0.75,
      "matchScore": 0.62,
      "status": "ACCEPTABLE"
    }
  ],
  "risks": [
    {
      "riskType": "DROUGHT",
      "description": "Вероятность засухи в критический период (ГТК < 0.7)",
      "probability": 0.4,
      "mitigation": "Выбрать засухоустойчивый сорт, увеличить норму высева"
    }
  ],
  "recommendation": "✓ Культура подходит для выращивания. Основные риски: Вероятность засухи в критический период (40%). Рекомендуется выбрать засухоустойчивый сорт.",
  "historicalProfile": {
    "avgPrecipitationAprSep": 385.0,
    "avgTempSumAprSep": 2150.0,
    "avgGtkAprSep": 0.95,
    "avgHeatStressDays": 6,
    "maxLongestDryPeriod": 18,
    "minTempWinter": -28.5,
    "frostRiskSpring": true
  }
}
```

## Вердикты (SuitabilityVerdict)

| Вердикт | Score | Описание |
|---------|-------|----------|
| `HIGHLY_SUITABLE` | > 0.8 | Отлично подходит |
| `SUITABLE` | 0.6-0.8 | Подходит |
| `MARGINAL` | 0.4-0.6 | С рисками, требует мер |
| `UNSUITABLE` | < 0.4 | Не рекомендуется |

## Типы рисков

| Риск | Описание | Когда возникает |
|------|----------|-----------------|
| `DROUGHT` | Засуха | ГТК < 0.7 в >30% годов |
| `HEAT_STRESS` | Жаровой стресс | >10 дней с T>30°C в >20% годов |
| `FROST` | Заморозки | Весенние для теплолюбивых / зимние для озимых |
| `WATER_EXCESS` | Избыток влаги | ГТК > 2.0 |

## Как это работает

1. Загружает исторические агрометрики за указанное количество лет через `/api/agro-data/seasonal`
2. Усредняет показатели по периодам (Окт-Мар, Апр-Май, Июн-Июл, Авг-Сен)
3. Сравнивает с требованиями культуры (вода, температура, ГТК)
4. Оценивает риски на основе вариативности годов
5. Формирует вердикт и рекомендации
