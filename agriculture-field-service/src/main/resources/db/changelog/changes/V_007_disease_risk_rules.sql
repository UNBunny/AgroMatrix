-- 1. Бурая ржавчина пшеницы (Puccinia triticina)
INSERT INTO disease_risk_rules (disease_name, disease_type, affected_crops, risk_level, risk_weight,
    temp_min_threshold, temp_max_threshold, precip_min7d, gtk_min, active_season,
    rule_description, prevention_advice, treatment_advice, urgency_days)
VALUES ('Бурая ржавчина', 'FUNGAL', 'пшеница,пшеница озимая,пшеница яровая',
    'HIGH', 0.85, 15.0, 22.0, 10.0, 1.0, '5,6,7,8',
    'T=15-22°C, осадки >10мм/нед, ГТК >1.0 — идеальные условия для бурой ржавчины',
    'Профилактическая обработка фунгицидом (триазолы) при первых признаках. Используйте устойчивые сорта.',
    'Обработка Пропиконазол 250 г/л или Тебуконазол 250 г/л. Повторная обработка через 14 дней.', 5);

-- 2. Септориоз листьев (Septoria tritici)
INSERT INTO disease_risk_rules (disease_name, disease_type, affected_crops, risk_level, risk_weight,
    temp_min_threshold, temp_max_threshold, precip_min7d, gtk_min, active_season,
    rule_description, prevention_advice, treatment_advice, urgency_days)
VALUES ('Септориоз', 'FUNGAL', 'пшеница,пшеница озимая,пшеница яровая,ячмень',
    'HIGH', 0.80, 15.0, 20.0, 30.0, 1.5, '5,6,7',
    'T=15-20°C, обильные осадки >30мм/нед, высокий ГТК — благоприятные условия для септориоза',
    'Протравливание семян, соблюдение севооборота. Обработка фунгицидами в фазу кущения.',
    'Применение стробилуринов (Азоксистробин) или комбинированных препаратов (Амистар Экстра).', 7);

-- 3. Фузариоз колоса (Fusarium graminearum) — критичен при цветении
INSERT INTO disease_risk_rules (disease_name, disease_type, affected_crops, risk_level, risk_weight,
    temp_min_threshold, temp_max_threshold, precip_min7d, gtk_min, active_season,
    rule_description, prevention_advice, treatment_advice, urgency_days)
VALUES ('Фузариоз колоса', 'FUNGAL', 'пшеница,пшеница озимая,пшеница яровая,ячмень',
    'CRITICAL', 0.90, 15.0, 25.0, 15.0, 1.2, '6,7',
    'T=15-25°C, осадки в период цветения >15мм — высокий риск фузариоза колоса',
    'Протравливание семян фунгицидами. Избегайте посева пшеницы после кукурузы. Используйте устойчивые сорта.',
    'Обработка Тебуконазол + Протиоконазол в фазу цветения. Критично обработать в первые 3 дня!', 3);

-- 4. Мучнистая роса (Blumeria graminis)
INSERT INTO disease_risk_rules (disease_name, disease_type, affected_crops, risk_level, risk_weight,
    temp_min_threshold, temp_max_threshold, precip_min7d, humidity_min_threshold, active_season,
    rule_description, prevention_advice, treatment_advice, urgency_days)
VALUES ('Мучнистая роса', 'FUNGAL', 'пшеница,ячмень,овёс',
    'MEDIUM', 0.65, 12.0, 20.0, 5.0, 80.0, '5,6,7',
    'T=12-20°C, умеренные осадки, влажность >80% — условия для мучнистой росы',
    'Устойчивые сорта. Избегайте загущенных посевов. Азотные удобрения — умеренно.',
    'Обработка серосодержащими фунгицидами или триазолами.', 10);

-- 5. Пероноспороз подсолнечника (Plasmopara halstedii)
INSERT INTO disease_risk_rules (disease_name, disease_type, affected_crops, risk_level, risk_weight,
    temp_min_threshold, temp_max_threshold, precip_min7d, gtk_min, active_season,
    rule_description, prevention_advice, treatment_advice, urgency_days)
VALUES ('Пероноспороз', 'FUNGAL', 'подсолнечник',
    'HIGH', 0.75, 10.0, 18.0, 20.0, 1.5, '5,6,7',
    'T=10-18°C, обильные осадки, высокий ГТК — благоприятные условия для пероноспороза',
    'Протравливание семян Мефеноксам. Севооборот: не сеять подсолнечник чаще 1 раза в 4 года.',
    'Системные фунгициды на основе Металаксил-М. Удалить поражённые растения.', 5);

