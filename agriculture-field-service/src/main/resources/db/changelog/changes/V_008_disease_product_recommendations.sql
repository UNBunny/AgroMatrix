-- Рекомендации препаратов по болезням
-- Покрытие: септориоз, мучнистая роса, ржавчина, фузариоз, корневые гнили,
--           пероноспороз, белая гниль/склеротиния, кила крестоцветных,
--           аскохитоз, антракноз льна, фитофтороз

--  ФУНГИЦИДЫ

-- Септориоз
INSERT INTO disease_product_recommendations (keywords, op_type, op_label, op_color, op_emoji, reason) VALUES
('септориоз', 'FUNGICIDE', 'Фунгицид', '#a855f7', '🍄',
 'Грибковое заболевание листьев и колоса (Septoria tritici / nodorum). Поражает флаговый лист, снижает налив зерна.');

INSERT INTO disease_product_items (recommendation_id, sort_order, name, active_ingredient, mechanism, dose, dose_value, timing, phi_days) VALUES
((SELECT id FROM disease_product_recommendations WHERE keywords = 'септориоз'),
 1, 'Фалькон', 'спироксамин + тебуконазол + триадименол', 'DMI + морфолины', '0.6 л/га', 0.6, 'BBCH 37–59, при появлении симптомов', 28),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'септориоз'),
 2, 'Тилт', 'пропиконазол', 'DMI-ингибитор', '0.5 л/га', 0.5, 'BBCH 37–55', 30),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'септориоз'),
 3, 'Прозаро', 'протиоконазол + тебуконазол', 'DMI-ингибитор', '0.8 л/га', 0.8, 'BBCH 37–65', 28);

-- Мучнистая роса
INSERT INTO disease_product_recommendations (keywords, op_type, op_label, op_color, op_emoji, reason) VALUES
('мучнистая роса,мучнистый', 'FUNGICIDE', 'Фунгицид', '#a855f7', '🍄',
 'Мучнистая роса (Blumeria / Erysiphe). Развивается при высокой влажности и умеренных температурах, поражает все надземные органы.');

INSERT INTO disease_product_items (recommendation_id, sort_order, name, active_ingredient, mechanism, dose, dose_value, timing, phi_days) VALUES
((SELECT id FROM disease_product_recommendations WHERE keywords = 'мучнистая роса,мучнистый'),
 1, 'Топаз', 'пенконазол', 'DMI-ингибитор', '0.5 л/га', 0.5, 'BBCH 30–50, при первых признаках', 30),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'мучнистая роса,мучнистый'),
 2, 'Байлетон', 'триадименол', 'DMI-ингибитор', '0.6 л/га', 0.6, 'BBCH 30–55', 28),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'мучнистая роса,мучнистый'),
 3, 'Тилт', 'пропиконазол', 'DMI-ингибитор', '0.5 л/га', 0.5, 'BBCH 25–55', 30);

-- Ржавчина
INSERT INTO disease_product_recommendations (keywords, op_type, op_label, op_color, op_emoji, reason) VALUES
('ржавчина', 'FUNGICIDE', 'Фунгицид', '#a855f7', '🍄',
 'Ржавчина (Puccinia spp.) — быстро распространяющееся заболевание при влажных условиях. Поражает листья, стебли, колосья.');

INSERT INTO disease_product_items (recommendation_id, sort_order, name, active_ingredient, mechanism, dose, dose_value, timing, phi_days) VALUES
((SELECT id FROM disease_product_recommendations WHERE keywords = 'ржавчина'),
 1, 'Колосаль Про', 'тебуконазол + крезоксим-метил', 'DMI + стробилурин', '0.4 л/га', 0.4, 'BBCH 37–65, при появлении первых пустул', 30),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'ржавчина'),
 2, 'Амистар Экстра', 'азоксистробин + ципроконазол', 'стробилурин + DMI', '0.75 л/га', 0.75, 'BBCH 32–65, профилактически или при симптомах', 35),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'ржавчина'),
 3, 'Тебу 60', 'тебуконазол', 'DMI-ингибитор', '0.8 л/га', 0.8, 'BBCH 37–59', 28);

-- Фузариоз колоса
INSERT INTO disease_product_recommendations (keywords, op_type, op_label, op_color, op_emoji, reason) VALUES
('фузариоз,фузариозный', 'FUNGICIDE', 'Фунгицид', '#a855f7', '🍄',
 'Фузариоз колоса (Fusarium graminearum / culmorum). Критичен при цветении — продуцирует микотоксины ДОН, снижает качество зерна.');

