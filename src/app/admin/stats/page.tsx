import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart } from 'lucide-react';

export default async function AdminStatsPage() {
    const supabase = createAdminClient();

    // Fetch basic stats
    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: sessionCount } = await supabase.from('exam_sessions').select('*', { count: 'exact', head: true });
    const { count: questionCount } = await supabase.from('questions').select('*', { count: 'exact', head: true });

    // Fetch recent sessions with user info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recentSessions } = await supabase
        .from('exam_sessions')
        .select(`
            *,
            users (
                email,
                display_name
            )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Link href="/admin">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white mr-2">
                                <ArrowLeft className="w-6 h-6" />
                            </Button>
                        </Link>
                        <BarChart className="w-8 h-8 text-rose-500" />
                        全体統計
                    </h1>
                    <p className="text-slate-400 mt-2">
                        システムの利用状況を確認します
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-slate-400 text-sm font-medium">総ユーザー数</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{userCount}名</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-slate-400 text-sm font-medium">総セッション数</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{sessionCount}回</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-slate-400 text-sm font-medium">登録問題数</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{questionCount}問</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Sessions Table */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">最近の学習履歴 (全ユーザー)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-400">
                                <thead className="text-xs text-slate-200 uppercase bg-slate-900/50 border-b border-slate-700">
                                    <tr>
                                        <th className="px-6 py-3">ユーザー</th>
                                        <th className="px-6 py-3">試験タイプ</th>
                                        <th className="px-6 py-3">日時</th>
                                        <th className="px-6 py-3">問題数</th>
                                        <th className="px-6 py-3">正答率</th>
                                        <th className="px-6 py-3">ステータス</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentSessions?.map((session: any) => {
                                        const accuracy = session.total_questions > 0
                                            ? Math.round((session.score / session.total_questions) * 100)
                                            : 0;
                                        return (
                                            <tr key={session.id} className="border-b border-slate-700 hover:bg-slate-700/20">
                                                <td className="px-6 py-4 font-medium text-white">
                                                    <div>{session.users?.display_name || 'No Name'}</div>
                                                    <div className="text-xs text-slate-500">{session.users?.email}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs border ${session.exam_type === 'ENCOR'
                                                        ? 'border-blue-500/50 text-blue-400'
                                                        : 'border-purple-500/50 text-purple-400'
                                                        }`}>
                                                        {session.exam_type === 'ENCOR' ? 'Core ENCOR' : 'Conce ENARSI'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {new Date(session.created_at).toLocaleString('ja-JP')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {session.total_questions}問
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-semibold ${accuracy >= 80 ? 'text-emerald-400' :
                                                        accuracy >= 60 ? 'text-amber-400' :
                                                            'text-red-400'
                                                        }`}>
                                                        {accuracy}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {session.status === 'completed' ? (
                                                        <span className="text-emerald-400 flex items-center gap-1">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                                            完了
                                                        </span>
                                                    ) : (
                                                        <span className="text-amber-400 flex items-center gap-1">
                                                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                                            中断
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
