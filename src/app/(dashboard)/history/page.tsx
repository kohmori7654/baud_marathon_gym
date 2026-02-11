import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    History as HistoryIcon,
    ChevronRight,
    CheckCircle,
    XCircle,
    Calendar
} from 'lucide-react';
import type { ExamSession } from '@/types/database';

export default async function HistoryPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data: sessions } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(50) as { data: ExamSession[] | null };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <HistoryIcon className="w-6 h-6" />
                    学習履歴
                </h1>
                <p className="text-slate-400 mt-1">
                    過去の学習セッションを確認できます
                </p>
            </div>

            {!sessions || sessions.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-12 text-center">
                        <p className="text-slate-400">まだ学習履歴がありません</p>
                        <Link href="/exam">
                            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-500">
                                試験を始める
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {sessions.map((session) => {
                        const accuracy = session.total_questions > 0
                            ? Math.round((session.score / session.total_questions) * 100)
                            : 0;
                        const isCompleted = session.status === 'completed';

                        return (
                            <Link key={session.id} href={`/history/${session.id}`}>
                                <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer">
                                    <CardContent className="py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        session.exam_type === 'ENCOR'
                                                            ? 'border-blue-500/50 text-blue-400'
                                                            : session.exam_type === 'ENARSI'
                                                                ? 'border-purple-500/50 text-purple-400'
                                                                : 'border-emerald-500/50 text-emerald-400'
                                                    }
                                                >
                                                    {session.exam_type === 'ENCOR' ? 'Core ENCOR' : 'Conce ENARSI'}
                                                </Badge>

                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(session.start_time).toLocaleDateString('ja-JP', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>

                                                <Badge variant="outline" className="border-slate-600 text-slate-400">
                                                    {session.total_questions}問
                                                </Badge>

                                                {session.domain_filter && (
                                                    <Badge variant="outline" className="border-slate-600 text-slate-400">
                                                        {session.domain_filter}
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {isCompleted ? (
                                                    <>
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                            <span className="text-emerald-400">{session.score}</span>
                                                            <span className="text-slate-500">/</span>
                                                            <XCircle className="w-4 h-4 text-red-500" />
                                                            <span className="text-red-400">{session.total_questions - session.score}</span>
                                                        </div>
                                                        <span className={`font-semibold ${accuracy >= 80
                                                            ? 'text-emerald-400'
                                                            : accuracy >= 60
                                                                ? 'text-amber-400'
                                                                : 'text-red-400'
                                                            }`}>
                                                            {accuracy}%
                                                        </span>
                                                    </>
                                                ) : (
                                                    <Badge className="bg-amber-500/20 text-amber-400 border-0">
                                                        中断
                                                    </Badge>
                                                )}
                                                <ChevronRight className="w-5 h-5 text-slate-500" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
