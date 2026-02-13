-- Add department and passed columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS passed BOOLEAN DEFAULT FALSE;
