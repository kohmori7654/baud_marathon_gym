-- Check if display_id column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'questions' AND column_name = 'display_id';

-- Check sequences
SELECT sequence_name FROM information_schema.sequences WHERE sequence_name IN ('seq_questions_encor', 'seq_questions_enarsi');

-- Check trigger
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'questions' AND trigger_name = 'trigger_set_question_display_id';

-- Check sample data (if any)
SELECT id, exam_type, display_id FROM questions LIMIT 5;
