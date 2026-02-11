-- ============================================================
-- CCNP資格取得支援アプリ - データベーススキーマ
-- Migration: 001_init_schema.sql
-- ============================================================

-- ============================================================
-- 1. ENUM型の定義
-- ============================================================

-- ユーザーロール
CREATE TYPE user_role AS ENUM ('examinee', 'supporter', 'admin');

-- 受験対象試験
CREATE TYPE target_exam_type AS ENUM ('ENCOR', 'ENARSI', 'BOTH');

-- 問題形式
CREATE TYPE question_type AS ENUM ('Single', 'Multi', 'DragDrop', 'Simulation');

-- 試験ステータス
CREATE TYPE session_status AS ENUM ('in_progress', 'completed', 'interrupted');

-- ============================================================
-- 2. テーブル定義
-- ============================================================

-- --------------------------------------
-- users: ユーザー情報（Supabase Authと連携）
-- --------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'examinee',
    target_exam target_exam_type,  -- 受験者のみ使用
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- --------------------------------------
-- supporter_assignments: サポーター・受験者の紐づけ
-- --------------------------------------
CREATE TABLE supporter_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    examinee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(supporter_id, examinee_id)
);

ALTER TABLE supporter_assignments ENABLE ROW LEVEL SECURITY;

-- --------------------------------------
-- questions: 問題データ
-- --------------------------------------
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type target_exam_type NOT NULL,
    domain TEXT NOT NULL,  -- 例: 'Architecture', 'Virtualization', 'Infrastructure'
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL DEFAULT 'Single',
    explanation TEXT,  -- Markdown対応
    image_base64 TEXT,  -- 画像をBase64として保存
    simulation_target_json JSONB,  -- シミュレーション判定用の正解データ
    hash TEXT NOT NULL UNIQUE,  -- 問題文のハッシュ値（重複検知用）
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- パフォーマンス用インデックス
CREATE INDEX idx_questions_exam_domain ON questions(exam_type, domain);
CREATE INDEX idx_questions_type ON questions(question_type);
CREATE INDEX idx_questions_hash ON questions(hash);

-- --------------------------------------
-- options: 選択肢データ
-- --------------------------------------
CREATE TABLE options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,  -- 表示順序
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE options ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_options_question ON options(question_id);

-- --------------------------------------
-- exam_sessions: 試験セッション履歴
-- --------------------------------------
CREATE TABLE exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_type target_exam_type NOT NULL,
    challenge_mode TEXT NOT NULL DEFAULT 'random',  -- 'random', 'weak_points', 'hard_questions'
    domain_filter TEXT,  -- 特定ドメインに絞る場合
    total_questions INT NOT NULL,
    score INT DEFAULT 0,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    status session_status NOT NULL DEFAULT 'in_progress',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_sessions_user ON exam_sessions(user_id);
CREATE INDEX idx_sessions_status ON exam_sessions(status);

-- --------------------------------------
-- session_answers: 各問題への回答記録
-- --------------------------------------
CREATE TABLE session_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answer_data JSONB NOT NULL,  -- ユーザーの回答（形式に応じたJSON）
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, question_id)
);

ALTER TABLE session_answers ENABLE ROW LEVEL SECURITY;

-- 弱点分析用インデックス
CREATE INDEX idx_answers_user_question ON session_answers(user_id, question_id);
CREATE INDEX idx_answers_session ON session_answers(session_id);
CREATE INDEX idx_answers_correct ON session_answers(is_correct);

-- ============================================================
-- 3. RLSポリシー
-- ============================================================

-- --------------------------------------
-- users テーブルのポリシー
-- --------------------------------------

-- 自分自身のデータは閲覧可能
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

-- 管理者は全ユーザーを閲覧可能
CREATE POLICY "Admins can view all users"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- サポーターは担当受験者を閲覧可能
CREATE POLICY "Supporters can view assigned examinees"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM supporter_assignments sa
            WHERE sa.supporter_id = auth.uid() AND sa.examinee_id = users.id
        )
    );

-- 管理者のみユーザーを作成・更新可能
CREATE POLICY "Admins can manage users"
    ON users FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- --------------------------------------
-- supporter_assignments テーブルのポリシー
-- --------------------------------------

-- 管理者のみ閲覧・操作可能
CREATE POLICY "Admins can manage assignments"
    ON supporter_assignments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- サポーターは自分の担当を閲覧可能
CREATE POLICY "Supporters can view own assignments"
    ON supporter_assignments FOR SELECT
    USING (supporter_id = auth.uid());

-- --------------------------------------
-- questions テーブルのポリシー
-- --------------------------------------

-- 全ユーザーが問題を閲覧可能（試験のため）
CREATE POLICY "All users can view questions"
    ON questions FOR SELECT
    USING (true);

-- 管理者のみ問題を管理可能
CREATE POLICY "Admins can manage questions"
    ON questions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- --------------------------------------
-- options テーブルのポリシー
-- --------------------------------------

-- 全ユーザーが選択肢を閲覧可能
CREATE POLICY "All users can view options"
    ON options FOR SELECT
    USING (true);

-- 管理者のみ選択肢を管理可能
CREATE POLICY "Admins can manage options"
    ON options FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- --------------------------------------
-- exam_sessions テーブルのポリシー
-- --------------------------------------

-- 受験者は自分のセッションのみ閲覧可能
CREATE POLICY "Users can view own sessions"
    ON exam_sessions FOR SELECT
    USING (user_id = auth.uid());

-- 受験者は自分のセッションを作成・更新可能
CREATE POLICY "Users can manage own sessions"
    ON exam_sessions FOR ALL
    USING (user_id = auth.uid());

-- サポーターは担当受験者のセッションを閲覧可能
CREATE POLICY "Supporters can view assigned examinee sessions"
    ON exam_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM supporter_assignments sa
            WHERE sa.supporter_id = auth.uid() AND sa.examinee_id = exam_sessions.user_id
        )
    );

-- 管理者は全セッションを閲覧可能
CREATE POLICY "Admins can view all sessions"
    ON exam_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- --------------------------------------
-- session_answers テーブルのポリシー
-- --------------------------------------

-- 受験者は自分の回答のみ閲覧可能
CREATE POLICY "Users can view own answers"
    ON session_answers FOR SELECT
    USING (user_id = auth.uid());

-- 受験者は自分の回答を作成可能
CREATE POLICY "Users can create own answers"
    ON session_answers FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- サポーターは担当受験者の回答を閲覧可能
CREATE POLICY "Supporters can view assigned examinee answers"
    ON session_answers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM supporter_assignments sa
            WHERE sa.supporter_id = auth.uid() AND sa.examinee_id = session_answers.user_id
        )
    );

-- 管理者は全回答を閲覧可能
CREATE POLICY "Admins can view all answers"
    ON session_answers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- ============================================================
-- 4. 関数とトリガー
-- ============================================================

-- updated_at自動更新用関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- usersテーブルのトリガー
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- questionsテーブルのトリガー
CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. ユーザー作成時の自動処理（Supabase Auth連携）
-- ============================================================

-- 新規ユーザー登録時にusersテーブルにレコードを作成
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (NEW.id, NEW.email, 'examinee');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.usersへのINSERTをトリガー
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
