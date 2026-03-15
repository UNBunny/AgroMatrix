#!/usr/bin/env python3
"""
NDVI Calculator via Google Earth Engine (Sentinel-2 SR)
======================================================
Расчёт NDVI полигона, аналогичный OneSoil.

Принципы:
  1. Sentinel-2 Surface Reflectance (COPERNICUS/S2_SR_HARMONIZED) — 10 м.
  2. Жёсткий cloud masking (SCL + QA60) — облака, тени, снег, вода.
  3. Maximum Value Composite (MVC) за период — ee.Reducer.max().
  4. Масштабирование каналов B4/B8:  DN / 10000.
  5. Фильтрация по CLOUDY_PIXEL_PERCENTAGE < 70% на уровне сцен.

Использование:
  python ndvi_gee.py

Требования:
  pip install earthengine-api

Аутентификация (одноразово):
  earthengine authenticate
"""

import ee
import json


# ═══════════════════════════════════════════════════════════════
# 1. Инициализация GEE
# ═══════════════════════════════════════════════════════════════
def init_gee(project: str | None = None):
    """
    Инициализирует Earth Engine с проектом ee-agroplan по умолчанию.
    Credentials читаются из %USERPROFILE%\\.config\\earthengine\\credentials
    (сохраняются командой: .venv\\Scripts\\earthengine set_project ee-agroplan)
    """
    gee_project = project or "ee-agroplan"
    try:
        ee.Initialize(project=gee_project)
        print(f"[OK] Google Earth Engine инициализирован (project={gee_project}).")
    except Exception as e:
        raise RuntimeError(
            f"GEE инициализация не удалась: {e}\n"
            "Выполните один раз из ml-service:\n"
            "  .venv\\Scripts\\earthengine authenticate\n"
            "  .venv\\Scripts\\earthengine set_project ee-agroplan"
        )


# ═══════════════════════════════════════════════════════════════
# 2. Cloud Masking — SCL + QA60
# ═══════════════════════════════════════════════════════════════
def mask_clouds_scl_qa60(image: ee.Image) -> ee.Image:
    """
    Жёсткая фильтрация облаков и помех для Sentinel-2 SR.

    Используются два канала:
      - SCL (Scene Classification Layer, 20 м):
          Оставляем ТОЛЬКО классы:
            4  = Vegetation
            5  = Bare Soil
            6  = Water (опционально, но не вредит NDVI — будет ~−0.2)
            7  = Unclassified (допустимо, лучше чем потерять пиксели)
          Маскируем:
            0  = No data
            1  = Saturated/Defective
            2  = Dark Area / Shadows  ← тень от облака!
            3  = Cloud Shadow         ← тень от облака!
            7  = Unclassified (можно оставить или убрать)
            8  = Cloud (medium probability)
            9  = Cloud (high probability)
            10 = Thin Cirrus
            11 = Snow/Ice

      - QA60 (60 м, битовая маска):
          Bit 10 = opaque clouds
          Bit 11 = cirrus clouds
    """
    scl = image.select('SCL')

    # Допустимые SCL-классы для расчёта NDVI сельхозугодий:
    #   4 = Vegetation (основной класс)
    #   5 = Bare Soil (голая земля между рядами, после уборки)
    #   7 = Unclassified (спорный, но лучше оставить чем потерять пиксели)
    # Исключаем:
    #   6 = Water — даёт отрицательный NDVI, искажает среднее по полю
    #   11 = Snow/Ice — даёт ложный NDVI ~0
    #   8,9,10 = облака/cirrus
    #   2,3 = тени от облаков
    scl_mask = (scl.eq(4)
                .Or(scl.eq(5))
                .Or(scl.eq(7)))

    # QA60: маскируем биты 10 (opaque clouds) и 11 (cirrus)
    qa60 = image.select('QA60')
    cloud_bit_mask = 1 << 10
    cirrus_bit_mask = 1 << 11
    qa60_mask = (qa60.bitwiseAnd(cloud_bit_mask).eq(0)
                 .And(qa60.bitwiseAnd(cirrus_bit_mask).eq(0)))

    # Итоговая маска: оба условия должны быть чистыми
    combined_mask = scl_mask.And(qa60_mask)

    return image.updateMask(combined_mask)


