-- Create question_images table
CREATE TABLE IF NOT EXISTS question_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    image_data TEXT NOT NULL, -- Base64 encoded image
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_question_images_question_id ON question_images(question_id);

-- Migrate existing data (if any)
INSERT INTO question_images (question_id, image_data, sort_order)
SELECT id, image_base64, 0
FROM questions
WHERE image_base64 IS NOT NULL AND image_base64 != '';

-- Optional: We can drop the old column later, or keep it for now as fallback/legacy.
-- ALTER TABLE questions DROP COLUMN image_base64;
