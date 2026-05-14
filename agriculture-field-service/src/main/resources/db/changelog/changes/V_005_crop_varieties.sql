-- ЯРОВАЯ ПШЕНИЦА
INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Ирень', id, 'Пермский НИИСХ', 90, 'MEDIUM', 'HIGH', false,
       'РФ', 'Уральский, Западно-Сибирский, Волго-Вятский', true,
       'Топ-1 по объёму высева яровой пшеницы в РФ (128,9 тыс. т)'
FROM crop_types WHERE ml_crop_code = 'spring_wheat' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Новосибирская 31', id, 'СибНИИРС (ФИЦ ИЦиГ СО РАН)', 88, 'MEDIUM', 'HIGH', false,
       'РФ', 'Западно-Сибирский, Восточно-Сибирский', true,
       'Топ (117,3 тыс. т), стандарт для Западной Сибири'
FROM crop_types WHERE ml_crop_code = 'spring_wheat' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Омская 36', id, 'СибНИИСХ', 85, 'HIGH', 'HIGH', false,
       'РФ', 'Волго-Вятский, Уральский, Западно-Сибирский, Средневолжский', true,
       'Топ (77 тыс. т), высокая засухоустойчивость, выведен для Омской области'
FROM crop_types WHERE ml_crop_code = 'spring_wheat' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Икар', id, 'ФГБНУ Уральский НИИСХ', 82, 'HIGH', 'HIGH', false,
       'РФ', 'Уральский, Западно-Сибирский', true,
       'Топ (78,6 тыс. т), допущен в Западно-Сибирском и Уральском регионах'
FROM crop_types WHERE ml_crop_code = 'spring_wheat' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'КВС Буран', id, 'KWS (Германия)', 84, 'MEDIUM', 'MEDIUM', false,
       'Германия', 'Уральский, Западно-Сибирский', true,
       'Немецкая селекция, адаптирован к условиям Западной Сибири (71,7 тыс. т)'
FROM crop_types WHERE ml_crop_code = 'spring_wheat' LIMIT 1;

-- ОЗИМАЯ ПШЕНИЦА
INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Гром', id, 'ФГБНУ НЦЗ им. Лукьяненко', 265, 'MEDIUM', 'HIGH', false,
       'РФ', 'Центральный, Центрально-Черноземный, Северо-Кавказский, Средневолжский', true,
       'Топ-1 озимой пшеницы РФ (220,1 тыс. т)'
FROM crop_types WHERE ml_crop_code = 'winter_wheat' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Скипетр', id, 'ФГБНУ ФНЦ зернобобовых и крупяных культур', 270, 'MEDIUM', 'HIGH', false,
       'РФ', 'Все регионы РФ включая Западно-Сибирский', true,
       'Топ-2 (217,3 тыс. т), универсальный сорт для всех регионов, высокая зимостойкость'
FROM crop_types WHERE ml_crop_code = 'winter_wheat' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Алексеич', id, 'ФГБНУ НЦЗ им. Лукьяненко', 260, 'HIGH', 'HIGH', false,
       'РФ', 'Северо-Кавказский, Центрально-Черноземный', true,
       'Топ-3 (182,8 тыс. т), высокая засухоустойчивость'
FROM crop_types WHERE ml_crop_code = 'winter_wheat' LIMIT 1;

-- ЯРОВОЙ ЯЧМЕНЬ
INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Памяти Чепелева', id, 'ФГБНУ СибНИИРС', 78, 'HIGH', 'MEDIUM', false,
       'РФ', 'Центральный, Волго-Вятский, Западно-Сибирский, Уральский', true,
       'Топ-1 ярового ячменя РФ (76,5 тыс. т), адаптирован к Западной Сибири'
FROM crop_types WHERE ml_crop_code = 'spring_barley' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Прерия', id, 'ФГБНУ СКФНАЦ', 75, 'HIGH', 'MEDIUM', false,
       'РФ', 'Уральский, Западно-Сибирский, Средневолжский, Нижневолжский', true,
       'Топ-2 (73 тыс. т), устойчив к гельминтоспориозу, ржавчине и пыльной головне'
FROM crop_types WHERE ml_crop_code = 'spring_barley' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Саша', id, 'ФГБНУ СибНИИСХ', 72, 'HIGH', 'HIGH', false,
       'РФ', 'Уральский, Западно-Сибирский', true,
       'Специально для Западной Сибири и Урала (58,5 тыс. т)'
FROM crop_types WHERE ml_crop_code = 'spring_barley' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Ача', id, 'ФГБНУ СибНИИРС', 76, 'MEDIUM', 'MEDIUM', false,
       'РФ', 'Волго-Вятский, Западно-Сибирский, Восточно-Сибирский', true,
       'Стабильный урожай в Сибири (52,3 тыс. т)'
FROM crop_types WHERE ml_crop_code = 'spring_barley' LIMIT 1;

-- ПОДСОЛНЕЧНИК
INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Енисей', id, 'ВНИИМК', 108, 'HIGH', 'LOW', false,
       'РФ', 'Уральский', true,
       'Единственный сорт подсолнечника в топ-10 для Уральского региона (1,0 тыс. т)'