-- 6. Пероноспороз сои (Peronospora manshurica)
INSERT INTO disease_risk_rules (disease_name, disease_type, affected_crops, risk_level, risk_weight,
    temp_min_threshold, temp_max_threshold, precip_min7d, humidity_min_threshold, active_season,
    rule_description, prevention_advice, treatment_advice, urgency_days)
VALUES ('Пероноспороз сои', 'FUNGAL', 'соя',
    'HIGH', 0.80, 15.0, 22.0, 15.0, 80.0, '6,7,8',
    'T=15-22°C, влажность >80%, обильные осадки — оптимальные условия для пероноспороза сои',
    'Протравливание семян Металаксил-М. Соблюдайте севооборот — не сеять сою чаще 1 раза в 3 года.',
    'Обработка препаратами на основе Металаксил-М или Фозетил-Al. Удалить поражённые растения.', 5);

-- 7. Фузариозное увядание сои (Fusarium oxysporum)
INSERT INTO disease_risk_rules (disease_name, disease_type, affected_crops, risk_level, risk_weight,
    temp_min_threshold, temp_max_threshold, precip_min7d, gtk_min, active_season,
    rule_description, prevention_advice, treatment_advice, urgency_days)
VALUES ('Фузариозное увядание сои', 'FUNGAL', 'соя',
    'HIGH', 0.75, 22.0, 30.0, 10.0, 0.8, '6,7,8',
    'T=22-30°C, умеренное увлажнение — условия для фузариозного увядания сои',
    'Протравливание семян, устойчивые сорта. Дренаж переувлажнённых участков.',
    'Обработка биопрепаратами Триходермин. Химические фунгициды малоэффективны при увядании.', 7);

-- 8. Белая гниль рапса (Sclerotinia sclerotiorum)
INSERT INTO disease_risk_rules (disease_name, disease_type, affected_crops, risk_level, risk_weight,
    temp_min_threshold, temp_max_threshold, precip_min7d, gtk_min, active_season,
    rule_description, prevention_advice, treatment_advice, urgency_days)
VALUES ('Белая гниль рапса', 'FUNGAL', 'рапс',
    'HIGH', 0.80, 10.0, 20.0, 25.0, 1.3, '5,6,7',
    'T=10-20°C, обильные осадки в период цветения — условия для белой гнили рапса',
    'Севооборот 4-5 лет. Не сеять рапс после подсолнечника и гороха.',
    'Фунгициды боскалид или ципродинил в период бутонизации–цветения.', 5);

-- 9. Кила крестоцветных (Plasmodiophora brassicae) — рапс
INSERT INTO disease_risk_rules (disease_name, disease_type, affected_crops, risk_level, risk_weight,
    temp_min_threshold, temp_max_threshold, precip_min7d, active_season,
    rule_description, prevention_advice, treatment_advice, urgency_days)
VALUES ('Кила крестоцветных', 'FUNGAL', 'рапс',
    'CRITICAL', 0.85, 15.0, 25.0, 20.0, '4,5,6',
    'T=15-25°C, кислые почвы (pH<6.5), повышенная влажность — риск килы крестоцветных',
    'Известкование до pH>7.0. Севооборот 6-7 лет. Устойчивые гибриды (CR-гибриды).',
    'Химическое лечение ограничено. Превикур Энерджи — при почвенном поливе до посева.', 14);

-- 10. Аскохитоз гороха (Ascochyta pisi)
INSERT INTO disease_risk_rules (disease_name, disease_type, affected_crops, risk_level, risk_weight,
    temp_min_threshold, temp_max_threshold, precip_min7d, humidity_min_threshold, active_season,
    rule_description, prevention_advice, treatment_advice, urgency_days)
VALUES ('Аскохитоз гороха', 'FUNGAL', 'горох',
    'HIGH', 0.75, 15.0, 22.0, 20.0, 75.0, '5,6,7',
    'T=15-22°C, повышенная влажность, частые осадки — условия для аскохитоза',
    'Протравливание семян. Севооборот. Уничтожение послеуборочных остатков.',
    'Фунгициды на основе ципродинила или боскалида при первых симптомах.', 7);

-- 11. Корневые гнили злаков (Bipolaris sorokiniana)
INSERT INTO disease_risk_rules (disease_name, disease_type, affected_crops, risk_level, risk_weight,
    temp_min_threshold, temp_max_threshold, precip_min7d, gtk_min, active_season,
    rule_description, prevention_advice, treatment_advice, urgency_days)
