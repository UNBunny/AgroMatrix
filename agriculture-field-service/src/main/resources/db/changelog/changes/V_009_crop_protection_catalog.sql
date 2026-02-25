-- V_009_crop_protection_catalog.sql
-- Каталог защиты растений от болезней и вредоносных патогенов (грибные и иные)
-- Документация: Препараты, химические группы, действующие вещества, концентрация, протоколы, нормы расхода
-- FRAC-классификация, стрессовые периоды по BBCH, температурные оптимумы обработки

-- ПШЕНИЦА / ЯЧМЕНЬ (spring_wheat, winter_wheat, spring_barley)

-- 1. Бурая ржавчина листьев (Puccinia triticina)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('spring_wheat','Бурая ржавчина листьев','Puccinia triticina','FUNGAL',
   'Фалькон','Стробилурины','G1','пропиконазол 250 г/л','250 г/л',
   'FUNGICIDE',37,65,'Обработка при первых признаках на нижних листьях',
   '0.5 л/га',0.5,'л/га', 8.0,16.0,25.0, 30,'DMI-ингибитор; защита и системное действие'),
  ('spring_wheat','Бурая ржавчина листьев','Puccinia triticina','FUNGAL',
   'Колосаль Про','Стробилурины + Стробилурины','G1+C3','тебуконазол 200 + крезоксим-метил 100 г/л','200+100 г/л',
   'FUNGICIDE',37,65,NULL,
   '0.4 л/га',0.4,'л/га', 5.0,15.0,25.0, 30,'Смешанное защитное действие за счёт стробилурина'),
  ('spring_wheat','Бурая ржавчина листьев','Puccinia triticina','FUNGAL',
   'Амистар Экстра','Стробилурины + Стробилурины','C3+G1','азоксистробин 200 + ципроконазол 80 г/л','200+80 г/л',
   'FUNGICIDE',32,65,'Профилактическое применение при симптомах',
   '0.75 л/га',0.75,'л/га', 5.0,18.0,25.0, 35,NULL),
  ('winter_wheat','Бурая ржавчина листьев','Puccinia triticina','FUNGAL',
   'Фалькон','Стробилурины','G1','пропиконазол 250 г/л','250 г/л',
   'FUNGICIDE',37,65,NULL,
   '0.5 л/га',0.5,'л/га', 8.0,16.0,25.0, 30,NULL),
  ('winter_wheat','Бурая ржавчина листьев','Puccinia triticina','FUNGAL',
   'Колосаль Про','Стробилурины + Стробилурины','G1+C3','тебуконазол 200 + крезоксим-метил 100 г/л','200+100 г/л',
   'FUNGICIDE',37,65,NULL,
   '0.4 л/га',0.4,'л/га', 5.0,15.0,25.0, 30,NULL),
  ('spring_barley','Бурая ржавчина листьев','Puccinia hordei','FUNGAL',
   'Фалькон','Стробилурины','G1','пропиконазол 250 г/л','250 г/л',
   'FUNGICIDE',37,65,NULL,
   '0.5 л/га',0.5,'л/га', 8.0,16.0,25.0, 30,NULL);

-- 2. Септориоз (Septoria tritici / nodorum)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('spring_wheat','Септориоз','Septoria tritici','FUNGAL',
   'Фалькон','DMI + Морфолины','G1+C5','спироксамин + тебуконазол + тритиконазол','стандартная',
   'FUNGICIDE',37,59,'При поражении флагового листа на 1-2 листа снизу',
   '0.6 л/га',0.6,'л/га', 8.0,15.0,25.0, 28,'Профилактика совмещается с инсектицидной обработкой стеблевых болезней'),
  ('spring_wheat','Септориоз','Septoria tritici','FUNGAL',
   'Стозар','Стробилурины','G1','пропиконазол + тебуконазол','стандартная',
   'FUNGICIDE',37,65,NULL,
   '0.8 л/га',0.8,'л/га', 8.0,16.0,25.0, 28,'Пропиконазол является наиболее эффективным против Septoria'),
  ('winter_wheat','Септориоз','Septoria tritici','FUNGAL',
   'Стозар','Стробилурины','G1','пропиконазол + тебуконазол','стандартная',
   'FUNGICIDE',37,65,NULL,
   '0.8 л/га',0.8,'л/га', 8.0,16.0,25.0, 28,NULL),
  ('winter_wheat','Септориоз','Septoria tritici','FUNGAL',
   'Фалькон','DMI + Морфолины','G1+C5','спироксамин + тебуконазол + тритиконазол','стандартная',
   'FUNGICIDE',37,59,NULL,
   '0.6 л/га',0.6,'л/га', 8.0,15.0,25.0, 28,NULL);