# ═══════════════════════════════════════════════════════════════
# 3. Расчёт NDVI одного изображения
# ═══════════════════════════════════════════════════════════════
def add_ndvi(image: ee.Image) -> ee.Image:
    """
    Рассчитывает NDVI = (NIR − RED) / (NIR + RED).
    Sentinel-2 SR: DN / 10000 = Surface Reflectance.
    Защита от деления на ноль: маскируем пиксели где NIR+RED < 0.02
    (тёмные объекты, тень — там NDVI математически некорректен).
    """
    nir = image.select('B8').divide(10000.0)
    red = image.select('B4').divide(10000.0)

    denom = nir.add(red)

    # Маска пикселей где знаменатель слишком мал → избегаем деления на ~0
    valid_mask = denom.gt(0.02)

    ndvi = nir.subtract(red).divide(denom).rename('NDVI')
    ndvi = ndvi.clamp(-1.0, 1.0).updateMask(valid_mask)

    return image.addBands(ndvi)


# ═══════════════════════════════════════════════════════════════
# 4. Основная функция: NDVI MVC для полигона
# ═══════════════════════════════════════════════════════════════
def calculate_ndvi_mvc(
    polygon_coords: list[list[float]],
    date_start: str,
    date_end: str,
    max_cloud_pct: int = 70,
    scale: int = 10,
) -> dict:
    """
    Рассчитывает Maximum Value Composite NDVI для полигона за период.

    Параметры:
      polygon_coords : список координат [[lon, lat], [lon, lat], ...] — GeoJSON-порядок
      date_start     : начало периода "YYYY-MM-DD"
      date_end       : конец периода "YYYY-MM-DD" (не включительно в GEE filterDate)
      max_cloud_pct  : макс. % облачности сцены (предфильтр, по умолчанию 70%)
      scale          : разрешение в метрах (по умолчанию 10 м — нативное для B4/B8)

    Возвращает:
      dict с ключами:
        ndvi_mean   — среднее MVC NDVI по полигону
        ndvi_min    — минимальное MVC NDVI по полигону
        ndvi_max    — максимальное MVC NDVI по полигону
        ndvi_median — медианное MVC NDVI по полигону
        ndvi_std    — стандартное отклонение MVC NDVI по полигону
        pixel_count — количество чистых пикселей
        images_used — количество снимков в коллекции после фильтрации
    """

    # ── Создаём геометрию полигона ──
    polygon = ee.Geometry.Polygon([polygon_coords])

    # ── Фильтруем коллекцию Sentinel-2 SR ──
    collection = (
        ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(polygon)
        .filterDate(date_start, date_end)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', max_cloud_pct))
    )

    # Количество подходящих снимков
    n_images = collection.size().getInfo()
    print(f"[INFO] Найдено снимков после фильтрации облачности (<{max_cloud_pct}%): {n_images}")

    if n_images == 0:
        print("[WARN] Нет подходящих снимков за указанный период!")
        return {
            'ndvi_mean': None,
            'ndvi_min': None,
            'ndvi_max': None,
            'ndvi_median': None,
            'ndvi_std': None,
            'pixel_count': 0,
            'images_used': 0,
        }

    # ── Применяем cloud masking + расчёт NDVI для каждого снимка ──
    collection_clean = collection.map(mask_clouds_scl_qa60).map(add_ndvi)

    # ── Maximum Value Composite (MVC): пиксельный максимум NDVI за период ──
    ndvi_mvc = collection_clean.select('NDVI').max()

    # ── Убираем артефакты снега/воды: NDVI < -0.05 на сельхозугодьях —
    # это снег или вода, не поле. Маскируем для корректного среднего.
    ndvi_mvc = ndvi_mvc.updateMask(ndvi_mvc.gt(-0.05))

    # ── Зональная статистика по полигону ──
    stats = ndvi_mvc.reduceRegion(
        reducer=ee.Reducer.mean()
                  .combine(ee.Reducer.min(), sharedInputs=True)
                  .combine(ee.Reducer.max(), sharedInputs=True)
                  .combine(ee.Reducer.median(), sharedInputs=True)
                  .combine(ee.Reducer.stdDev(), sharedInputs=True)
                  .combine(ee.Reducer.count(), sharedInputs=True),
        geometry=polygon,
        scale=scale,
        maxPixels=1e9,
        bestEffort=True,
    ).getInfo()

    print(f"[DEBUG] Raw stats: {json.dumps(stats, indent=2, default=str)}")

    # ── Парсим результаты ──
    result = {
        'ndvi_mean':   _safe_round(stats.get('NDVI_mean')),
        'ndvi_min':    _safe_round(stats.get('NDVI_min')),
        'ndvi_max':    _safe_round(stats.get('NDVI_max')),
        'ndvi_median': _safe_round(stats.get('NDVI_median')),
        'ndvi_std':    _safe_round(stats.get('NDVI_stdDev')),
        'pixel_count': stats.get('NDVI_count', 0),
        'images_used': n_images,
    }

    return result


