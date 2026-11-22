-- A care task may belong to no tank (a "general" task, for example changing the water of a worm
-- culture). Tasks therefore get their own owner (user_id) instead of being owned through the tank.
-- Existing tasks take the owner of their tank.
ALTER TABLE care_tasks ADD COLUMN user_id BIGINT NULL;

UPDATE care_tasks SET user_id = (SELECT t.user_id FROM tanks t WHERE t.id = care_tasks.tank_id);

ALTER TABLE care_tasks MODIFY COLUMN user_id BIGINT NOT NULL;
ALTER TABLE care_tasks ADD CONSTRAINT fk_care_tasks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
CREATE INDEX idx_care_tasks_user ON care_tasks (user_id);

-- Deleting a tank still deletes its tasks (the foreign key stays ON DELETE CASCADE).
ALTER TABLE care_tasks MODIFY COLUMN tank_id BIGINT NULL;

-- Logs of a general task have no tank either.
ALTER TABLE care_logs MODIFY COLUMN tank_id BIGINT NULL;
