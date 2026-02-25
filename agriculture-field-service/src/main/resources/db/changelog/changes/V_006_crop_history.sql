INSERT INTO agricultural_fields (field_name, crop_type, status, geom, area_hectares)
VALUES
('Поле Северное',    'Пшеница',      'active',
 ST_GeomFromText('POLYGON((55.0 73.0, 55.1 73.0, 55.1 73.1, 55.0 73.1, 55.0 73.0))', 4326), 45.20),
('Поле Южное',       'Ячмень',       'active',
 ST_GeomFromText('POLYGON((54.9 73.1, 55.0 73.1, 55.0 73.2, 54.9 73.2, 54.9 73.1))', 4326), 38.75),
('Поле Западное',    'Подсолнечник', 'active',
 ST_GeomFromText('POLYGON((54.8 72.9, 54.9 72.9, 54.9 73.0, 54.8 73.0, 54.8 72.9))', 4326), 62.10),
('Поле Восточное',   'Кукуруза',     'fallow',
 ST_GeomFromText('POLYGON((55.1 73.1, 55.2 73.1, 55.2 73.2, 55.1 73.2, 55.1 73.1))', 4326), 29.50),
('Поле Центральное', 'Соя',          'active',
 ST_GeomFromText('POLYGON((55.0 73.05, 55.05 73.05, 55.05 73.1, 55.0 73.1, 55.0 73.05))', 4326), 18.30);

-- Поле Северное (id=1): пшеница 2022 → ячмень 2023 → пшеница 2024
INSERT INTO crop_history (field_id, crop_type_id, planting_date, expected_harvest_date, actual_harvest_date,
                          seed_amount_kg_per_ha, seed_depth_cm, expected_yield_kg, actual_yield_kg,
                          planting_status, notes, weather_conditions)
VALUES
(1, 1, '2022-05-15', '2022-08-20', '2022-08-18', 220.00, 5.00, 135000.00, 128500.00,
 'HARVESTED', 'Хороший урожай, без существенных потерь', 'Засушливый июль, осадки в норме'),
(1, 3, '2023-05-10', '2023-07-25', '2023-07-22', 185.00, 4.00, 110000.00, 118000.00,
 'HARVESTED', 'Урожай выше ожидаемого', 'Благоприятные условия весь сезон'),
(1, 1, '2024-05-12', '2024-08-18', NULL,          225.00, 5.00, 140000.00, NULL,
 'GROWING',   'Посев в оптимальные сроки', 'Весна ранняя, достаточно влаги');

-- Поле Южное (id=2): подсолнечник 2022 → пшеница 2023 → ячмень 2024
INSERT INTO crop_history (field_id, crop_type_id, planting_date, expected_harvest_date, actual_harvest_date,
                          seed_amount_kg_per_ha, seed_depth_cm, plant_spacing_cm,
                          expected_yield_kg, actual_yield_kg, planting_status, notes, weather_conditions)
VALUES
(2, 5, '2022-05-20', '2022-09-10', '2022-09-08', 8.00, 5.00, 70.00, 90000.00, 85000.00,
 'HARVESTED', 'Небольшое поражение белой гнилью', 'Дождливый август'),
(2, 1, '2023-05-08', '2023-08-15', '2023-08-14', 220.00, 5.00, NULL, 105000.00, 112000.00,
 'HARVESTED', 'Отличный предшественник — подсолнечник', 'Тёплое лето, осадки в норме'),
(2, 3, '2024-05-05', '2024-07-20', NULL,          190.00, 4.00, NULL, 95000.00, NULL,
 'PLANTED',   'Ранний сев', 'Прохладная весна');

-- Поле Западное (id=3): соя 2022 → пшеница 2023 → подсолнечник 2024
INSERT INTO crop_history (field_id, crop_type_id, planting_date, expected_harvest_date, actual_harvest_date,
                          seed_amount_kg_per_ha, seed_depth_cm, plant_spacing_cm,
                          expected_yield_kg, actual_yield_kg, planting_status, notes, weather_conditions)
VALUES
(3, 6, '2022-05-25', '2022-09-15', '2022-09-12', 80.00, 4.00, 45.00, 70000.00, 68000.00,
 'HARVESTED', 'Хорошая азотфиксация', 'Тёплое лето'),
(3, 1, '2023-05-10', '2023-08-20', '2023-08-19', 230.00, 5.00, NULL,  180000.00, 175000.00,
 'HARVESTED', 'Высокий урожай после сои', 'Благоприятный сезон'),
(3, 5, '2024-05-18', '2024-09-05', NULL,          7.50, 5.00, 70.00, 155000.00, NULL,
 'GROWING',   'Посев в оптимальные сроки', 'Тёплая весна');

-- Поле Восточное (id=4): кукуруза 2022 → пар 2023 → пшеница 2024
INSERT INTO crop_history (field_id, crop_type_id, planting_date, expected_harvest_date, actual_harvest_date,
                          seed_amount_kg_per_ha, seed_depth_cm, plant_spacing_cm,
                          expected_yield_kg, actual_yield_kg, planting_status, notes, weather_conditions)
VALUES
(4, 4, '2022-05-22', '2022-09-20', '2022-09-18', 20.00, 6.00, 70.00, 80000.00, 74000.00,
 'HARVESTED', 'Засуха в июле снизила урожай', 'Засушливый июль'),
(4, 1, '2024-05-14', '2024-08-22', NULL,          220.00, 5.00, NULL, 87000.00, NULL,
 'PLANNED',   'После парового поля', 'Прогноз благоприятный');

-- Поле Центральное (id=5): горох 2022 → пшеница 2023 → соя 2024
INSERT INTO crop_history (field_id, crop_type_id, planting_date, expected_harvest_date, actual_harvest_date,
                          seed_amount_kg_per_ha, seed_depth_cm,
                          expected_yield_kg, actual_yield_kg, planting_status, notes, weather_conditions)
VALUES
(5, 8, '2022-05-12', '2022-07-30', '2022-07-28', 220.00, 5.00, 45000.00, 48000.00,
 'HARVESTED', 'Урожай выше плана', 'Хорошее увлажнение'),
(5, 1, '2023-05-08', '2023-08-15', '2023-08-13', 225.00, 5.00, 55000.00, 58000.00,
 'HARVESTED', 'Отличный предшественник — горох', 'Тёплое лето'),
(5, 6, '2024-05-20', '2024-09-10', NULL,          80.00, 4.00, 35000.00, NULL,
 'GROWING',   'Планируется как предшественник под пшеницу', 'Весна в норме');