# ═══════════════════════════════════════════════════════════════
# 5. Попиксельная NDVI-карта для поля (PNG URL)
# ═══════════════════════════════════════════════════════════════
def generate_ndvi_image(
    polygon_coords: list[list[float]],
    date: str,
    search_days: int = 15,
    max_cloud_pct: int = 70,
    dimensions: int = 512,
) -> dict:
    """
    Генерирует цветную NDVI-карту поля за конкретную дату (±search_days).
    Возвращает URL PNG-изображения через GEE getThumbURL.

    Параметры:
      polygon_coords : [[lon, lat], ...] — координаты полигона
      date           : "YYYY-MM-DD" — целевая дата
      search_days    : ±дней для поиска чистого снимка (по умолчанию 15)
      max_cloud_pct  : макс. % облачности сцены
      dimensions     : размер изображения в пикселях (ширина)

    Возвращает:
      dict: image_url, bbox, ndvi_mean, ndvi_min, ndvi_max, actual_date, images_found
    """
    from datetime import datetime, timedelta

    target = datetime.strptime(date, "%Y-%m-%d")
    date_start = (target - timedelta(days=search_days)).strftime("%Y-%m-%d")
    date_end = (target + timedelta(days=search_days)).strftime("%Y-%m-%d")

    polygon = ee.Geometry.Polygon([polygon_coords])
    bbox = polygon.bounds()

    # Коллекция снимков в окне дат
    collection = (
        ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(polygon)
        .filterDate(date_start, date_end)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', max_cloud_pct))
        .sort('CLOUDY_PIXEL_PERCENTAGE')
    )

    n_images = collection.size().getInfo()
    print(f"[INFO] NDVI image: найдено {n_images} снимков в окне {date_start}..{date_end}")

    if n_images == 0:
        return {
            'image_url': None,
            'bbox': None,
            'ndvi_mean': None,
            'ndvi_min': None,
            'ndvi_max': None,
            'actual_date': None,
            'images_found': 0,
        }

    # Cloud masking + NDVI
    collection_clean = collection.map(mask_clouds_scl_qa60).map(add_ndvi)

    # MVC за окно
    ndvi_mvc = collection_clean.select('NDVI').max()
    ndvi_mvc = ndvi_mvc.updateMask(ndvi_mvc.gt(-0.05))

    # Визуализация: палитра красный → жёлтый → зелёный
    ndvi_vis = ndvi_mvc.visualize(
        min=0.0,
        max=0.8,
        palette=['d73027', 'fc8d59', 'fee08b', 'd9ef8b', '91cf60', '1a9850'],
    )

    # Clip по полигону
    ndvi_vis_clipped = ndvi_vis.clip(polygon)

    # Bounding box для overlay
    bbox_info = bbox.bounds().getInfo()['coordinates'][0]
    west = min(p[0] for p in bbox_info)
    east = max(p[0] for p in bbox_info)
    south = min(p[1] for p in bbox_info)
    north = max(p[1] for p in bbox_info)

    # Генерируем URL изображения
    thumb_params = {
        'region': polygon,
        'dimensions': dimensions,
        'format': 'png',
    }
    image_url = ndvi_vis_clipped.getThumbURL(thumb_params)

    # Зональная статистика
    stats = ndvi_mvc.reduceRegion(
        reducer=ee.Reducer.mean()
                  .combine(ee.Reducer.min(), sharedInputs=True)
                  .combine(ee.Reducer.max(), sharedInputs=True),
        geometry=polygon,
        scale=10,
        maxPixels=1e9,
        bestEffort=True,
    ).getInfo()

    # Определяем фактическую дату (ближайший снимок)
    best_image = collection.first()
    actual_date_ms = best_image.date().millis().getInfo()
    actual_date = datetime.utcfromtimestamp(actual_date_ms / 1000).strftime("%Y-%m-%d")

    return {
        'image_url': image_url,
        'bbox': [west, south, east, north],
        'ndvi_mean': _safe_round(stats.get('NDVI_mean')),
        'ndvi_min': _safe_round(stats.get('NDVI_min')),
        'ndvi_max': _safe_round(stats.get('NDVI_max')),
        'actual_date': actual_date,
        'images_found': n_images,
    }


def get_available_dates(
    polygon_coords: list[list[float]],
    date_start: str,
    date_end: str,
    max_cloud_pct: int = 50,
) -> list[str]:
    """
    Возвращает список дат, для которых есть чистые снимки Sentinel-2.
    """
    from datetime import datetime

    polygon = ee.Geometry.Polygon([polygon_coords])

    collection = (
        ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(polygon)
        .filterDate(date_start, date_end)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', max_cloud_pct))
    )

    timestamps = collection.aggregate_array('system:time_start').getInfo()
    dates = sorted(set(
        datetime.utcfromtimestamp(ts / 1000).strftime("%Y-%m-%d")
        for ts in timestamps
    ))

    print(f"[INFO] Доступные даты: {len(dates)} за период {date_start}..{date_end}")
    return dates