VALUES ('Корневые гнили', 'FUNGAL', 'ячмень,пшеница,овёс',
    'MEDIUM', 0.65, 10.0, 22.0, 20.0, 1.3, '4,5,6',
    'T=10-22°C, избыток влаги в почве — благоприятные условия для корневых гнилей',
    'Протравливание семян (Тирам, Карбендазим). Севооборот — не сейте зерновые после зерновых.',
    'Обработка фунгицидами по вегетации. Применение биопрепаратов (Триходерма).', 7);

-- 12. Антракноз льна (Colletotrichum lini)
INSERT INTO disease_risk_rules (disease_name, disease_type, affected_crops, risk_level, risk_weight,
    temp_min_threshold, temp_max_threshold, precip_min7d, humidity_min_threshold, active_season,
    rule_description, prevention_advice, treatment_advice, urgency_days)
VALUES ('Антракноз льна', 'FUNGAL', 'лён',
    'HIGH', 0.75, 20.0, 28.0, 15.0, 70.0, '6,7',
    'T=20-28°C, повышенная влажность — условия для антракноза льна',
    'Протравливание семян. Не сеять лён чаще 1 раза в 5-7 лет на одном поле.',
    'Фунгициды карбендазим, тиофанат-метил в начале вегетации.', 7);

-- 13. Фитофтороз (Phytophthora infestans)
INSERT INTO disease_risk_rules (disease_name, disease_type, affected_crops, risk_level, risk_weight,
    temp_min_threshold, temp_max_threshold, precip_min7d, gtk_min, active_season,
    rule_description, prevention_advice, treatment_advice, urgency_days)
VALUES ('Фитофтороз', 'FUNGAL', 'картофель',
    'CRITICAL', 0.90, 12.0, 20.0, 20.0, 1.5, '6,7,8',
    'T=12-20°C, высокая влажность и осадки — экстремальный риск фитофтороза',
    'Профилактическое опрыскивание контактными фунгицидами (Манкоцеб) до появления признаков.',
    'Системные фунгициды (Ридомил Голд). Обработка каждые 7-10 дней. Уничтожение ботвы перед уборкой.', 3);

-- 14. Ржавчина подсолнечника (Puccinia helianthi)
INSERT INTO disease_risk_rules (disease_name, disease_type, affected_crops, risk_level, risk_weight,
    temp_min_threshold, temp_max_threshold, precip_min7d, active_season,
    rule_description, prevention_advice, treatment_advice, urgency_days)
VALUES ('Ржавчина подсолнечника', 'FUNGAL', 'подсолнечник',
    'MEDIUM', 0.60, 18.0, 28.0, 8.0, '6,7,8',
    'T=18-28°C, умеренные осадки — условия для развития ржавчины подсолнечника',
    'Использование устойчивых гибридов. Севооборот 3-4 года.',
    'Обработка триазоловыми фунгицидами при первых признаках поражения.', 7);

-- 15. Засуха — абиотический стресс
INSERT INTO disease_risk_rules (disease_name, disease_type, affected_crops, risk_level, risk_weight,
    gtk_max, dry_period_days_min, active_season,
    rule_description, prevention_advice, treatment_advice, urgency_days)
VALUES ('Засуха (абиотический стресс)', 'ABIOTIC',
    'пшеница,ячмень,кукуруза,подсолнечник,соя,рапс,картофель',
    'HIGH', 0.80, 0.5, 10, '5,6,7,8',
    'ГТК < 0.5, сухой период > 10 дней — высокий риск засухи',
    'Организуйте орошение. Мульчирование для сохранения влаги. Внесите калийные удобрения.',
    'Снизьте норму азотных удобрений. Антистрессовые препараты (Мегафол, Аминокат).', 3);

-- 16. Тепловой стресс — абиотический
INSERT INTO disease_risk_rules (disease_name, disease_type, affected_crops, risk_level, risk_weight,
    heat_stress_days_min, active_season,
    rule_description, prevention_advice, treatment_advice, urgency_days)
VALUES ('Тепловой стресс (абиотический)', 'ABIOTIC',
    'пшеница,ячмень,кукуруза,подсолнечник,соя,рапс',
    'HIGH', 0.75, 5, '6,7,8',
    '5+ дней с температурой >30°C — высокий риск теплового стресса',
    'Обеспечьте полив в утренние часы. Применяйте антистрессовые препараты.',
    'Внекорневая подкормка кальцием и бором. Антистрессовые препараты (Мегафол, салициловая кислота).', 2);