-- 3. Фузариоз колоса (Fusarium graminearum)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('spring_wheat','Фузариоз колоса','Fusarium graminearum','FUNGAL',
   'Стозар','Стробилурины','G1','пропиконазол + тебуконазол','стандартная',
   'FUNGICIDE',61,65,'Обработка совпадает с цветением (1-3 дня от начала антезиса)',
   '0.8 л/га',0.8,'л/га', 10.0,18.0,25.0, 28,'Критично для снижения микотоксинов (ДОН) и зерна'),
  ('spring_wheat','Фузариоз колоса','Fusarium graminearum','FUNGAL',
   'Фолликур','Стробилурины','G1','тебуконазол 250 г/л','250 г/л',
   'FUNGICIDE',59,65,NULL,
   '1.0 л/га',1.0,'л/га', 8.0,16.0,25.0, 28,NULL),
  ('winter_wheat','Фузариоз колоса','Fusarium graminearum','FUNGAL',
   'Стозар','Стробилурины','G1','пропиконазол + тебуконазол','стандартная',
   'FUNGICIDE',61,65,'Обработка в период цветения',
   '0.8 л/га',0.8,'л/га', 10.0,18.0,25.0, 28,NULL);

-- 4. Мучнистая роса (Blumeria graminis)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('spring_wheat','Мучнистая роса','Blumeria graminis','FUNGAL',
   'Топаз','Стробилурины','G1','пенконазол 100 г/л','100 г/л',
   'FUNGICIDE',30,55,'При первых признаках белого мучнистого налёта',
   '0.5 л/га',0.5,'л/га', 8.0,16.0,25.0, 30,NULL),
  ('spring_barley','Мучнистая роса','Blumeria graminis','FUNGAL',
   'Топаз','Стробилурины','G1','пенконазол 100 г/л','100 г/л',
   'FUNGICIDE',30,55,NULL,
   '0.5 л/га',0.5,'л/га', 8.0,16.0,25.0, 30,NULL),
  ('spring_barley','Мучнистая роса','Blumeria graminis','FUNGAL',
   'Фалькон','DMI + Морфолины','G1+C5','спироксамин + тебуконазол + тритиконазол','стандартная',
   'FUNGICIDE',30,55,NULL,
   '0.6 л/га',0.6,'л/га', 8.0,15.0,25.0, 28,NULL);

-- 5. Сетчатая пятнистость ячменя (Pyrenophora teres)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('spring_barley','Сетчатая пятнистость','Pyrenophora teres','FUNGAL',
   'Стозар','Стробилурины','G1','пропиконазол + тебуконазол','стандартная',
   'FUNGICIDE',32,55,'При поражении >10% листьев поцентной',
   '0.8 л/га',0.8,'л/га', 8.0,16.0,25.0, 28,NULL),
  ('spring_barley','Сетчатая пятнистость','Pyrenophora teres','FUNGAL',
   'Амистар Экстра','Стробилурины + Стробилурины','C3+G1','азоксистробин + ципроконазол','стандартная',
   'FUNGICIDE',32,59,NULL,
   '0.75 л/га',0.75,'л/га', 5.0,18.0,25.0, 35,NULL);

-- ПОДСОЛНЕЧНИК (sunflower)

