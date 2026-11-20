-- Fish Caring initial schema (MySQL 8 and H2 in MySQL mode).
-- All timestamps are DATETIME(3) in Vietnam local time (Asia/Ho_Chi_Minh, UTC+7),
-- written by the application (never by DB defaults).

CREATE TABLE users (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    created_at    DATETIME(3)  NOT NULL,
    updated_at    DATETIME(3)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email)
);

CREATE TABLE tanks (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    user_id       BIGINT       NOT NULL,
    name          VARCHAR(100) NOT NULL,
    volume_liters INT          NULL,
    type          VARCHAR(20)  NOT NULL,
    setup_date    DATE         NULL,
    note          VARCHAR(1000) NULL,
    created_at    DATETIME(3)  NOT NULL,
    updated_at    DATETIME(3)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_tanks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX idx_tanks_user_name ON tanks (user_id, name);

CREATE TABLE tank_fish (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    tank_id      BIGINT       NOT NULL,
    species_name VARCHAR(100) NOT NULL,
    quantity     INT          NOT NULL,
    status       TINYINT      NOT NULL DEFAULT 1, -- 1 = alive, 0 = dead
    created_at   DATETIME(3)  NOT NULL,
    updated_at   DATETIME(3)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_tank_fish_tank FOREIGN KEY (tank_id) REFERENCES tanks (id) ON DELETE CASCADE,
    CONSTRAINT ck_tank_fish_quantity CHECK (quantity >= 1),
    CONSTRAINT ck_tank_fish_status CHECK (status IN (0, 1))
);
CREATE INDEX idx_tank_fish_tank ON tank_fish (tank_id);

CREATE TABLE care_tasks (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    tank_id       BIGINT       NOT NULL,
    type          VARCHAR(20)  NOT NULL,
    title         VARCHAR(100) NOT NULL,
    note          VARCHAR(500) NULL,
    repeat_type   VARCHAR(20)  NOT NULL,
    interval_days INT          NULL,
    time_of_day   TIME         NOT NULL,
    start_date    DATE         NULL,
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    next_due_at   DATETIME(3)  NULL,
    created_at    DATETIME(3)  NOT NULL,
    updated_at    DATETIME(3)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_care_tasks_tank FOREIGN KEY (tank_id) REFERENCES tanks (id) ON DELETE CASCADE
);
CREATE INDEX idx_care_tasks_tank ON care_tasks (tank_id);
CREATE INDEX idx_care_tasks_due ON care_tasks (enabled, next_due_at);

CREATE TABLE care_logs (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    tank_id    BIGINT       NOT NULL,
    task_id    BIGINT       NULL,
    task_title VARCHAR(100) NOT NULL,
    result     VARCHAR(20)  NOT NULL,
    due_at     DATETIME(3)  NOT NULL,
    acted_at   DATETIME(3)  NOT NULL,
    created_at DATETIME(3)  NOT NULL,
    updated_at DATETIME(3)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_care_logs_tank FOREIGN KEY (tank_id) REFERENCES tanks (id) ON DELETE CASCADE,
    CONSTRAINT fk_care_logs_task FOREIGN KEY (task_id) REFERENCES care_tasks (id) ON DELETE SET NULL
);
CREATE INDEX idx_care_logs_tank_acted ON care_logs (tank_id, acted_at);

CREATE TABLE notifications (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    user_id    BIGINT       NOT NULL,
    task_id    BIGINT       NOT NULL,
    due_at     DATETIME(3)  NOT NULL,
    message    VARCHAR(255) NOT NULL,
    status     VARCHAR(20)  NOT NULL,
    created_at DATETIME(3)  NOT NULL,
    updated_at DATETIME(3)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_task FOREIGN KEY (task_id) REFERENCES care_tasks (id) ON DELETE CASCADE,
    CONSTRAINT uk_notifications_task_due UNIQUE (task_id, due_at)
);
CREATE INDEX idx_notifications_user_status ON notifications (user_id, status, created_at);

CREATE TABLE push_subscriptions (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    user_id    BIGINT       NOT NULL,
    endpoint   VARCHAR(512) NOT NULL,
    p256dh     VARCHAR(255) NOT NULL,
    auth       VARCHAR(255) NOT NULL,
    user_agent VARCHAR(255) NULL,
    created_at DATETIME(3)  NOT NULL,
    updated_at DATETIME(3)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_push_subscriptions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_push_subscriptions_endpoint UNIQUE (endpoint)
);