# ═══════════════════════════════════════════════════════════════
# 6. Вспомогательные функции
# ═══════════════════════════════════════════════════════════════
def _safe_round(value, decimals: int = 4):
    """Безопасное округление (None → None)."""
    if value is None:
        return None
    return round(float(value), decimals)


def print_result(result: dict, polygon_name: str = "Field"):
    """Красивый вывод результата."""
    print("\n" + "=" * 60)
    print(f"  NDVI результат для: {polygon_name}")
    print("=" * 60)

    if result['ndvi_mean'] is None:
        print("  ⚠ Нет данных (все пиксели замаскированы или нет снимков)")
    else:
        print(f"  📊 NDVI Mean (MVC):    {result['ndvi_mean']:.4f}")
        print(f"  📉 NDVI Min:           {result['ndvi_min']:.4f}")
        print(f"  📈 NDVI Max:           {result['ndvi_max']:.4f}")
        print(f"  📐 NDVI Median:        {result['ndvi_median']:.4f}")
        print(f"  📏 NDVI Std:           {result['ndvi_std']:.4f}")
        print(f"  🔢 Чистых пикселей:    {result['pixel_count']}")
        print(f"  🛰  Использовано снимков: {result['images_used']}")

    print("=" * 60 + "\n")


# ═══════════════════════════════════════════════════════════════
# 6. Примеры использования / CLI
# ═══════════════════════════════════════════════════════════════
def main():
    """
    Пример: расчёт NDVI для тестового поля.
    Замените polygon_coords и даты на свои.
    """

    # ── Инициализация GEE ──
    # Если у вас есть Cloud Project, укажите его:
    # init_gee(project='your-gee-project-id')
    init_gee()

    # ── Тестовый полигон ──
    # Пример: поле в Краснодарском крае (пшеничное поле ~50 га)
    # Координаты в формате GeoJSON: [lon, lat]
    polygon_coords = [
        [39.0, 45.3],
        [39.01, 45.3],
        [39.01, 45.31],
        [39.0, 45.31],
        [39.0, 45.3],    # замыкаем полигон
    ]

    # ── Период: июль 2024 (активная вегетация) ──
    date_start = "2024-07-01"
    date_end = "2024-08-01"

    print(f"[INFO] Расчёт NDVI MVC для периода {date_start} — {date_end}")
    print(f"[INFO] Координаты полигона: {polygon_coords[:3]}...")

    result = calculate_ndvi_mvc(
        polygon_coords=polygon_coords,
        date_start=date_start,
        date_end=date_end,
        max_cloud_pct=70,
        scale=10,
    )

    print_result(result, polygon_name="Тестовое поле (Краснодарский край)")

    # ── Пример 2: Март (озимые, ожидаем ~0.3-0.5) ──
    print("\n--- Пример 2: Ранняя весна (март 2024) ---")
    result_march = calculate_ndvi_mvc(
        polygon_coords=polygon_coords,
        date_start="2024-03-01",
        date_end="2024-04-01",
        max_cloud_pct=70,
        scale=10,
    )
    print_result(result_march, polygon_name="Тестовое поле — Март 2024")

    return result


# ═══════════════════════════════════════════════════════════════
# 7. Функция для интеграции с API (FastAPI / Flask)
# ═══════════════════════════════════════════════════════════════
def get_field_ndvi(
    polygon_geojson: dict,
    date_start: str,
    date_end: str,
    project: str | None = None,
) -> dict:
    """
    Обёртка для использования из API-сервиса.

    Параметры:
      polygon_geojson : GeoJSON Feature или Geometry с координатами полигона
      date_start      : "YYYY-MM-DD"
      date_end        : "YYYY-MM-DD"
      project         : GEE Cloud Project ID (опционально)

    Возвращает:
      dict с NDVI-статистиками
    """
    init_gee(project=project)

    # Извлекаем координаты из GeoJSON
    if polygon_geojson.get('type') == 'Feature':
        coords = polygon_geojson['geometry']['coordinates'][0]
    elif polygon_geojson.get('type') == 'Polygon':
        coords = polygon_geojson['coordinates'][0]
    elif polygon_geojson.get('type') == 'MultiPolygon':
        coords = polygon_geojson['coordinates'][0][0]
    else:
        raise ValueError(
            f"Неподдерживаемый тип геометрии: {polygon_geojson.get('type')}. "
            "Ожидается Feature, Polygon или MultiPolygon."
        )

    return calculate_ndvi_mvc(
        polygon_coords=coords,
        date_start=date_start,
        date_end=date_end,
    )


if __name__ == '__main__':
    main()

