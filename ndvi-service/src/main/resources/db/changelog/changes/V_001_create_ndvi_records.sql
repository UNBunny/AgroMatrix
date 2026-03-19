CREATE TABLE IF NOT EXISTS ndvi_records
(
    id          BIGSERIAL PRIMARY KEY,
    field_id    BIGINT         NOT NULL,
    record_date DATE           NOT NULL,
    ndvi_mean   NUMERIC(6, 4)  NOT NULL,
    ndvi_min    NUMERIC(6, 4),
    ndvi_max    NUMERIC(6, 4),
    ndvi_std    NUMERIC(6, 4),
    source      VARCHAR(50)    NOT NULL DEFAULT 'MODEL',
    created_at  TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ndvi_records_field_date ON ndvi_records (field_id, record_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ndvi_records_field_date_unique ON ndvi_records (field_id, record_date);
