-- Tanks no longer have a type. They get optional dimensions (cm) and a decimal volume (litres).
-- Existing volumes are kept (54 becomes 54.0). Dropping "type" discards the values stored there.

ALTER TABLE tanks DROP COLUMN type;

ALTER TABLE tanks ADD COLUMN length_cm DECIMAL(5,1) NULL;
ALTER TABLE tanks ADD COLUMN width_cm DECIMAL(5,1) NULL;
ALTER TABLE tanks ADD COLUMN height_cm DECIMAL(5,1) NULL;

ALTER TABLE tanks MODIFY COLUMN volume_liters DECIMAL(7,1) NULL;
