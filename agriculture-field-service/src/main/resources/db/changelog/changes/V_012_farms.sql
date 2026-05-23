CREATE TABLE farms (
    id           BIGSERIAL PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    invite_code  VARCHAR(32)  NOT NULL UNIQUE,
    owner_id     BIGINT       NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_farms_owner_id    ON farms(owner_id);
CREATE INDEX idx_farms_invite_code ON farms(invite_code);

ALTER TABLE agricultural_fields
    ADD COLUMN farm_id BIGINT REFERENCES farms(id) ON DELETE CASCADE;

CREATE INDEX idx_agricultural_fields_farm_id ON agricultural_fields(farm_id);

COMMENT ON TABLE farms IS 'Хозяйства — изолированные единицы данных. Каждое поле принадлежит одному хозяйству.';
COMMENT ON COLUMN farms.invite_code IS 'Случайный 8-символьный код для приглашения агрономов';
COMMENT ON COLUMN farms.owner_id IS 'user_id из auth-service (DIRECTOR или ADMIN)';
