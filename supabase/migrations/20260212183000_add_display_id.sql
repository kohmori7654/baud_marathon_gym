-- ============================================================
-- 問題管理機能強化: ID管理用カラムとシーケンスの追加
-- Migration: 20260212_add_display_id.sql
-- ============================================================

-- 1. シーケンスの作成
-- ENCOR用シーケンス (1から開始)
CREATE SEQUENCE IF NOT EXISTS seq_questions_encor START 1;

-- ENARSI用シーケンス (1から開始)
CREATE SEQUENCE IF NOT EXISTS seq_questions_enarsi START 1;

-- 2. カラムの追加
-- 既存のテーブルに display_id カラムを追加 (NULL許容で作成後、データを埋めてからNOT NULL制約追加を検討)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS display_id INT;

-- 3. 既存データへのID付与 (移行処理)
-- ENCORの既存データにIDを振る
WITH indexed_encor AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
    FROM questions
    WHERE exam_type = 'ENCOR' AND display_id IS NULL
)
UPDATE questions
SET display_id = indexed_encor.rn
FROM indexed_encor
WHERE questions.id = indexed_encor.id;

-- シーケンスを現在の最大値+1にセット
SELECT setval('seq_questions_encor', (SELECT COALESCE(MAX(display_id), 0) + 1 FROM questions WHERE exam_type = 'ENCOR'), false);


-- ENARSIの既存データにIDを振る
WITH indexed_enarsi AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
    FROM questions
    WHERE exam_type = 'ENARSI' AND display_id IS NULL
)
UPDATE questions
SET display_id = indexed_enarsi.rn
FROM indexed_enarsi
WHERE questions.id = indexed_enarsi.id;

-- シーケンスを現在の最大値+1にセット
SELECT setval('seq_questions_enarsi', (SELECT COALESCE(MAX(display_id), 0) + 1 FROM questions WHERE exam_type = 'ENARSI'), false);

-- 4. 自動採番トリガー関数の作成
CREATE OR REPLACE FUNCTION set_question_display_id()
RETURNS TRIGGER AS $$
BEGIN
    -- display_idが未指定の場合のみ採番
    IF NEW.display_id IS NULL THEN
        IF NEW.exam_type = 'ENCOR' THEN
            NEW.display_id := nextval('seq_questions_encor');
        ELSIF NEW.exam_type = 'ENARSI' THEN
            NEW.display_id := nextval('seq_questions_enarsi');
        ELSE
            -- その他（BOTHなど）は一旦採番しない、または別のシーケンスを用意する?
            -- 現状BOTHは問題データとしては存在しない前提(TargetExamTypeは質問テーブルのカラム)
            -- 万が一の場合はNULLのまま、あるいはdefault 0など
            NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. トリガーの作成
DROP TRIGGER IF EXISTS trigger_set_question_display_id ON questions;
CREATE TRIGGER trigger_set_question_display_id
    BEFORE INSERT ON questions
    FOR EACH ROW
    EXECUTE FUNCTION set_question_display_id();

-- 6. インデックス作成 (検索・ソート用)
CREATE INDEX IF NOT EXISTS idx_questions_display_id ON questions(display_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_display_id ON questions(exam_type, display_id);
