-- Add simulation_url column to questions table
-- This allows setting a custom URL for the simulation iframe per question
ALTER TABLE questions ADD COLUMN IF NOT EXISTS simulation_url text;

-- Default is NULL, which means use the default URL: https://baudroie-virtual-campus.web.app/
COMMENT ON COLUMN questions.simulation_url IS 'Custom URL for simulation iframe. NULL = default (baudroie-virtual-campus.web.app)';
