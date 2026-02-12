-- Create a function to get detailed student analytics
-- FIXED: Removed incorrect ::TEXT cast for date comparison

CREATE OR REPLACE FUNCTION get_student_analytics(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    v_total_sessions INT;
    v_last_5_mock_avg NUMERIC;
    v_sim_accuracy NUMERIC;
    v_avg_speed_seconds NUMERIC;
    v_learning_density NUMERIC;
    v_signal TEXT;
    v_domain_min_accuracy NUMERIC;
    v_radar_data JSONB;
    v_history_data JSONB;
    v_weak_questions JSONB;
BEGIN
    -- 1. Recent Stability
    SELECT COALESCE(ROUND(AVG(score::NUMERIC / NULLIF(total_questions, 0) * 100), 1), 0)
    INTO v_last_5_mock_avg
    FROM (
        SELECT score, total_questions FROM exam_sessions
        WHERE user_id = target_user_id AND status = 'completed' AND challenge_mode = 'mock_exam'
        ORDER BY end_time DESC LIMIT 5
    ) AS recent_mocks;

    -- 2. Simulation Accuracy
    SELECT COALESCE(ROUND(COUNT(CASE WHEN sa.is_correct THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1), 0)
    INTO v_sim_accuracy
    FROM session_answers sa JOIN questions q ON sa.question_id = q.id
    WHERE sa.user_id = target_user_id AND q.question_type = 'Simulation';

    -- 3. Answer Speed
    SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / NULLIF(total_questions, 0))::NUMERIC, 1), 0)
    INTO v_avg_speed_seconds
    FROM (
        SELECT start_time, end_time, total_questions FROM exam_sessions
        WHERE user_id = target_user_id AND status = 'completed' AND start_time IS NOT NULL AND end_time IS NOT NULL
        ORDER BY end_time DESC LIMIT 20
    ) AS recent_sessions;

    -- 4. Learning Density
    -- FIXED: Removed ::TEXT cast. Assuming answered_at is TIMESTAMP or TIMESTAMPTZ.
    SELECT COALESCE(COUNT(*), 0) INTO v_learning_density
    FROM session_answers WHERE user_id = target_user_id AND answered_at >= (NOW() - INTERVAL '7 days');

    -- 5. Radar Data
    SELECT COALESCE(jsonb_agg(jsonb_build_object('domain', domain, 'accuracy', ROUND(accuracy, 1), 'total', total_qs)), '[]'::JSONB)
    INTO v_radar_data
    FROM (
        SELECT q.domain, COUNT(CASE WHEN sa.is_correct THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100 AS accuracy, COUNT(*) as total_qs
        FROM session_answers sa JOIN questions q ON sa.question_id = q.id
        WHERE sa.user_id = target_user_id GROUP BY q.domain
    ) AS domain_stats;

    -- Min Accuracy for Signal
    SELECT COALESCE(MIN(accuracy), 0) INTO v_domain_min_accuracy
    FROM (
        SELECT COUNT(CASE WHEN sa.is_correct THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100 AS accuracy
        FROM session_answers sa JOIN questions q ON sa.question_id = q.id
        WHERE sa.user_id = target_user_id GROUP BY q.domain
    ) AS domain_stats;

    -- 6. History Data
    SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(end_time, 'YYYY-MM-DD'), 'score', ROUND(score::NUMERIC / NULLIF(total_questions, 0) * 100, 1), 'mode', challenge_mode) ORDER BY end_time ASC), '[]'::JSONB)
    INTO v_history_data
    FROM (
        SELECT end_time, score, total_questions, challenge_mode FROM exam_sessions
        WHERE user_id = target_user_id AND status = 'completed'
        ORDER BY end_time DESC LIMIT 10
    ) AS history;

    -- 7. Weak Questions
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', q.id, 'text', q.question_text, 'domain', q.domain, 'correct_count', stats.correct_count, 'wrong_count', stats.wrong_count, 'total_attempts', stats.total_attempts, 'last_attempt_correct', stats.last_correct)), '[]'::JSONB)
    INTO v_weak_questions
    FROM (
        SELECT question_id, COUNT(*) as total_attempts, COUNT(CASE WHEN is_correct THEN 1 END) as correct_count, COUNT(CASE WHEN NOT is_correct THEN 1 END) as wrong_count, (array_agg(is_correct ORDER BY answered_at DESC))[1] as last_correct
        FROM session_answers WHERE user_id = target_user_id
        GROUP BY question_id
        HAVING COUNT(CASE WHEN NOT is_correct THEN 1 END) >= 3 OR (COUNT(CASE WHEN is_correct THEN 1 END) > 0 AND COUNT(CASE WHEN NOT is_correct THEN 1 END) > 0)
    ) AS stats JOIN questions q ON stats.question_id = q.id LIMIT 20;

    -- 8. Signal
    IF v_last_5_mock_avg >= 90 AND v_sim_accuracy = 100 AND v_domain_min_accuracy >= 70 THEN v_signal := 'GO';
    ELSIF v_last_5_mock_avg >= 80 THEN v_signal := 'REVIEW';
    ELSE v_signal := 'STOP'; END IF;

    result := jsonb_build_object('signal', v_signal, 'metrics', jsonb_build_object('last_5_mock_avg', v_last_5_mock_avg, 'sim_accuracy', v_sim_accuracy, 'avg_speed_seconds', v_avg_speed_seconds, 'learning_density', v_learning_density, 'domain_min_accuracy', v_domain_min_accuracy), 'radar_data', v_radar_data, 'history_data', v_history_data, 'weak_questions', v_weak_questions);
    RETURN result;
END;
$$;