FROM crop_types WHERE ml_crop_code = 'sunflower' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'ЕС Генезис', id, 'Euralis Semences (Франция)', 105, 'HIGH', 'LOW', true,
       'Франция', 'Средневолжский, Нижневолжский', true,
       'Французский гибрид, высокая засухоустойчивость (0,9 тыс. т)'
FROM crop_types WHERE ml_crop_code = 'sunflower' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'НК Неома', id, 'Syngenta (Швейцария)', 103, 'HIGH', 'LOW', true,
       'Швейцария', 'Центрально-Черноземный, Северо-Кавказский', true,
       'Топ-2 по объёму высева подсолнечника (1,4 тыс. т)'
FROM crop_types WHERE ml_crop_code = 'sunflower' LIMIT 1;

-- КУКУРУЗА
INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Росс 199 МВ', id, 'Краснодарский НИИСХ', 100, 'MEDIUM', 'LOW', true,
       'РФ', 'Западно-Сибирский, Центральный, Нижневолжский', true,
       'Топ-1 кукурузы РФ (3,5 тыс. т), допущен в Западно-Сибирском регионе'
FROM crop_types WHERE ml_crop_code = 'corn' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Росс 140 СВ', id, 'Краснодарский НИИСХ', 115, 'MEDIUM', 'LOW', true,
       'РФ', 'Уральский, Западно-Сибирский, Средневолжский', true,
       'Ранний гибрид для Урала и Западной Сибири (1,8 тыс. т)'
FROM crop_types WHERE ml_crop_code = 'corn' LIMIT 1;

-- ГОРОХ
INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Рокет', id, 'Seminis (Нидерланды)', 78, 'MEDIUM', 'HIGH', false,
       'Нидерланды', 'Западно-Сибирский, Уральский, Средневолжский', true,
       'Топ-1 гороха РФ (61 тыс. т), широкий регион допуска'
FROM crop_types WHERE ml_crop_code = 'peas' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Аксайский усатый 55', id, 'ФГБНУ СКФНАЦ', 75, 'HIGH', 'MEDIUM', false,
       'РФ', 'Уральский, Западно-Сибирский, Восточно-Сибирский', true,
       'Усатый тип (не полегает), высокая засухоустойчивость (19,6 тыс. т)'
FROM crop_types WHERE ml_crop_code = 'peas' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Астронавт', id, 'Saatbau (Австрия)', 80, 'MEDIUM', 'MEDIUM', false,
       'Австрия', 'Уральский, Западно-Сибирский, Средневолжский', true,
       'Австрийский сорт, устойчив к полеганию (17,9 тыс. т)'
FROM crop_types WHERE ml_crop_code = 'peas' LIMIT 1;

-- СОЯ
INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Сибирячка 1', id, 'СибНИИСХ', 118, 'MEDIUM', 'LOW', false,
       'РФ', 'Западно-Сибирский', false,
       'Адаптирован к условиям Западной Сибири, скороспелый сорт'
FROM crop_types WHERE ml_crop_code = 'soybean' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Омская 4', id, 'СибНИИСХ', 115, 'MEDIUM', 'LOW', false,
       'РФ', 'Западно-Сибирский', false,
       'Проверенный сорт сои для Омской области'
FROM crop_types WHERE ml_crop_code = 'soybean' LIMIT 1;

-- РАПС
INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Ратник', id, 'ВНИИМК', 90, 'HIGH', 'MEDIUM', false,
       'РФ', 'Западно-Сибирский, Уральский', false,
       'Засухоустойчивый сорт для зоны рискованного земледелия'
FROM crop_types WHERE ml_crop_code = 'rapeseed' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Гарант', id, 'KWS (Германия)', 95, 'MEDIUM', 'MEDIUM', false,
       'Германия', 'Западно-Сибирский', false,
       'Немецкая селекция, высокий потенциал масличности, адаптирован к Сибири'
FROM crop_types WHERE ml_crop_code = 'rapeseed' LIMIT 1;

-- ГРЕЧИХА
INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Девятка', id, 'ФГБНУ ФНЦ зернобобовых и крупяных культур', 75, 'MEDIUM', 'MEDIUM', false,
       'РФ', 'Западно-Сибирский, Уральский', false,
       'Высокоурожайный детерминантный сорт'
FROM crop_types WHERE ml_crop_code = 'buckwheat' LIMIT 1;

INSERT INTO crop_varieties (name, crop_type_id, seed_producer, maturation_days,
                            drought_tolerance, frost_tolerance, is_hybrid,
                            origin, recommended_regions, is_top_by_area, notes)
SELECT 'Диалог', id, 'ФГБНУ ФНЦ зернобобовых и крупяных культур', 72, 'HIGH', 'MEDIUM', false,
       'РФ', 'Западно-Сибирский', false,
       'Скороспелый, устойчив к засухе'
FROM crop_types WHERE ml_crop_code = 'buckwheat' LIMIT 1;
