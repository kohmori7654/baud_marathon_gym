-- Add is_important column to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_important BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for performance (since we sort/filter by this often in mock exams)
CREATE INDEX IF NOT EXISTS idx_questions_is_important ON questions(is_important);
