import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    Trophy,
    Target,
    Clock,
    RotateCcw
} from 'lucide-react';
import type { ExamSession, SessionAnswer } from '@/types/database';

interface SessionDetailPageProps {
    params: Promise<{ sessionId: string }>;
}

export default async function SessionDetailPage({ params }: SessionDetailPageProps) {
    const { sessionId } = await params;
    const supabase = await createClient();

    // Get session with answers
    const { data: session, error } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('id', sessionId)
        .single() as { data: ExamSession | null; error: unknown };

    if (error || !session) {
        notFound();
    }

    // Get answers with question details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: answers } = await (supabase.from('session_answers') as any)
        .select('*, questions!inner(question_text, domain, question_type, exam_type, display_id)')
        .eq('session_id', sessionId)
        .order('answered_at', { ascending: true }) as { data: (SessionAnswer & { questions: { question_text: string; domain: string; question_type: string } })[] | null };

    const accuracy = session.total_questions > 0
        ? Math.round((session.score / session.total_questions) * 100)
        : 0;

    const duration = session.end_time
        ? Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 1000 / 60)
        : 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/history">
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white">セッション結果</h1>
                    <p className="text-slate-400 text-sm">
                        {new Date(session.start_time).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                </div>
            </div>

            {/* Score Card */}
            <Card className={`border-2 ${accuracy >= 80
                ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/50'
                : accuracy >= 60
                    ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/50'
                    : 'bg-gradient-to-br from-red-500/20 to-pink-500/20 border-red-500/50'
                }`}>
                <CardContent className="py-8">
                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            {accuracy >= 80 ? (
                                <Trophy className="w-16 h-16 text-emerald-400" />
                            ) : accuracy >= 60 ? (
                                <Target className="w-16 h-16 text-amber-400" />
                            ) : (
                                <RotateCcw className="w-16 h-16 text-red-400" />
                            )}
                        </div>

                        <div className={`text-6xl font-bold ${accuracy >= 80 ? 'text-emerald-400' :
                            accuracy >= 60 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                            {accuracy}%
                        </div>

                        <p className="text-slate-400 mt-2 text-lg">
                            {session.score} / {session.total_questions} 正解
                        </p>

                        <div className="flex justify-center gap-6 mt-6">
                            <div className="text-center">
                                <Badge variant="outline" className={
                                    session.exam_type === 'ENCOR'
                                        ? 'border-blue-500/50 text-blue-400'
                                        : 'border-purple-500/50 text-purple-400'
                                }>
                                    {session.exam_type === 'ENCOR' ? 'Core ENCOR' : 'Conce ENARSI'}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-slate-400">
                                <Clock className="w-4 h-4" />
                                <span>{duration}分</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid md:grid-cols-2 gap-4">
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-400">正解</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            <span className="text-2xl font-bold text-emerald-400">{session.score}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-400">不正解</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-500" />
                            <span className="text-2xl font-bold text-red-400">{session.total_questions - session.score}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Question Results */}
            {answers && answers.length > 0 && (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">問題別結果</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {answers.map((answer, index) => (
                                <div
                                    key={answer.id}
                                    className={`p-4 rounded-lg border ${answer.is_correct
                                        ? 'border-emerald-500/30 bg-emerald-500/10'
                                        : 'border-red-500/30 bg-red-500/10'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-slate-300">
                                                {index + 1}
                                            </span>
                                            <div>
                                                <p className="text-sm text-slate-300 line-clamp-2">
                                                    {(answer.questions as any).question_text}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    {(answer.questions as any).display_id && (
                                                        <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 text-xs font-mono">
                                                            {`${(answer.questions as any).exam_type === 'ENCOR' ? 'COR' : 'CON'}${(answer.questions as any).display_id.toString().padStart(6, '0')}`}
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                                                        {(answer.questions as any).domain}
                                                    </Badge>
                                                    <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                                                        {(answer.questions as any).question_type}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        {answer.is_correct ? (
                                            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-4">
                <Link href="/history">
                    <Button className="bg-slate-700 hover:bg-slate-600 text-white border-0">
                        履歴に戻る
                    </Button>
                </Link>
                <Link href="/exam">
                    <Button className="bg-emerald-600 hover:bg-emerald-500">
                        新しい試験を開始
                    </Button>
                </Link>
            </div>
        </div>
    );
}
