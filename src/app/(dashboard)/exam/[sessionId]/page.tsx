'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft,
    ChevronRight,
    Flag,
    Loader2,
    CheckCircle,
    XCircle,
    Image as ImageIcon,
    Maximize2,
    Minimize2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SingleChoice } from '@/components/questions/SingleChoice';
import { MultiChoice } from '@/components/questions/MultiChoice';
import { DragDrop } from '@/components/questions/DragDrop';
import { Simulation } from '@/components/questions/Simulation';
import { ExplanationViewer } from '@/components/ExplanationViewer';
import { createClient } from '@/lib/supabase/client';
import { validateAnswer, formatAnswerForStorage, type AnswerData } from '@/lib/answerValidator';
import type { QuestionWrapper, ExamSession } from '@/types/database';

interface ExamSessionPageProps {
    params: Promise<{ sessionId: string }>;
}

interface AnsweredQuestion {
    questionId: string;
    isCorrect: boolean;
    answerData: AnswerData;
}

export default function ExamSessionPage({ params }: ExamSessionPageProps) {
    const router = useRouter();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [session, setSession] = useState<ExamSession | null>(null);
    const [questions, setQuestions] = useState<QuestionWrapper[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [showResult, setShowResult] = useState(false);
    const [currentAnswer, setCurrentAnswer] = useState<AnswerData | null>(null);
    const [isCorrect, setIsCorrect] = useState(false);
    const [answeredQuestions, setAnsweredQuestions] = useState<AnsweredQuestion[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [simulationFrameExpanded, setSimulationFrameExpanded] = useState(false);

    const SIMULATION_IFRAME_URL = 'https://baudroie-virtual-campus.web.app/';

    // Resolve params
    useEffect(() => {
        params.then(p => setSessionId(p.sessionId));
    }, [params]);

    // Load session and questions
    useEffect(() => {
        if (!sessionId) return;

        async function loadSession() {
            const supabase = createClient();

            // Load session
            const { data: sessionData, error: sessionError } = await supabase
                .from('exam_sessions')
                .select('*')
                .eq('id', sessionId!)
                .single() as { data: ExamSession | null; error: unknown };

            if (sessionError || !sessionData) {
                router.push('/exam');
                return;
            }

            setSession(sessionData);

            // Build base question query: fetch ALL matching (no limit) for proper random/unanswered selection
            let query = supabase
                .from('questions')
                .select('*, options(*), question_images(*)');

            if (sessionData.exam_type !== 'BOTH') {
                query = query.eq('exam_type', sessionData.exam_type);
            }

            if (sessionData.domain_filter) {
                query = query.eq('domain', sessionData.domain_filter);
            }

            const qType = sessionData.question_type as string | null;
            if (qType === 'no_simulation') {
                query = query.neq('question_type', 'Simulation');
            } else if (qType) {
                query = query.eq('question_type', qType);
            }

            const { data: questionsData } = await query;

            if (!questionsData || questionsData.length === 0) {
                setIsLoading(false);
                return;
            }

            const totalRequested = sessionData.total_questions;
            let selectedQuestions: typeof questionsData;

            if (sessionData.challenge_mode === 'unanswered') {
                // 未実施優先: まだ解いていない問題を優先、なければ実施回数の少ない問題を優先
                const { data: answerCounts } = await supabase
                    .from('session_answers')
                    .select('question_id')
                    .eq('user_id', sessionData.user_id) as { data: { question_id: string }[] | null };

                const countByQuestion: Record<string, number> = {};
                (answerCounts || []).forEach((row: { question_id: string }) => {
                    countByQuestion[row.question_id] = (countByQuestion[row.question_id] || 0) + 1;
                });

                const withCount = questionsData.map((q: QuestionWrapper) => ({
                    q,
                    attempts: countByQuestion[q.id] ?? 0
                }));
                withCount.sort((a, b) => a.attempts - b.attempts || Math.random() - 0.5);
                selectedQuestions = withCount.slice(0, totalRequested).map(x => x.q);
            } else {
                // ランダム・その他: 指定の試験種別・分野・問題形式に沿ってランダムに出題
                const shuffled = [...questionsData].sort(() => Math.random() - 0.5);
                selectedQuestions = shuffled.slice(0, totalRequested);
            }

            setQuestions(selectedQuestions);

            if (selectedQuestions.length < totalRequested) {
                setSession(prev => prev ? { ...prev, total_questions: selectedQuestions.length } : null);
                await (supabase.from('exam_sessions') as any)
                    .update({ total_questions: selectedQuestions.length })
                    .eq('id', sessionData.id);
            }

            setIsLoading(false);
        }

        loadSession();
    }, [sessionId, router]);

    const currentQuestion = questions[currentIndex];
    const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
    const answeredCount = answeredQuestions.length;
    const correctCount = answeredQuestions.filter(a => a.isCorrect).length;

    const handleAnswer = useCallback(async (answerData: AnswerData) => {
        if (!currentQuestion || !session) return;

        setIsSubmitting(true);

        // Validate answer
        const result = validateAnswer(currentQuestion, answerData);
        setCurrentAnswer(answerData);
        setIsCorrect(result.isCorrect);
        setShowResult(true);

        // Save answer to database
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('session_answers') as any).insert({
                session_id: session.id,
                question_id: currentQuestion.id,
                user_id: user.id,
                answer_data: formatAnswerForStorage(currentQuestion.question_type, answerData),
                is_correct: result.isCorrect,
            });
        }

        // Track locally
        setAnsweredQuestions(prev => [
            ...prev,
            { questionId: currentQuestion.id, isCorrect: result.isCorrect, answerData }
        ]);

        setIsSubmitting(false);
    }, [currentQuestion, session]);

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setShowResult(false);
            setCurrentAnswer(null);
            setSimulationFrameExpanded(false);
        }
    };

    const handleFinish = async () => {
        if (!session) return;

        const supabase = createClient();

        // Update session
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('exam_sessions') as any)
            .update({
                status: 'completed',
                score: correctCount,
                end_time: new Date().toISOString(),
            })
            .eq('id', session.id);

        router.push(`/history/${session.id}`);
    };

    const isLastQuestion = currentIndex === questions.length - 1;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-400">問題が見つかりませんでした</p>
                <Button onClick={() => router.push('/exam')} className="mt-4">
                    戻る
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Progress Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Badge className={
                        session?.exam_type === 'ENCOR'
                            ? 'bg-blue-900/50 text-blue-200 border-blue-800 hover:bg-blue-900/70'
                            : 'bg-purple-900/50 text-purple-200 border-purple-800 hover:bg-purple-900/70'
                    }>
                        {session?.exam_type === 'ENCOR' ? 'Core ENCOR' : 'Conce ENARSI'}
                    </Badge>
                    <span className="text-slate-400">
                        {currentIndex + 1} / {questions.length}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-400">{correctCount}</span>
                    <XCircle className="w-4 h-4 text-red-500 ml-2" />
                    <span className="text-red-400">{answeredCount - correctCount}</span>
                </div>
            </div>

            <Progress value={progress} className="h-2 bg-slate-700" />

            {/* Question Card */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <Badge variant="outline" className="mb-2 border-slate-600 text-slate-400">
                                {currentQuestion.domain}
                            </Badge>
                            <CardTitle className="text-white text-lg leading-relaxed whitespace-pre-wrap">
                                {currentQuestion.question_text}
                            </CardTitle>
                        </div>
                        <Badge className={
                            currentQuestion.question_type === 'Single' ? 'bg-blue-500/20 text-blue-400' :
                                currentQuestion.question_type === 'Multi' ? 'bg-purple-500/20 text-purple-400' :
                                    currentQuestion.question_type === 'DragDrop' ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-emerald-500/20 text-emerald-400'
                        }>
                            {currentQuestion.question_type}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Question ID and other info */}
                    <div className="flex justify-between items-center mb-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-semibold text-white">
                                    Question {currentIndex + 1}
                                </h2>
                                {/* Display Question ID prominently */}
                                {currentQuestion.display_id && (
                                    <span className="font-mono text-lg text-slate-400 font-medium">
                                        #{currentQuestion.exam_type === 'ENCOR' ? 'COR' : 'CON'}
                                        {currentQuestion.display_id.toString().padStart(6, '0')}
                                    </span>
                                )}
                            </div>
                        </div>
                        <span className="text-sm text-slate-400">
                            {currentIndex + 1} / {questions.length}
                        </span>
                    </div>

                    {/* Question Images */}
                    {(currentQuestion.question_images && currentQuestion.question_images.length > 0) ? (
                        <div className="grid grid-cols-1 gap-4">
                            {currentQuestion.question_images.sort((a, b) => a.sort_order - b.sort_order).map((img, idx) => (
                                <div key={idx} className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900 p-4">
                                    <img
                                        src={
                                            img.image_data.startsWith('http') ? img.image_data :
                                                img.image_data.startsWith('data:') ? img.image_data :
                                                    `data:image/png;base64,${img.image_data}`
                                        }
                                        alt={`Question image ${idx + 1}`}
                                        className="max-w-full h-auto mx-auto"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : currentQuestion.image_base64 && (
                        <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900 p-4">
                            <img
                                src={
                                    currentQuestion.image_base64.startsWith('http') ? currentQuestion.image_base64 :
                                        currentQuestion.image_base64.startsWith('data:') ? currentQuestion.image_base64 :
                                            `data:image/png;base64,${currentQuestion.image_base64}`
                                }
                                alt="Question image"
                                className="max-w-full h-auto mx-auto"
                            />
                        </div>
                    )}

                    {/* Simulation: 問題文とJSON貼り付けの間にインラインフレーム + 拡大表示 */}
                    {currentQuestion.question_type === 'Simulation' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">バーチャルキャンパス（シミュレーション環境）</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:bg-slate-800 hover:text-white"
                                    onClick={() => setSimulationFrameExpanded(!simulationFrameExpanded)}
                                    aria-label={simulationFrameExpanded ? '縮小' : '拡大（画面の約9割）'}
                                >
                                    {simulationFrameExpanded ? (
                                        <Minimize2 className="w-4 h-4" />
                                    ) : (
                                        <Maximize2 className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                            <div
                                className={
                                    simulationFrameExpanded
                                        ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4'
                                        : 'relative rounded-lg overflow-hidden border border-slate-700 bg-slate-900'
                                }
                                onClick={simulationFrameExpanded ? () => setSimulationFrameExpanded(false) : undefined}
                            >
                                {simulationFrameExpanded && (
                                    <>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
                                            onClick={(e) => { e.stopPropagation(); setSimulationFrameExpanded(false); }}
                                            aria-label="閉じる"
                                        >
                                            <Minimize2 className="w-5 h-5" />
                                        </Button>
                                        <div
                                            className="absolute inset-0 flex items-center justify-center p-4"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <iframe
                                                src={SIMULATION_IFRAME_URL}
                                                title="Baudroie Virtual Campus"
                                                className="w-[90vw] h-[90vh] rounded-lg border border-slate-600"
                                            />
                                        </div>
                                    </>
                                )}
                                {!simulationFrameExpanded && (
                                    <iframe
                                        src={SIMULATION_IFRAME_URL}
                                        title="Baudroie Virtual Campus"
                                        className="w-full h-[400px] border-0"
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Question Type Component */}
                    {/* Safeguard: Ensure options array exists */}
                    {currentQuestion.question_type === 'Single' && (
                        <SingleChoice
                            key={currentQuestion.id}
                            options={currentQuestion.options || []}
                            onAnswer={(selected) => handleAnswer({ selectedOptions: selected })}
                            disabled={showResult || isSubmitting}
                            showResult={showResult}
                            userAnswer={currentAnswer?.selectedOptions}
                        />
                    )}

                    {currentQuestion.question_type === 'Multi' && (
                        <MultiChoice
                            key={currentQuestion.id}
                            options={currentQuestion.options || []}
                            onAnswer={(selected) => handleAnswer({ selectedOptions: selected })}
                            disabled={showResult || isSubmitting}
                            showResult={showResult}
                            userAnswer={currentAnswer?.selectedOptions}
                        />
                    )}

                    {currentQuestion.question_type === 'DragDrop' && (
                        <DragDrop
                            key={currentQuestion.id}
                            question={currentQuestion as any} // Cast to any to avoid strict type checks for now, or ensure QuestionWithOptions is compatible
                            onAnswerChange={(pairs) => handleAnswer({ pairs })}
                            disabled={showResult || isSubmitting}
                            showResult={showResult}
                            userAnswer={currentAnswer?.pairs}
                        />
                    )}

                    {currentQuestion.question_type === 'Simulation' && (
                        <>
                            <Simulation
                                key={currentQuestion.id}
                                targetJson={currentQuestion.simulation_target_json as Record<string, string> | null}
                                onAnswer={(config) => handleAnswer({ config })}
                                disabled={showResult || isSubmitting}
                                showResult={showResult}
                                userAnswer={currentAnswer?.config}
                            />
                        </>
                    )}

                    {/* Explanation */}
                    {showResult && currentQuestion.explanation && (
                        <ExplanationViewer
                            explanation={currentQuestion.explanation}
                            isCorrect={isCorrect}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    onClick={() => router.push('/exam')}
                    className="border-slate-600 text-slate-400 hover:bg-slate-800"
                >
                    <Flag className="w-4 h-4 mr-2" />
                    中断
                </Button>

                {showResult && (
                    isLastQuestion ? (
                        <Button
                            onClick={handleFinish}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                        >
                            結果を確認
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNext}
                            className="bg-emerald-600 hover:bg-emerald-500"
                        >
                            次の問題
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    )
                )}
            </div>
        </div>
    );
}
