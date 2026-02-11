-- Add question_type column to exam_sessions table for filtering
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS question_type text;

-- Add comment
COMMENT ON COLUMN exam_sessions.question_type IS 'Filter by question type (Single, Multi, DragDrop, Simulation)';