INSERT INTO disease_product_items (recommendation_id, sort_order, name, active_ingredient, mechanism, dose, dose_value, timing, phi_days) VALUES
((SELECT id FROM disease_product_recommendations WHERE keywords = 'фузариоз,фузариозный'),
 1, 'Прозаро', 'протиоконазол + тебуконазол', 'DMI-ингибитор', '0.8 л/га', 0.8, 'BBCH 61–65 (цветение), обязательно в первые 3 дня', 28),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'фузариоз,фузариозный'),
 2, 'Оперкот Акро', 'пропиконазол + ципроконазол', 'DMI-ингибитор', '0.5 л/га', 0.5, 'BBCH 59–65', 35),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'фузариоз,фузариозный'),
 3, 'Фоликур', 'тебуконазол', 'DMI-ингибитор', '1.0 л/га', 1.0, 'BBCH 59–65', 28);

-- Корневые гнили
INSERT INTO disease_product_recommendations (keywords, op_type, op_label, op_color, op_emoji, reason) VALUES
('корневая гниль,гниль корня,прикорневая гниль,корневые гнил', 'FUNGICIDE', 'Фунгицид', '#a855f7', '🍄',
 'Корневые гнили (Bipolaris sorokiniana, Fusarium spp.) — поражают корневую шейку и основание стебля, вызывают белостебельность.');

INSERT INTO disease_product_items (recommendation_id, sort_order, name, active_ingredient, mechanism, dose, dose_value, timing, phi_days) VALUES
((SELECT id FROM disease_product_recommendations WHERE keywords = 'корневая гниль,гниль корня,прикорневая гниль,корневые гнил'),
 1, 'Дивиденд Стар', 'дифеноконазол + ципроконазол', 'DMI-ингибитор (протравитель)', '1.5 л/т', 1.5, 'Протравливание семян', 0),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'корневая гниль,гниль корня,прикорневая гниль,корневые гнил'),
 2, 'Ламадор', 'протиоконазол + тебуконазол', 'DMI-ингибитор (протравитель)', '0.3 л/т', 0.3, 'Протравливание семян', 0),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'корневая гниль,гниль корня,прикорневая гниль,корневые гнил'),
 3, 'Альто Супер', 'пропиконазол + ципроконазол', 'DMI-ингибитор', '0.5 л/га', 0.5, 'BBCH 21–39, по вегетации при признаках', 30);

-- Пероноспороз
INSERT INTO disease_product_recommendations (keywords, op_type, op_label, op_color, op_emoji, reason) VALUES
('пероноспороз,ложная мучнистая', 'FUNGICIDE', 'Фунгицид', '#a855f7', '🍄',
 'Пероноспороз (Plasmopara / Peronospora) — оомицетный патоген, поражает листья и молодые растения при прохладной влажной погоде.');

INSERT INTO disease_product_items (recommendation_id, sort_order, name, active_ingredient, mechanism, dose, dose_value, timing, phi_days) VALUES
((SELECT id FROM disease_product_recommendations WHERE keywords = 'пероноспороз,ложная мучнистая'),
 1, 'Апрон Голд', 'металаксил-М', 'CAA-фунгицид (протравитель)', '2.5 г/т', 2.5, 'Протравливание семян — основная мера', 0),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'пероноспороз,ложная мучнистая'),
 2, 'Ридомил Голд', 'металаксил-М + манкоцеб', 'CAA + дитиокарбамат', '2.5 кг/га', 2.5, 'BBCH 10–30, профилактически при прогнозе дождей', 21),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'пероноспороз,ложная мучнистая'),
 3, 'Превикур Энерджи', 'фосетил + пропамокарб', 'CAA-фунгицид', '1.5 л/га', 1.5, 'BBCH 10–30, при первых симптомах', 14);

-- Белая гниль / склеротиния
INSERT INTO disease_product_recommendations (keywords, op_type, op_label, op_color, op_emoji, reason) VALUES
('белая гниль,склеротиния,sclerotinia', 'FUNGICIDE', 'Фунгицид', '#a855f7', '🍄',
 'Белая гниль (Sclerotinia sclerotiorum) — поражает подсолнечник, рапс, горох, сою. Склероции сохраняются в почве до 10 лет.');

INSERT INTO disease_product_items (recommendation_id, sort_order, name, active_ingredient, mechanism, dose, dose_value, timing, phi_days) VALUES
((SELECT id FROM disease_product_recommendations WHERE keywords = 'белая гниль,склеротиния,sclerotinia'),
 1, 'Контанс ВГ', 'Coniothyrium minitans', 'биофунгицид', '2 кг/га', 2.0, 'Внесение в почву за 3-4 мес до посева', 0),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'белая гниль,склеротиния,sclerotinia'),
 2, 'Скала', 'ипродион', 'SDHI-фунгицид', '1.0 л/га', 1.0, 'BBCH 51–65, в период цветения', 42),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'белая гниль,склеротиния,sclerotinia'),
 3, 'Фонталис', 'боскалид', 'SDHI-фунгицид', '0.75 кг/га', 0.75, 'BBCH 51–65', 30);