-- 6. Ложная мучнистая роса подсолнечника (Plasmopara halstedii)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('sunflower','Ложная мучнистая роса','Plasmopara halstedii','FUNGAL',
   'Апрон Голд','Фенилпиридины (CAA)','4','мефеноксам-Na 350 г/кг','350 г/кг',
   'SEED_TREATMENT',0,0,'Протравливание семян от основного сорта',
   '2.5 г/кг',2.5,'г/кг', 5.0,12.0,18.0, 0,'Только протравители; защита на целый период цикла'),
  ('sunflower','Ложная мучнистая роса','Plasmopara halstedii','FUNGAL',
   'Ридомил Голд','Фенилпиридины + Дитиокарбаматы','4+M3','мефеноксам-Na 40 + манкоцеб 640 г/кг','40+640 г/кг',
   'FUNGICIDE',12,30,'Профилактические обработки при прохождении T<18°C',
   '2.5 кг/га',2.5,'кг/га', 5.0,14.0,18.0, 21,NULL),
  ('sunflower','Ложная мучнистая роса','Plasmopara halstedii','FUNGAL',
   'Стецин Энтежи','Карбаматы (CAA)','P07+BM01','фосетил-Al + пропамокарб','310+530 г/л',
   'FUNGICIDE',10,30,NULL,
   '1.5 л/га',1.5,'л/га', 8.0,14.0,20.0, 14,NULL);

-- 7. Ржавчина подсолнечника (Puccinia helianthi)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('sunflower','Ржавчина подсолнечника','Puccinia helianthi','FUNGAL',
   'Фалькон','Стробилурины','G1','пропиконазол 250 г/л','250 г/л',
   'FUNGICIDE',51,65,'При поражении первых устойчивых',
   '0.5 л/га',0.5,'л/га', 10.0,20.0,28.0, 30,NULL),
  ('sunflower','Ржавчина подсолнечника','Puccinia helianthi','FUNGAL',
   'Амистар Экстра','Стробилурины + Стробилурины','C3+G1','азоксистробин + ципроконазол','200+80 г/л',
   'FUNGICIDE',51,65,NULL,
   '0.75 л/га',0.75,'л/га', 5.0,18.0,25.0, 35,NULL);

-- 8. Белая гниль подсолнечника (Sclerotinia sclerotiorum)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('sunflower','Белая гниль','Sclerotinia sclerotiorum','FUNGAL',
   'Контанс WG','Биофунгицид','BM02','Coniothyrium minitans 10^9 КОЕ/г','',
   'SOIL_APPLICATION',0,0,'Внесение в почву за 3-4 месяца до посева',
   '2 кг/га',2.0,'кг/га', 5.0,15.0,25.0, 0,'Биологический метод снижения запаса склероциев в почве'),
  ('sunflower','Белая гниль','Sclerotinia sclerotiorum','FUNGAL',
   'Скала','SDHI','E','ипродион 500 г/л','500 г/л',
   'FUNGICIDE',51,65,'В начале цветения от опережающего распространения',
   '1.0 л/га',1.0,'л/га', 8.0,15.0,22.0, 42,NULL);

-- КУКУРУЗА (corn)

-- 9. Пузырчатая головня кукурузы (Ustilago maydis)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('corn','Пузырчатая головня кукурузы','Ustilago maydis','FUNGAL',
   'Дивиденд Стар','Стробилурины','G1','дифеноконазол + ципроконазол','37+16 г/л',
   'SEED_TREATMENT',0,0,'Протравливание семян для снижения системных инфекций головни',
   '1.0 л/кг',1.0,'л/кг', 5.0,15.0,25.0, 0,'Только протравители длительной и системной защиты'),
  ('corn','Пузырчатая головня кукурузы','Ustilago maydis','FUNGAL',
   'Максим XL','Фенилпирол + Стробилурины','12+G1','флудиоксонил + мефеноксам','25+10 г/л',
   'SEED_TREATMENT',0,0,NULL,
   '1.0 л/кг',1.0,'л/кг', 5.0,15.0,25.0, 0,NULL);

