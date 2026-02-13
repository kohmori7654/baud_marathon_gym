-- 1. 既存のトリガーを確認し、削除する
-- トリガー名が不明な場合もあるため、想定される名前で削除を試みる
DROP TRIGGER IF EXISTS set_display_id_trigger ON questions;
DROP TRIGGER IF EXISTS trg_set_display_id ON questions;
DROP FUNCTION IF EXISTS set_display_id();
DROP FUNCTION IF EXISTS assign_display_id();

-- 2. 既存の display_id が NULL のデータに対して採番を行う
-- ENCOR
DO $$
DECLARE
    r RECORD;
    next_id INT;
BEGIN
    SELECT COALESCE(MAX(display_id), 0) + 1 INTO next_id FROM questions WHERE exam_type = 'ENCOR';
    
    FOR r IN SELECT id FROM questions WHERE exam_type = 'ENCOR' AND display_id IS NULL ORDER BY created_at ASC LOOP
        UPDATE questions SET display_id = next_id WHERE id = r.id;
        next_id := next_id + 1;
    END LOOP;
END $$;

-- ENARSI
DO $$
DECLARE
    r RECORD;
    next_id INT;
BEGIN
    SELECT COALESCE(MAX(display_id), 0) + 1 INTO next_id FROM questions WHERE exam_type = 'ENARSI';
    
    FOR r IN SELECT id FROM questions WHERE exam_type = 'ENARSI' AND display_id IS NULL ORDER BY created_at ASC LOOP
        UPDATE questions SET display_id = next_id WHERE id = r.id;
        next_id := next_id + 1;
    END LOOP;
END $$;

-- 3. (念のため) display_id にユニーク制約があるか確認し、なければ追加する（アプリ側での重複排除のため）
-- すでに主キーはあるが、(exam_type, display_id) の複合ユニークがあると良い
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_exam_type_display_id_key') THEN
--         ALTER TABLE questions ADD CONSTRAINT questions_exam_type_display_id_key UNIQUE (exam_type, display_id);
--     END IF;
-- END $$;
