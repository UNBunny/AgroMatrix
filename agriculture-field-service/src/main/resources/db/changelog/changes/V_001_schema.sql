CREATE TABLE agricultural_fields (
    id            BIGSERIAL PRIMARY KEY,
    field_name    VARCHAR(255) NOT NULL,
    crop_type     VARCHAR(100),
    status        VARCHAR(50)  DEFAULT 'active',
    geom          GEOMETRY(Polygon, 4326) NOT NULL,
    holes         GEOMETRY(MultiPolygon, 4326),
    area_hectares NUMERIC(12, 2),
    region_code   VARCHAR(20),
    region_name   VARCHAR(255)
);

CREATE TABLE crop_types (
    id                      BIGSERIAL PRIMARY KEY,
    name                    VARCHAR(255),
    category                VARCHAR(100),
    growing_season_days     INTEGER,
    optimal_temperature_min NUMERIC(5, 2),
    optimal_temperature_max NUMERIC(5, 2),
    water_requirements_mm   NUMERIC(8, 2),
    notes                   TEXT,
    cost_per_hectare        NUMERIC(12, 2),
    ml_crop_code            VARCHAR(100)
);

CREATE TABLE crop_varieties (
    id                              BIGSERIAL PRIMARY KEY,
    name                            VARCHAR(255),
    crop_type_id                    BIGINT REFERENCES crop_types(id),
    seed_producer                   VARCHAR(255),
    maturation_days                 INTEGER,
    drought_tolerance               VARCHAR(50),
    frost_tolerance                 VARCHAR(50),
    recommended_seeding_rate_kg_per_ha NUMERIC(8, 2),
    seed_cost_per_kg                NUMERIC(10, 2),
    is_hybrid                       BOOLEAN DEFAULT false,
    notes                           TEXT,
    origin                          VARCHAR(100),
    recommended_regions             TEXT,
    is_top_by_area                  BOOLEAN DEFAULT false
);

CREATE TABLE diseases (
    id                   BIGSERIAL PRIMARY KEY,
    scientific_name      VARCHAR(255),
    common_name          VARCHAR(255),
    disease_type         VARCHAR(50),
    symptoms             TEXT,
    prevention_measures  TEXT,
    treatment_methods    TEXT,
    risk_level           VARCHAR(50),
    active_season        VARCHAR(100),
    favorable_conditions TEXT,
    image_url            VARCHAR(500),
    is_active            BOOLEAN DEFAULT true
);

CREATE TABLE disease_affected_crops (
    disease_id   BIGINT NOT NULL REFERENCES diseases(id),
    crop_type_id BIGINT NOT NULL REFERENCES crop_types(id),
    PRIMARY KEY (disease_id, crop_type_id)
);

CREATE TABLE disease_resistances (
    id               BIGSERIAL PRIMARY KEY,
    disease_id       BIGINT REFERENCES diseases(id),
    crop_variety_id  BIGINT REFERENCES crop_varieties(id),
    resistance_level VARCHAR(50)
);

CREATE TABLE crop_history (
    id                    BIGSERIAL PRIMARY KEY,
    field_id              BIGINT REFERENCES agricultural_fields(id),
    crop_type_id          BIGINT REFERENCES crop_types(id),
    crop_variety_id       BIGINT REFERENCES crop_varieties(id),
    planting_date         DATE,
    actual_harvest_date   DATE,
    expected_harvest_date DATE,
    seed_amount_kg_per_ha NUMERIC(8, 2),
    seed_depth_cm         NUMERIC(5, 2),
    plant_spacing_cm      NUMERIC(5, 2),
    actual_yield_kg       NUMERIC(12, 2),
    expected_yield_kg     NUMERIC(12, 2),
    planting_status       VARCHAR(50),
    notes                 TEXT,
    weather_conditions    TEXT
);

CREATE TABLE crop_rotation_rules (
    id                  BIGSERIAL PRIMARY KEY,
    predecessor_crop_id BIGINT NOT NULL REFERENCES crop_types(id),
    successor_crop_id   BIGINT NOT NULL REFERENCES crop_types(id),
    allowed             BOOLEAN NOT NULL DEFAULT true,
    min_gap_years       INTEGER DEFAULT 0,
    reason              VARCHAR(500),
    recommendation      VARCHAR(30) CHECK (recommendation IN ('STRONGLY_RECOMMENDED','RECOMMENDED','ACCEPTABLE','NOT_RECOMMENDED','FORBIDDEN')),
    disease_risk        VARCHAR(300),
    weed_risk           VARCHAR(300),
    soil_structure_impact VARCHAR(300),
    nitrogen_balance    VARCHAR(300),
    required_practices  VARCHAR(500),
    UNIQUE (predecessor_crop_id, successor_crop_id),
    CONSTRAINT chk_recommendation_values CHECK (recommendation IS NOT NULL)
);