-- 10. Фузариоз початка (Fusarium verticillioides)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('corn','Фузариоз початка','Fusarium verticillioides','FUNGAL',
   'Стозар','Стробилурины','G1','пропиконазол + тебуконазол','стандартная',
   'FUNGICIDE',61,69,'При появлении влажного початка в период налив-уборка',
   '0.8 л/га',0.8,'л/га', 10.0,18.0,28.0, 28,'Обработка через 3-5 дней после начала шёлковых нитей'),
  ('corn','Фузариоз початка','Fusarium verticillioides','FUNGAL',
   'Амистар Экстра','Стробилурины + Стробилурины','C3+G1','азоксистробин + ципроконазол','200+80 г/л',
   'FUNGICIDE',59,75,NULL,
   '0.75 л/га',0.75,'л/га', 5.0,18.0,28.0, 35,NULL);

-- ГОРОХ (peas)

-- 11. Аскохитоз гороха (Ascochyta pisi)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('peas','Аскохитоз','Ascochyta pisi','FUNGAL',
   'Дерозал','MBC-Фунгициды','B1','карбендазим 500 г/л','500 г/л',
   'FUNGICIDE',14,65,'При появлении симптомов на листьях и каймы',
   '0.5 л/га',0.5,'л/га', 8.0,18.0,25.0, 14,NULL),
  ('peas','Аскохитоз','Ascochyta pisi','FUNGAL',
   'Свитч','Фенилпирол + AnilinoPyrimidine','12+9','флудиоксонил + ципродинил','стандартная',
   'FUNGICIDE',21,65,NULL,
   '0.6 кг/га',0.6,'кг/га', 5.0,16.0,25.0, 7,NULL);

-- 12. Корневые гнили гороха (Fusarium, Pythium)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('peas','Корневые гнили гороха','Fusarium oxysporum','FUNGAL',
   'Максим','Фенилпирол','12','флудиоксонил 25 г/л','25 г/л',
   'SEED_TREATMENT',0,0,'Протравливание семян перед посевом',
   '1.0 л/кг',1.0,'л/кг', 5.0,15.0,25.0, 0,'Контактный протравитель, защита от почвенных патогенов'),
  ('peas','Корневые гнили гороха','Pythium spp.','FUNGAL',
   'Стецин Энтежи','Карбаматы (CAA)','P07+BM01','фосетил-Al + пропамокарб','310+530 г/л',
   'SEED_TREATMENT',0,0,NULL,
   '3.0 л/кг',3.0,'л/кг', 5.0,15.0,25.0, 0,'Эффективная защита от оомицетов (Pythium, Phytophthora)');

-- СОЯ (soybean)

-- 13. Ложная мучнистая роса сои (Peronospora manshurica)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('soybean','Ложная мучнистая роса сои','Peronospora manshurica','FUNGAL',
   'Апрон Голд','Фенилпиридины (CAA)','4','мефеноксам-Na 350 г/кг','350 г/кг',
   'SEED_TREATMENT',0,0,'Протравливание семян от основного начального источника',
   '5.0 г/кг',5.0,'г/кг', 5.0,15.0,22.0, 0,'Только протравители; защита на целый начальный период'),
  ('soybean','Ложная мучнистая роса сои','Peronospora manshurica','FUNGAL',
   'Ридомил Голд','Фенилпиридины + Дитиокарбаматы','4+M3','мефеноксам-Na + манкоцеб','40+640 г/кг',
   'FUNGICIDE',10,30,'Профилактические обработки при прохождении T=15-22°C',
   '2.5 кг/га',2.5,'кг/га', 8.0,16.0,22.0, 21,NULL);

-- 14. Фитофтороз сои (Phytophthora sojae)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('soybean','Фитофтороз сои','Phytophthora sojae','FUNGAL',
   'Стецин Энтежи','Карбаматы (CAA)','P07+BM01','фосетил-Al + пропамокарб','310+530 г/л',
   'SEED_TREATMENT',0,0,'Протравливание семян при стрессовых условиях',
   '5.0 л/кг',5.0,'л/кг', 5.0,15.0,25.0, 0,'Устойчивые сорта снижают эффективность Phytophthora при смене'),
  ('soybean','Белая гниль сои','Sclerotinia sclerotiorum','FUNGAL',
   'Контанс WG','Биофунгицид','BM02','Coniothyrium minitans','',
   'SOIL_APPLICATION',0,0,'Внесение в почву за 3-4 месяца до посева',
   '2 кг/га',2.0,'кг/га', 5.0,15.0,25.0, 0,'Биологический метод снижения склероциев в почве');

