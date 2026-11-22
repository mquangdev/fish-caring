-- Logs of a task without a tank have no tank to be owned through, so a log gets its own owner
-- (user_id). Existing logs take the owner of their tank.
ALTER TABLE care_logs ADD COLUMN user_id BIGINT NULL;

UPDATE care_logs SET user_id = (SELECT t.user_id FROM tanks t WHERE t.id = care_logs.tank_id);

ALTER TABLE care_logs MODIFY COLUMN user_id BIGINT NOT NULL;
ALTER TABLE care_logs ADD CONSTRAINT fk_care_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
CREATE INDEX idx_care_logs_user_acted ON care_logs (user_id, acted_at);
