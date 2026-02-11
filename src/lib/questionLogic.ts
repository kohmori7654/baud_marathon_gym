import { createClient } from '@/lib/supabase/server';
import type { Question, QuestionWithOptions, TargetExamType, SessionAnswer, Option } from '@/types/database';

export type ChallengeMode = 'random' | 'weak_points' | 'hard_questions' | 'unanswered';

interface QuestionSelectionParams {
    userId: string;
    examType: TargetExamType;
    mode: ChallengeMode;
    domain?: string;
    count: number;
}

interface QuestionStats {
    question_id: string;
    attempts: number;
    correct: number;
    accuracy: number;
}

interface AnswerHistoryRow {
    question_id: string;
    is_correct: boolean;
    answered_at: string;
}

/**
 * 出題ロジック
 * 
 * 優先順位:
 * 1. 未実施優先: session_answersに記録がない問題
 * 2. 弱点克服: 直近5回の正答率が70%以下の問題
 * 3. 前回誤答: 直近の回答でis_correct = falseだった問題
 * 4. 難問チャレンジ: 全受験者の正答率下位20%
 * 5. ランダム: 試験配分に従ってランダム抽出
 */
export async function selectQuestions(params: QuestionSelectionParams): Promise<QuestionWithOptions[]> {
    const { userId, examType, mode, domain, count } = params;
    const supabase = await createClient();

    // Get all questions matching criteria
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('questions') as any)
        .select('*, options(*)')
        .order('created_at', { ascending: false });

    if (examType !== 'BOTH') {
        query = query.eq('exam_type', examType);
    }

    if (domain) {
        query = query.eq('domain', domain);
    }

    const { data: allQuestions, error } = await query as { data: (Question & { options: Option[] })[] | null; error: unknown };

    if (error || !allQuestions) {
        console.error('Error fetching questions:', error);
        return [];
    }

    // Get user's answer history
    const { data: userAnswers } = await supabase
        .from('session_answers')
        .select('question_id, is_correct, answered_at')
        .eq('user_id', userId)
        .order('answered_at', { ascending: false }) as { data: AnswerHistoryRow[] | null };

    // Calculate stats per question
    const questionStats = new Map<string, QuestionStats>();

    if (userAnswers) {
        for (const answer of userAnswers) {
            const existing = questionStats.get(answer.question_id);
            if (existing) {
                existing.attempts++;
                if (answer.is_correct) existing.correct++;
                existing.accuracy = existing.correct / existing.attempts;
            } else {
                questionStats.set(answer.question_id, {
                    question_id: answer.question_id,
                    attempts: 1,
                    correct: answer.is_correct ? 1 : 0,
                    accuracy: answer.is_correct ? 1 : 0,
                });
            }
        }
    }

    // Get recent 5 answers per question for weak points calculation
    const recentAnswersMap = new Map<string, boolean[]>();
    if (userAnswers) {
        for (const answer of userAnswers) {
            const existing = recentAnswersMap.get(answer.question_id) || [];
            if (existing.length < 5) {
                existing.push(answer.is_correct);
                recentAnswersMap.set(answer.question_id, existing);
            }
        }
    }

    // Get global stats for hard questions mode
    const { data: globalStats } = await supabase
        .from('session_answers')
        .select('question_id, is_correct') as { data: Pick<SessionAnswer, 'question_id' | 'is_correct'>[] | null };

    const globalQuestionStats = new Map<string, { attempts: number; correct: number }>();
    if (globalStats) {
        for (const answer of globalStats) {
            const existing = globalQuestionStats.get(answer.question_id);
            if (existing) {
                existing.attempts++;
                if (answer.is_correct) existing.correct++;
            } else {
                globalQuestionStats.set(answer.question_id, {
                    attempts: 1,
                    correct: answer.is_correct ? 1 : 0,
                });
            }
        }
    }

    // Score and sort questions based on mode
    const scoredQuestions = allQuestions.map((q) => {
        let score = 0;
        const stats = questionStats.get(q.id);
        const recentAnswers = recentAnswersMap.get(q.id);
        const globalStat = globalQuestionStats.get(q.id);

        switch (mode) {
            case 'unanswered':
                // Prioritize unanswered questions
                if (!stats) score = 1000;
                break;

            case 'weak_points':
                // Prioritize questions with <70% accuracy in recent 5 attempts
                if (recentAnswers && recentAnswers.length > 0) {
                    const recentAccuracy = recentAnswers.filter(Boolean).length / recentAnswers.length;
                    if (recentAccuracy <= 0.7) {
                        score = 1000 - recentAccuracy * 1000;
                    }
                }
                // Also boost last wrong answers
                if (userAnswers && userAnswers.length > 0) {
                    const lastAnswer = userAnswers.find(a => a.question_id === q.id);
                    if (lastAnswer && !lastAnswer.is_correct) {
                        score += 500;
                    }
                }
                break;

            case 'hard_questions':
                // Prioritize questions with low global accuracy (bottom 20%)
                if (globalStat && globalStat.attempts >= 3) {
                    const globalAccuracy = globalStat.correct / globalStat.attempts;
                    if (globalAccuracy <= 0.5) {
                        score = 1000 - globalAccuracy * 1000;
                    }
                }
                break;

            case 'random':
            default:
                // Random with slight boost for unanswered
                score = Math.random() * 100;
                if (!stats) score += 50;
                break;
        }

        return { question: q, score };
    });

    // Sort by score (descending) and take top N
    scoredQuestions.sort((a, b) => b.score - a.score);

    const selectedQuestions = scoredQuestions
        .slice(0, count)
        .map(sq => sq.question as QuestionWithOptions);

    // Shuffle the final selection for variety
    for (let i = selectedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectedQuestions[i], selectedQuestions[j]] = [selectedQuestions[j], selectedQuestions[i]];
    }

    return selectedQuestions;
}

/**
 * Get domains for a specific exam type
 */
export async function getExamDomains(examType: TargetExamType): Promise<string[]> {
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('questions') as any)
        .select('domain');

    if (examType !== 'BOTH') {
        query = query.eq('exam_type', examType);
    }

    const { data } = await query as { data: { domain: string }[] | null };

    if (!data) return [];

    const domains = [...new Set(data.map(d => d.domain))];
    return domains.sort();
}