-- Кила крестоцветных
INSERT INTO disease_product_recommendations (keywords, op_type, op_label, op_color, op_emoji, reason) VALUES
('кила крестоцветных,кила рапса,кила', 'FUNGICIDE', 'Фунгицид', '#a855f7', '🍄',
 'Кила крестоцветных (Plasmodiophora brassicae) — почвенный патоген, поражает корни рапса. Химическое лечение ограничено.');

INSERT INTO disease_product_items (recommendation_id, sort_order, name, active_ingredient, mechanism, dose, dose_value, timing, phi_days) VALUES
((SELECT id FROM disease_product_recommendations WHERE keywords = 'кила крестоцветных,кила рапса,кила'),
 1, 'Превикур Энерджи', 'фосетил + пропамокарб', 'CAA-фунгицид', '3.0 л/га (полив)', 3.0, 'Почвенный полив до посева или по всходам BBCH 10–14', 14),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'кила крестоцветных,кила рапса,кила'),
 2, 'Известь (CaCO₃)', 'кальций карбонат', 'pH-коррекция почвы', '4–6 т/га', 5.0, 'Осенняя обработка под вспашку, pH <6.5', 0);

-- Аскохитоз гороха
INSERT INTO disease_product_recommendations (keywords, op_type, op_label, op_color, op_emoji, reason) VALUES
('аскохитоз', 'FUNGICIDE', 'Фунгицид', '#a855f7', '🍄',
 'Аскохитоз гороха (Ascochyta pisi / Didymella pinodes) — поражает листья, стебли и бобы при влажной погоде.');

INSERT INTO disease_product_items (recommendation_id, sort_order, name, active_ingredient, mechanism, dose, dose_value, timing, phi_days) VALUES
((SELECT id FROM disease_product_recommendations WHERE keywords = 'аскохитоз'),
 1, 'Дерозал', 'карбендазим', 'MBC-фунгицид', '0.5 л/га', 0.5, 'BBCH 14–65, при появлении симптомов', 14),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'аскохитоз'),
 2, 'Оперкот', 'ципродинил', 'AnilinoPyrimidine', '0.75 кг/га', 0.75, 'BBCH 21–65', 21),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'аскохитоз'),
 3, 'Свитч', 'ципродинил + флудиоксонил', 'AnilinoPyrimidine + PP', '0.6 кг/га', 0.6, 'BBCH 21–65', 7);

-- Антракноз льна
INSERT INTO disease_product_recommendations (keywords, op_type, op_label, op_color, op_emoji, reason) VALUES
('антракноз', 'FUNGICIDE', 'Фунгицид', '#a855f7', '🍄',
 'Антракноз льна (Colletotrichum lini) — поражает проростки, стебли и коробочки при тёплой влажной погоде.');

INSERT INTO disease_product_items (recommendation_id, sort_order, name, active_ingredient, mechanism, dose, dose_value, timing, phi_days) VALUES
((SELECT id FROM disease_product_recommendations WHERE keywords = 'антракноз'),
 1, 'Дивиденд Стар', 'дифеноконазол + ципроконазол', 'DMI-ингибитор (протравитель)', '1.0 л/т', 1.0, 'Протравливание семян', 0),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'антракноз'),
 2, 'Дерозал', 'карбендазим', 'MBC-фунгицид', '0.5 л/га', 0.5, 'BBCH 10–30, по вегетации', 14);

-- Фитофтороз
INSERT INTO disease_product_recommendations (keywords, op_type, op_label, op_color, op_emoji, reason) VALUES
('фитофтороз', 'FUNGICIDE', 'Фунгицид', '#a855f7', '🍄',
 'Фитофтороз (Phytophthora infestans) — наиболее опасное заболевание картофеля. Может уничтожить весь урожай за 7-10 дней.');

INSERT INTO disease_product_items (recommendation_id, sort_order, name, active_ingredient, mechanism, dose, dose_value, timing, phi_days) VALUES
((SELECT id FROM disease_product_recommendations WHERE keywords = 'фитофтороз'),
 1, 'Ридомил Голд', 'металаксил-М + манкоцеб', 'CAA + дитиокарбамат', '2.5 кг/га', 2.5, 'Профилактически каждые 7-10 дней, BBCH 19+', 21),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'фитофтороз'),
 2, 'Ревус', 'мандипропамид', 'CAA-фунгицид', '0.6 л/га', 0.6, 'BBCH 19–69, системный защитный', 3),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'фитофтороз'),
 3, 'Ширлан', 'флуазинам', 'DNI-фунгицид', '0.4 л/га', 0.4, 'BBCH 29–69, контактный', 14);

