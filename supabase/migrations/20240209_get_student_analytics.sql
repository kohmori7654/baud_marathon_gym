-- Create a function to get detailed student analytics
-- This function aggregates data for the Student Analytics Dashboard

CREATE OR REPLACE FUNCTION get_student_analytics(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    
    -- Variables for metrics
    v_total_sessions INT;
    v_last_5_mock_avg NUMERIC;
    v_sim_accuracy NUMERIC;
    v_avg_speed_seconds NUMERIC;
    v_learning_density NUMERIC; -- Questions answered in last 7 days
    
    -- Variables for signal
    v_signal TEXT; -- 'GO', 'REVIEW', 'STOP'
    v_domain_min_accuracy NUMERIC;
    
    -- Date limits
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_7_days_ago TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '7 days';
    
    -- Data holders
    v_radar_data JSONB;
    v_history_data JSONB;
    v_weak_questions JSONB;
    
BEGIN
    -- 1. Calculate Recent Stability (Last 5 Mock Exams Average)
    SELECT COALESCE(ROUND(AVG(score::NUMERIC / NULLIF(total_questions, 0) * 100), 1), 0)
    INTO v_last_5_mock_avg
    FROM (
        SELECT score, total_questions
        FROM exam_sessions
        WHERE user_id = target_user_id
          AND status = 'completed'
          AND challenge_mode = 'mock_exam'
        ORDER BY end_time DESC
        LIMIT 5
    ) AS recent_mocks;

    -- 2. Calculate Simulation Accuracy (All time)
    SELECT COALESCE(ROUND(
        COUNT(CASE WHEN sa.is_correct THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100
    , 1), 0)
    INTO v_sim_accuracy
    FROM session_answers sa
    JOIN questions q ON sa.question_id = q.id
    WHERE sa.user_id = target_user_id
      AND q.question_type = 'Simulation';

    -- 3. Calculate Answer Speed (Average seconds per question in recent 20 sessions)
    -- Using session duration / total_questions
    SELECT COALESCE(ROUND(AVG(
        EXTRACT(EPOCH FROM (end_time - start_time)) / NULLIF(total_questions, 0)
    )::NUMERIC, 1), 0)
    INTO v_avg_speed_seconds
    FROM (
        SELECT start_time, end_time, total_questions
        FROM exam_sessions
        WHERE user_id = target_user_id
          AND status = 'completed'
          AND start_time IS NOT NULL
          AND end_time IS NOT NULL
        ORDER BY end_time DESC
        LIMIT 20
    ) AS recent_sessions;

    -- 4. Calculate Learning Density (Questions answered in last 7 days)
    SELECT COALESCE(COUNT(*), 0)
    INTO v_learning_density
    FROM session_answers
    WHERE user_id = target_user_id
      AND answered_at >= v_7_days_ago::TEXT; -- answered_at is stored as ISO string in DB types, assuming comparable

    -- 5. Radar Data (Domain Proficiency)
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'domain', domain,
        'accuracy', ROUND(accuracy, 1),
        'total', total_qs
    )), '[]'::JSONB)
    INTO v_radar_data
    FROM (
        SELECT 
            q.domain,
            COUNT(CASE WHEN sa.is_correct THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100 AS accuracy,
            COUNT(*) as total_qs
        FROM session_answers sa
        JOIN questions q ON sa.question_id = q.id
        WHERE sa.user_id = target_user_id
        GROUP BY q.domain
    ) AS domain_stats;

    -- Calculate Min Domain Accuracy for Signal
    SELECT COALESCE(MIN(accuracy), 0)
    INTO v_domain_min_accuracy
    FROM (
        SELECT 
            COUNT(CASE WHEN sa.is_correct THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100 AS accuracy
        FROM session_answers sa
        JOIN questions q ON sa.question_id = q.id
        WHERE sa.user_id = target_user_id
        GROUP BY q.domain
    ) AS domain_stats;

    -- 6. History Data (Last 10 Sessions)
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'date', to_char(end_time, 'YYYY-MM-DD'),
        'score', ROUND(score::NUMERIC / NULLIF(total_questions, 0) * 100, 1),
        'mode', challenge_mode
    ) ORDER BY end_time ASC), '[]'::JSONB)
    INTO v_history_data
    FROM (
        SELECT end_time, score, total_questions, challenge_mode
        FROM exam_sessions
        WHERE user_id = target_user_id
          AND status = 'completed'
        ORDER BY end_time DESC
        LIMIT 10
    ) AS history;

    -- 7. Weak Questions (Wrong >= 3 times OR (Correct > 0 AND Wrong > 0))
    -- Limiting to top 20 problematic questions
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', q.id,
        'text', q.question_text,
        'domain', q.domain,
        'correct_count', stats.correct_count,
        'wrong_count', stats.wrong_count,
        'total_attempts', stats.total_attempts,
        'last_attempt_correct', stats.last_correct
    )), '[]'::JSONB)
    INTO v_weak_questions
    FROM (
        SELECT 
            question_id,
            COUNT(*) as total_attempts,
            COUNT(CASE WHEN is_correct THEN 1 END) as correct_count,
            COUNT(CASE WHEN NOT is_correct THEN 1 END) as wrong_count,
            (array_agg(is_correct ORDER BY answered_at DESC))[1] as last_correct
        FROM session_answers
        WHERE user_id = target_user_id
        GROUP BY question_id
        HAVING 
            COUNT(CASE WHEN NOT is_correct THEN 1 END) >= 3 -- Wrong 3+ times
            OR (COUNT(CASE WHEN is_correct THEN 1 END) > 0 AND COUNT(CASE WHEN NOT is_correct THEN 1 END) > 0) -- Flip-flopping
    ) AS stats
    JOIN questions q ON stats.question_id = q.id
    LIMIT 20;

    -- 8. Determine Signal
    -- Go: Avg >= 90% AND Sim 100% AND All Domains >= 70%
    -- Review: Avg >= 80% BUT (Min Domain < 70% OR Sim < 100%)
    -- Stop: Otherwise
    IF v_last_5_mock_avg >= 90 AND v_sim_accuracy = 100 AND v_domain_min_accuracy >= 70 THEN
        v_signal := 'GO';
    ELSIF v_last_5_mock_avg >= 80 THEN
        v_signal := 'REVIEW';
    ELSE
        v_signal := 'STOP';
    END IF;

    -- Construct Final JSON
    result := jsonb_build_object(
        'signal', v_signal,
        'metrics', jsonb_build_object(
            'last_5_mock_avg', v_last_5_mock_avg,
            'sim_accuracy', v_sim_accuracy,
            'avg_speed_seconds', v_avg_speed_seconds,
            'learning_density', v_learning_density, -- Questions in last 7 days
            'domain_min_accuracy', v_domain_min_accuracy
        ),
        'radar_data', v_radar_data,
        'history_data', v_history_data,
        'weak_questions', v_weak_questions
    );

    RETURN result;
END;
$$;
