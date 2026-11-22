-- Optional per-type details of a care task:
--   FEED         -> food_name
--   WATER_CHANGE -> water_change_percent
--   FERTILIZE    -> fertilizer_ml
ALTER TABLE care_tasks ADD COLUMN food_name VARCHAR(100) NULL;
ALTER TABLE care_tasks ADD COLUMN water_change_percent INT NULL;
ALTER TABLE care_tasks ADD COLUMN fertilizer_ml DECIMAL(6,1) NULL;
