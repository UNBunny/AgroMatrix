-- Season plans (workflow: DRAFT → PENDING_APPROVAL → APPROVED / REJECTED)
CREATE TABLE IF NOT EXISTS season_plans (
    id                    BIGSERIAL PRIMARY KEY,
    field_id              BIGINT        NOT NULL REFERENCES agricultural_fields(id) ON DELETE CASCADE,
    crop_type             VARCHAR(255)  NOT NULL,
    season                VARCHAR(20)   NOT NULL,
    description           TEXT,
    status                VARCHAR(30)   NOT NULL DEFAULT 'DRAFT',
    created_by_user_id    BIGINT        NOT NULL,
    created_by_username   VARCHAR(255)  NOT NULL,
    reviewed_by_user_id   BIGINT,
    reviewed_by_username  VARCHAR(255),
    review_comment        TEXT,
    farm_id               BIGINT,
    created_at            TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at            TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_season_plans_farm    ON season_plans(farm_id);
CREATE INDEX IF NOT EXISTS idx_season_plans_field   ON season_plans(field_id);
CREATE INDEX IF NOT EXISTS idx_season_plans_status  ON season_plans(status);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id             BIGSERIAL    PRIMARY KEY,
    entity_type    VARCHAR(100) NOT NULL,
    entity_id      BIGINT       NOT NULL,
    action         VARCHAR(50)  NOT NULL,
    user_id        BIGINT       NOT NULL,
    username       VARCHAR(255) NOT NULL,
    field_id       BIGINT,
    field_name     VARCHAR(255),
    changed_field  VARCHAR(255),
    old_value      TEXT,
    new_value      TEXT,
    created_at     TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_date   ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_field  ON audit_log(field_id);