-- РАПС (rapeseed)

-- 15. Кила крестоцветных (Plasmodiophora brassicae)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('rapeseed','Кила крестоцветных','Plasmodiophora brassicae','FUNGAL',
   'Стецин Энтежи','Карбаматы (CAA)','P07+BM01','фосетил-Al + пропамокарб','310+530 г/л',
   'FUNGICIDE',10,14,'Почвенное применение при признаках на заражённых полях',
   '3.0 л/га',3.0,'л/га', 8.0,18.0,25.0, 14,'Рекомендуется лимирование почвы; кислотность от pH>7');

-- 16. Белая гниль рапса (Sclerotinia sclerotiorum)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('rapeseed','Белая гниль рапса','Sclerotinia sclerotiorum','FUNGAL',
   'Фонталис','SDHI','7','боскалид 50%','50%',
   'FUNGICIDE',53,65,'В период бутонизации-начала цветения',
   '0.5 кг/га',0.5,'кг/га', 8.0,15.0,22.0, 30,NULL),
  ('rapeseed','Белая гниль рапса','Sclerotinia sclerotiorum','FUNGAL',
   'Скала','SDHI','E','ипродион 500 г/л','500 г/л',
   'FUNGICIDE',53,65,'Профилактические обработки при пожелтевших дождях в период цветения',
   '1.0 л/га',1.0,'л/га', 8.0,15.0,22.0, 42,NULL);

-- 17. Фомоз рапса (Leptosphaeria maculans)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('rapeseed','Фомоз','Leptosphaeria maculans','FUNGAL',
   'Стозар','Стробилурины','G1','пропиконазол + тебуконазол','стандартная',
   'FUNGICIDE',14,65,'При поражении >10% стеблей для коды в стебле болезни',
   '0.8 л/га',0.8,'л/га', 8.0,15.0,22.0, 28,NULL),
  ('rapeseed','Фомоз','Leptosphaeria maculans','FUNGAL',
   'Колосаль Про','Стробилурины + Стробилурины','G1+C3','тебуконазол + крезоксим-метил','стандартная',
   'FUNGICIDE',14,65,NULL,
   '0.4 л/га',0.4,'л/га', 8.0,15.0,22.0, 30,NULL);

-- ГРЕЧИХА (buckwheat)

-- 18. Антракноз гречихи (Colletotrichum fagopyri)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('buckwheat','Антракноз гречихи','Colletotrichum fagopyri','FUNGAL',
   'Дерозал','MBC-Фунгициды','B1','карбендазим 500 г/л','500 г/л',
   'FUNGICIDE',10,51,'При появлении симптомов на листьях и стеблях на стеблях',
   '0.5 л/га',0.5,'л/га', 12.0,22.0,28.0, 14,'Применяется в устойчивые/ценностные сезоны, T не выше 25°C');

-- 19. Серая гниль гречихи (Botrytis cinerea)
INSERT INTO crop_protection_catalog
  (crop_code, disease_name, pathogen_latin, disease_type,
   product_name, frac_group, frac_code, active_ingredients, ai_concentration,
   application_type, bbch_from, bbch_to, bbch_note,
   dose_rate, dose_value, dose_unit, temp_min_c, temp_opt_c, temp_max_c, phi_days, notes)
VALUES
  ('buckwheat','Серая гниль','Botrytis cinerea','FUNGAL',
   'Свитч','Фенилпирол + AnilinoPyrimidine','12+9','флудиоксонил + ципродинил','стандартная',
   'FUNGICIDE',51,69,'В период цветения-налива при влажных условиях',
   '0.6 кг/га',0.6,'кг/га', 5.0,15.0,22.0, 7,NULL);
