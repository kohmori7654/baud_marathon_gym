import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    BarChart3,
    TrendingUp,
    Target,
    BookOpen,
    Brain
} from 'lucide-react';
import type { ExamSession, SessionAnswer } from '@/types/database';

export default async function StatsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    // Get all completed sessions
    const { data: sessions } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed') as { data: ExamSession[] | null };

    // Get all answers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: answers } = await (supabase.from('session_answers') as any)
        .select('*, questions!inner(domain, question_type, exam_type)')
        .eq('user_id', user.id) as { data: (SessionAnswer & { questions: { domain: string; question_type: string; exam_type: string } })[] | null };

    // Calculate statistics
    const totalSessions = sessions?.length || 0;
    const totalQuestions = answers?.length || 0;
    const correctAnswers = answers?.filter(a => a.is_correct).length || 0;
    const overallAccuracy = totalQuestions > 0
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : 0;

    // Domain statistics
    const domainStats = new Map<string, { correct: number; total: number }>();
    answers?.forEach(answer => {
        const domain = (answer.questions as any).domain;
        const existing = domainStats.get(domain) || { correct: 0, total: 0 };
        existing.total++;
        if (answer.is_correct) existing.correct++;
        domainStats.set(domain, existing);
    });

    // Question type statistics  
    const typeStats = new Map<string, { correct: number; total: number }>();
    answers?.forEach(answer => {
        const type = (answer.questions as any).question_type;
        const existing = typeStats.get(type) || { correct: 0, total: 0 };
        existing.total++;
        if (answer.is_correct) existing.correct++;
        typeStats.set(type, existing);
    });

    // Exam type statistics
    const examStats = new Map<string, { correct: number; total: number }>();
    answers?.forEach(answer => {
        const exam = (answer.questions as any).exam_type;
        const existing = examStats.get(exam) || { correct: 0, total: 0 };
        existing.total++;
        if (answer.is_correct) existing.correct++;
        examStats.set(exam, existing);
    });

    const sortedDomains = [...domainStats.entries()]
        .map(([domain, stats]) => ({
            domain,
            accuracy: Math.round((stats.correct / stats.total) * 100),
            total: stats.total,
            correct: stats.correct
        }))
        .sort((a, b) => a.accuracy - b.accuracy);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-6 h-6" />
                    学習統計
                </h1>
                <p className="text-slate-400 mt-1">
                    あなたの学習進捗を分析します
                </p>
            </div>

            {/* Overview Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">
                            総セッション数
                        </CardTitle>
                        <BookOpen className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{totalSessions}</div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">
                            総解答数
                        </CardTitle>
                        <Brain className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{totalQuestions}</div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">
                            正解数
                        </CardTitle>
                        <Target className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{correctAnswers}</div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">
                            総合正答率
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${overallAccuracy >= 80 ? 'text-emerald-400' :
                            overallAccuracy >= 60 ? 'text-amber-400' : 'text-red-400'
                            }`}>{overallAccuracy}%</div>
                    </CardContent>
                </Card>
            </div>

            {/* Exam Type Stats */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">試験種別ごとの正答率</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[...examStats.entries()].map(([exam, stats]) => {
                        const accuracy = Math.round((stats.correct / stats.total) * 100);
                        return (
                            <div key={exam} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={
                                            exam === 'ENCOR'
                                                ? 'border-blue-500/50 text-blue-400'
                                                : 'border-purple-500/50 text-purple-400'
                                        }>
                                            {exam === 'ENCOR' ? 'Core ENCOR' : 'Conce ENARSI'}
                                        </Badge>
                                        <span className="text-sm text-slate-400">
                                            ({stats.correct}/{stats.total})
                                        </span>
                                    </div>
                                    <span className={`font-semibold ${accuracy >= 80 ? 'text-emerald-400' :
                                        accuracy >= 60 ? 'text-amber-400' : 'text-red-400'
                                        }`}>{accuracy}%</span>
                                </div>
                                <Progress
                                    value={accuracy}
                                    className="h-2 bg-slate-700"
                                />
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Domain Stats */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">分野別正答率（弱点順）</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {sortedDomains.length === 0 ? (
                        <p className="text-slate-400 text-center py-4">データがありません</p>
                    ) : (
                        sortedDomains.map(({ domain, accuracy, total, correct }) => (
                            <div key={domain} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-300">{domain}</span>
                                        <span className="text-sm text-slate-500">
                                            ({correct}/{total})
                                        </span>
                                    </div>
                                    <span className={`font-semibold ${accuracy >= 80 ? 'text-emerald-400' :
                                        accuracy >= 60 ? 'text-amber-400' : 'text-red-400'
                                        }`}>{accuracy}%</span>
                                </div>
                                <Progress
                                    value={accuracy}
                                    className="h-2 bg-slate-700"
                                />
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Question Type Stats */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">問題形式別正答率</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...typeStats.entries()].map(([type, stats]) => {
                            const accuracy = Math.round((stats.correct / stats.total) * 100);
                            return (
                                <div
                                    key={type}
                                    className={`p-4 rounded-lg border ${accuracy >= 80 ? 'border-emerald-500/30 bg-emerald-500/10' :
                                        accuracy >= 60 ? 'border-amber-500/30 bg-amber-500/10' :
                                            'border-red-500/30 bg-red-500/10'
                                        }`}
                                >
                                    <Badge className={
                                        type === 'Single' ? 'bg-blue-500/20 text-blue-400 border-0' :
                                            type === 'Multi' ? 'bg-purple-500/20 text-purple-400 border-0' :
                                                type === 'DragDrop' ? 'bg-amber-500/20 text-amber-400 border-0' :
                                                    'bg-emerald-500/20 text-emerald-400 border-0'
                                    }>
                                        {type}
                                    </Badge>
                                    <div className={`text-2xl font-bold mt-2 ${accuracy >= 80 ? 'text-emerald-400' :
                                        accuracy >= 60 ? 'text-amber-400' : 'text-red-400'
                                        }`}>
                                        {accuracy}%
                                    </div>
                                    <p className="text-sm text-slate-400">
                                        {stats.correct}/{stats.total}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