COMMENT ON COLUMN crop_rotation_rules.recommendation IS 'Gradient agronomic recommendation: STRONGLY_RECOMMENDED/RECOMMENDED/ACCEPTABLE/NOT_RECOMMENDED/FORBIDDEN';

CREATE TABLE ndvi_records (
    id          BIGSERIAL PRIMARY KEY,
    field_id    BIGINT REFERENCES agricultural_fields(id) ON DELETE CASCADE,
    record_date DATE          NOT NULL,
    ndvi_mean   NUMERIC(6, 4) NOT NULL,
    ndvi_min    NUMERIC(6, 4),
    ndvi_max    NUMERIC(6, 4),
    ndvi_std    NUMERIC(6, 4),
    source      VARCHAR(50)   NOT NULL DEFAULT 'MODEL',
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ndvi_records_field_date        ON ndvi_records(field_id, record_date DESC);
CREATE UNIQUE INDEX idx_ndvi_records_field_date_unique ON ndvi_records(field_id, record_date);

CREATE TABLE soil_data (
    id                BIGSERIAL PRIMARY KEY,
    field_id          BIGINT NOT NULL,
    nitrogen_n        DECIMAL(10, 4),
    phosphorus_p      DECIMAL(10, 4),
    potassium_k       DECIMAL(10, 4),
    ph_level          DECIMAL(4, 2),
    organic_matter    DECIMAL(10, 4),
    soil_texture      VARCHAR(50),
    cec               DECIMAL(10, 4),
    bulk_density      DECIMAL(10, 4),
    source            VARCHAR(20) NOT NULL DEFAULT 'AUTO',
    confidence        DECIMAL(5, 2),
    soilgrids_version VARCHAR(20),
    last_synced_at    TIMESTAMP,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes             VARCHAR(500),
    CONSTRAINT fk_soil_data_field   FOREIGN KEY (field_id) REFERENCES agricultural_fields(id) ON DELETE CASCADE,
    CONSTRAINT uq_soil_data_field   UNIQUE (field_id)
);

CREATE INDEX idx_soil_data_field_id ON soil_data(field_id);
COMMENT ON TABLE soil_data IS 'Soil chemistry data — auto-fetched from SoilGrids or manually entered';

CREATE TABLE soil_horizons (
    id             BIGSERIAL PRIMARY KEY,
    field_id       BIGINT NOT NULL,
    depth_from_cm  INTEGER NOT NULL,
    depth_to_cm    INTEGER NOT NULL,
    nitrogen_n     DECIMAL(10, 4),
    phosphorus_p   DECIMAL(10, 4),
    potassium_k    DECIMAL(10, 4),
    ph_level       DECIMAL(4, 2),
    bulk_density   DECIMAL(6, 3),
    organic_matter DECIMAL(6, 3),
    sampling_date  DATE,
    lab_protocol   VARCHAR(200),
    notes          VARCHAR(500),
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_soil_horizon_field       FOREIGN KEY (field_id) REFERENCES agricultural_fields(id) ON DELETE CASCADE,
    CONSTRAINT chk_soil_horizon_depth      CHECK (depth_from_cm < depth_to_cm),
    CONSTRAINT uq_soil_horizon_field_depth UNIQUE (field_id, depth_from_cm)
);

CREATE INDEX idx_soil_horizons_field_id ON soil_horizons(field_id);
COMMENT ON TABLE soil_horizons IS 'Laboratory soil analysis per depth horizon (typically 0-20 cm and 20-40 cm)';

CREATE TABLE disease_risk_rules (
    id                      BIGSERIAL PRIMARY KEY,
    disease_name            VARCHAR(255) NOT NULL,
    disease_type            VARCHAR(50),
    affected_crops          VARCHAR(500) NOT NULL,
    risk_level              VARCHAR(20)  NOT NULL,
    risk_weight             DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    temp_min_threshold      DOUBLE PRECISION,
    temp_max_threshold      DOUBLE PRECISION,
    precip_min7d            DOUBLE PRECISION,
    precip_max7d            DOUBLE PRECISION,
    humidity_min_threshold  DOUBLE PRECISION,
    gtk_min                 DOUBLE PRECISION,
    gtk_max                 DOUBLE PRECISION,
    heat_stress_days_min    INTEGER,
    dry_period_days_min     INTEGER,
    active_season           VARCHAR(100),
    rule_description        VARCHAR(500),
    prevention_advice       VARCHAR(1000),
    treatment_advice        VARCHAR(1000),
    urgency_days            INTEGER,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE weather_history_cache (
    id                     BIGSERIAL PRIMARY KEY,
    lat_rounded            DOUBLE PRECISION NOT NULL,
    lon_rounded            DOUBLE PRECISION NOT NULL,
    year                   INTEGER          NOT NULL,
    fetched_at             TIMESTAMP        NOT NULL,
    precip_oct_mar         DOUBLE PRECISION,
    min_temp_winter        DOUBLE PRECISION,
    precip_apr_may         DOUBLE PRECISION,
    temp_sum_apr_may       DOUBLE PRECISION,
    frost_risk_spring      BOOLEAN,
    gtk_apr_may            DOUBLE PRECISION,
    precip_jun_jul         DOUBLE PRECISION,
    temp_sum_jun_jul       DOUBLE PRECISION,
    heat_stress_jun_jul    INTEGER,
    extreme_heat_jun_jul   INTEGER,
    avg_temp_jun_jul       DOUBLE PRECISION,
    gtk_jun_jul            DOUBLE PRECISION,
    precip_aug_sep         DOUBLE PRECISION,
    temp_sum_aug_sep       DOUBLE PRECISION,
    heat_stress_aug_sep    INTEGER,
    gtk_aug_sep            DOUBLE PRECISION,
    gtk_apr_sep            DOUBLE PRECISION,
    temp_sum_apr_sep       DOUBLE PRECISION,
    total_heat_stress_days INTEGER,
    min_temp_vegetation    DOUBLE PRECISION,
    longest_dry_period     INTEGER,
    CONSTRAINT uq_weather_history_lat_lon_year UNIQUE (lat_rounded, lon_rounded, year)
);

CREATE INDEX idx_weather_history_coords_year ON weather_history_cache(lat_rounded, lon_rounded, year);

CREATE TABLE phenological_observations (
    id                 BIGSERIAL PRIMARY KEY,
    crop_history_id    BIGINT NOT NULL,
    observation_date   DATE   NOT NULL,
    bbch_scale         INTEGER NOT NULL CHECK (bbch_scale BETWEEN 0 AND 99),
    bbch_description   VARCHAR(200),
    observation_method VARCHAR(20) CHECK (observation_method IN ('VISUAL', 'TACTILE', 'LAB_ANALYSIS')),
    notes              VARCHAR(500),
    weather_conditions VARCHAR(200),
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_phenology_crop_history FOREIGN KEY (crop_history_id) REFERENCES crop_history(id) ON DELETE CASCADE
);

CREATE INDEX idx_phenology_crop_history_id ON phenological_observations(crop_history_id);
CREATE INDEX idx_phenology_date            ON phenological_observations(observation_date);
COMMENT ON TABLE phenological_observations IS 'BBCH-scale phenological observations manually entered by agronomist';

CREATE TABLE fertilizer_applications (
    id                 BIGSERIAL PRIMARY KEY,
    crop_history_id    BIGINT NOT NULL,
    application_date   DATE   NOT NULL,
    fertilizer_type    VARCHAR(100) NOT NULL,
    formulation        VARCHAR(50),
    dose_kg_per_ha     DECIMAL(10, 3),
    total_area_ha      DECIMAL(10, 2),
    total_amount_kg    DECIMAL(12, 2),
    application_method VARCHAR(20) CHECK (application_method IN ('BROADCAST', 'FERTIGATION', 'FOLIAR', 'LOCALIZED')),
    bbch_phase         INTEGER,
    cost_per_ha        DECIMAL(12, 2),
    total_cost         DECIMAL(14, 2),
    weather_temp_c     DECIMAL(5, 2),
    weather_humidity   INTEGER,
    wind_speed         DECIMAL(5, 2),
    notes              VARCHAR(500),
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fertilizer_app_crop_history FOREIGN KEY (crop_history_id) REFERENCES crop_history(id) ON DELETE CASCADE
);

CREATE INDEX idx_fertilizer_app_crop_history_id ON fertilizer_applications(crop_history_id);
CREATE INDEX idx_fertilizer_app_date            ON fertilizer_applications(application_date);
COMMENT ON TABLE fertilizer_applications IS 'Fertilizer application records from agronomist field journal';

CREATE TABLE plant_protection_operations (
    id                     BIGSERIAL PRIMARY KEY,
    crop_history_id        BIGINT NOT NULL,
    operation_date         DATE   NOT NULL,
    operation_type         VARCHAR(20) NOT NULL CHECK (operation_type IN ('HERBICIDE','FUNGICIDE','INSECTICIDE','DESICCANT')),
    product_name           VARCHAR(100) NOT NULL,
    active_ingredient      VARCHAR(200),
    mechanism_of_action    VARCHAR(200),
    dose_l_per_ha          DECIMAL(8, 3),
    concentration_percent  DECIMAL(5, 2),
    target_pest            VARCHAR(200),
    infestation_level      VARCHAR(25) CHECK (infestation_level IN ('LOW','MEDIUM','HIGH','ECONOMIC_THRESHOLD')),
    bbch_phase             INTEGER,
    temp_c                 DECIMAL(5, 2),
    humidity               INTEGER,
    wind_speed             DECIMAL(5, 2),
    precipitation_expected BOOLEAN,
    efficacy_percent       INTEGER CHECK (efficacy_percent BETWEEN 0 AND 100),
    follow_up_required     BOOLEAN,
    phi_days               INTEGER,
    harvest_allowed_after  DATE,
    cost_per_ha            DECIMAL(12, 2),
    notes                  VARCHAR(500),
    created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_plant_protection_crop_history FOREIGN KEY (crop_history_id) REFERENCES crop_history(id) ON DELETE CASCADE
);

CREATE INDEX idx_plant_protection_crop_history_id ON plant_protection_operations(crop_history_id);
CREATE INDEX idx_plant_protection_date            ON plant_protection_operations(operation_date);
COMMENT ON TABLE plant_protection_operations IS 'Plant protection operations: herbicides, fungicides, insecticides, desiccants';

CREATE TABLE disease_product_recommendations (
    id        BIGSERIAL PRIMARY KEY,
    keywords  VARCHAR(500)  NOT NULL,
    op_type   VARCHAR(20)   NOT NULL,
    op_label  VARCHAR(50)   NOT NULL,
    op_color  VARCHAR(20)   NOT NULL,
    op_emoji  VARCHAR(10)   NOT NULL,
    reason    VARCHAR(1000) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE disease_product_items (
    id                BIGSERIAL PRIMARY KEY,
    recommendation_id BIGINT NOT NULL REFERENCES disease_product_recommendations(id) ON DELETE CASCADE,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    name              VARCHAR(255) NOT NULL,
    active_ingredient VARCHAR(500),
    mechanism         VARCHAR(255),
    dose              VARCHAR(100),
    dose_value        DOUBLE PRECISION,
    timing            VARCHAR(500),
    phi_days          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE crop_protection_catalog (
    id                BIGSERIAL PRIMARY KEY,
    crop_code         VARCHAR(50)  NOT NULL,
    disease_name      VARCHAR(200) NOT NULL,
    pathogen_latin    VARCHAR(200),
    disease_type      VARCHAR(20)  NOT NULL DEFAULT 'FUNGAL',
    product_name      VARCHAR(100) NOT NULL,
    frac_group        VARCHAR(100),
    frac_code         VARCHAR(20),
    active_ingredients VARCHAR(300) NOT NULL,
    ai_concentration  VARCHAR(120),
    application_type  VARCHAR(20)  NOT NULL,
    bbch_from         INTEGER,
    bbch_to           INTEGER,
    bbch_note         VARCHAR(120),
    dose_rate         VARCHAR(60)  NOT NULL,
    dose_value        DOUBLE PRECISION,
    dose_unit         VARCHAR(20),
    temp_min_c        DECIMAL(4, 1),
    temp_opt_c        DECIMAL(4, 1),
    temp_max_c        DECIMAL(4, 1),
    phi_days          INTEGER      NOT NULL DEFAULT 0,
    notes             VARCHAR(500),
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cpc_crop_code ON crop_protection_catalog(crop_code);
CREATE INDEX idx_cpc_disease   ON crop_protection_catalog(disease_name);
CREATE INDEX idx_cpc_app_type  ON crop_protection_catalog(application_type);
COMMENT ON TABLE crop_protection_catalog IS 'Каталог СЗР: препараты × болезни × культуры. FRAC-классификация, режим применения по BBCH, температурные окна.';