-- ГЕРБИЦИДЫ

INSERT INTO disease_product_recommendations (keywords, op_type, op_label, op_color, op_emoji, reason) VALUES
('сорняки,злаковые сорняки,овсюг', 'HERBICIDE', 'Гербицид', '#22c55e', '🌿',
 'Злаковые сорняки (овсюг, пырей, просо куриное) — снижают урожай зерновых на 15-30%.');

INSERT INTO disease_product_items (recommendation_id, sort_order, name, active_ingredient, mechanism, dose, dose_value, timing, phi_days) VALUES
((SELECT id FROM disease_product_recommendations WHERE keywords = 'сорняки,злаковые сорняки,овсюг'),
 1, 'Пума Супер', 'феноксапроп-П-этил', 'АПФаза-ингибитор', '1.0 л/га', 1.0, 'BBCH 21–39 культуры, 11–22 сорняка', 50),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'сорняки,злаковые сорняки,овсюг'),
 2, 'Ластик Топ', 'клодинафоп-пропаргил + клоквинтосет', 'АПФаза-ингибитор', '0.4 л/га', 0.4, 'BBCH 21–32', 50);

INSERT INTO disease_product_recommendations (keywords, op_type, op_label, op_color, op_emoji, reason) VALUES
('двудольные сорняки,осот,ромашка,вьюнок', 'HERBICIDE', 'Гербицид', '#22c55e', '🌿',
 'Двудольные сорняки (осот, ромашка, пикульник, горчица) — угнетают культуру на ранних фазах развития.');

INSERT INTO disease_product_items (recommendation_id, sort_order, name, active_ingredient, mechanism, dose, dose_value, timing, phi_days) VALUES
((SELECT id FROM disease_product_recommendations WHERE keywords = 'двудольные сорняки,осот,ромашка,вьюнок'),
 1, 'Секатор Турбо', 'амидосульфурон + йодосульфурон + мефенпир', 'ALS-ингибитор', '0.1 л/га', 0.1, 'BBCH 21–30', 50),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'двудольные сорняки,осот,ромашка,вьюнок'),
 2, 'Балерина', '2,4-Д + флорасулам', 'ALS + синтетический ауксин', '0.4 л/га', 0.4, 'BBCH 21–32', 60);

-- ИНСЕКТИЦИДЫ

INSERT INTO disease_product_recommendations (keywords, op_type, op_label, op_color, op_emoji, reason) VALUES
('тля,гороховая тля,злаковая тля', 'INSECTICIDE', 'Инсектицид', '#f97316', '🐛',
 'Тля (Acyrthosiphon, Sitobion) — высасывает сок из растений, переносит вирусы, вызывает скручивание листьев.');

INSERT INTO disease_product_items (recommendation_id, sort_order, name, active_ingredient, mechanism, dose, dose_value, timing, phi_days) VALUES
((SELECT id FROM disease_product_recommendations WHERE keywords = 'тля,гороховая тля,злаковая тля'),
 1, 'Каратэ Зеон', 'лямбда-цигалотрин', 'пиретроид', '0.15 л/га', 0.15, 'При достижении ЭПВ (> 30 тлей/стебель)', 20),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'тля,гороховая тля,злаковая тля'),
 2, 'Актара', 'тиаметоксам', 'неоникотиноид', '0.1 кг/га', 0.1, 'При массовом заселении', 14),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'тля,гороховая тля,злаковая тля'),
 3, 'Би-58 Новый', 'диметоат', 'ФОС', '1.0 л/га', 1.0, 'BBCH 25–71', 30);

INSERT INTO disease_product_recommendations (keywords, op_type, op_label, op_color, op_emoji, reason) VALUES
('пьявица,вредная черепашка,блошки', 'INSECTICIDE', 'Инсектицид', '#f97316', '🐛',
 'Листогрызущие вредители (пьявица, черепашка, крестоцветные блошки) — наносят критичные повреждения в фазе всходов и кущения.');

INSERT INTO disease_product_items (recommendation_id, sort_order, name, active_ingredient, mechanism, dose, dose_value, timing, phi_days) VALUES
((SELECT id FROM disease_product_recommendations WHERE keywords = 'пьявица,вредная черепашка,блошки'),
 1, 'Борей', 'тиаметоксам + лямбда-цигалотрин', 'неоникотиноид + пиретроид', '0.1 л/га', 0.1, 'BBCH 11–22, при превышении ЭПВ', 20),
((SELECT id FROM disease_product_recommendations WHERE keywords = 'пьявица,вредная черепашка,блошки'),
 2, 'Децис Профи', 'дельтаметрин', 'пиретроид', '0.03 кг/га', 0.03, 'BBCH 11–45', 20);
