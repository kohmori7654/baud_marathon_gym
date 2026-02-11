import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Play,
    TrendingUp,
    Target,
    Clock,
    BookOpen,
    Award,
    MessageSquarePlus,
    Shield,
    Users
} from 'lucide-react';
import type { User, ExamSession } from '@/types/database';

export default async function DashboardPage() {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null; // Will be handled by middleware redirect
    }
    // const user = { id: 'mock-id' }; // Mock user for testing

    // Get user data using Admin Client to ensure we get the role regardless of RLS quirks
    const { data: userData } = await adminClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single() as { data: User | null };

    // Get recent sessions stats
    // Valid to use adminClient here too to ensure we show the user's data even if RLS is strict
    // RLS policy "Users can view own sessions" should work, but for dashboard stability adminClient is safer if auth context is flaky
    const { data: recentSessions } = await adminClient
        .from('exam_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('end_time', { ascending: false })
        .limit(5) as { data: ExamSession[] | null };

    // Get total count
    const { count: totalSessionsCount } = await adminClient
        .from('exam_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');

    // Get study dates for streak calculation (fetch last 365 days of sessions to be safe/efficient)
    const { data: sessionDates } = await adminClient
        .from('exam_sessions')
        .select('end_time')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('end_time', { ascending: false }) as { data: { end_time: string | null }[] | null };

    // Calculate streak
    let currentStreak = 0;
    if (sessionDates && sessionDates.length > 0) {
        const uniqueDates = new Set();
        sessionDates.forEach(s => {
            if (s.end_time) {
                // Convert to JST date string YYYY-MM-DD
                const date = new Date(s.end_time);
                const jstDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
                uniqueDates.add(jstDate.toISOString().split('T')[0]);
            }
        });

        const sortedDates = Array.from(uniqueDates).sort().reverse() as string[];

        if (sortedDates.length > 0) {
            const today = new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
            const todayStr = new Date(today).toISOString().split('T')[0];

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            // Check if streak is active (studied today or yesterday)
            if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
                currentStreak = 1;
                let checkDate = new Date(sortedDates[0]);

                for (let i = 1; i < sortedDates.length; i++) {
                    checkDate.setDate(checkDate.getDate() - 1);
                    const checkDateStr = checkDate.toISOString().split('T')[0];
                    if (sortedDates[i] === checkDateStr) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }
            }
        }
    }

    // Calculate stats
    const totalSessions = totalSessionsCount || 0;
    const averageScore = (recentSessions?.length || 0) > 0
        ? Math.round(
            (recentSessions?.reduce((sum, s) => sum + (s.score / s.total_questions) * 100, 0) || 0) / (recentSessions?.length || 1)
        )
        : 0;


    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">
                        ようこそ、{userData?.display_name || userData?.email?.split('@')[0]}さん
                    </h1>
                    <p className="text-slate-400 mt-1">
                        今日も学習を頑張りましょう！
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        href="https://docs.google.com/forms/d/e/1FAIpQLSdf5LiDD3llmNtWiXUu8grAmcekxj2A1BrZtPtFjN0IL4jx5A/viewform?usp=header"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-emerald-400">
                            <MessageSquarePlus className="w-4 h-4 mr-2" />
                            改修/バグ報告
                        </Button>
                    </Link>
                    {userData?.role === 'admin' && (
                        <div className="flex gap-2">
                            <Link href="/admin">
                                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-400">
                                    <Shield className="w-4 h-4 mr-2" />
                                    管理者メニュー
                                </Button>
                            </Link>
                            <Link href="/supporter">
                                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-amber-400">
                                    <Users className="w-4 h-4 mr-2" />
                                    サポーターメニュー
                                </Button>
                            </Link>
                        </div>
                    )}
                    {userData?.role === 'supporter' && (
                        <Link href="/supporter">
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-amber-400">
                                <Users className="w-4 h-4 mr-2" />
                                サポーターメニュー
                            </Button>
                        </Link>
                    )}
                    {userData?.target_exam && (
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 px-3 py-1">
                            {userData.target_exam === 'BOTH' ? 'Core ENCOR & Conce ENARSI' : (userData.target_exam === 'ENCOR' ? 'Core ENCOR' : 'Conce ENARSI')}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 hover:border-emerald-500/50 transition-colors cursor-pointer">
                    <Link href="/exam">
                        <CardHeader>
                            <Play className="h-8 w-8 text-emerald-400 mb-2" />
                            <CardTitle className="text-white">試験を開始する</CardTitle>
                            <CardDescription className="text-slate-400">
                                ランダム出題で学習を始めましょう
                            </CardDescription>
                        </CardHeader>
                    </Link>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 hover:border-amber-500/50 transition-colors cursor-pointer">
                    <Link href="/exam?mode=weak_points">
                        <CardHeader>
                            <Target className="h-8 w-8 text-amber-400 mb-2" />
                            <CardTitle className="text-white">弱点克服モード</CardTitle>
                            <CardDescription className="text-slate-400">
                                苦手な問題を集中的に練習
                            </CardDescription>
                        </CardHeader>
                    </Link>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 hover:border-purple-500/50 transition-colors cursor-pointer">
                    <Link href="/exam?mode=hard_questions">
                        <CardHeader>
                            <TrendingUp className="h-8 w-8 text-purple-400 mb-2" />
                            <CardTitle className="text-white">難問チャレンジ</CardTitle>
                            <CardDescription className="text-slate-400">
                                正答率の低い難問に挑戦
                            </CardDescription>
                        </CardHeader>
                    </Link>
                </Card>
            </div>

            {/* Stats Cards */}
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
                        <p className="text-xs text-slate-400">回の学習を完了</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">
                            平均正答率
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{averageScore}%</div>
                        <p className="text-xs text-slate-400">直近5回の平均</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">
                            目標達成まで
                        </CardTitle>
                        <Target className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {Math.max(0, 80 - averageScore)}%
                        </div>
                        <p className="text-xs text-slate-400">目標: 正答率80%</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">
                            連続学習日数
                        </CardTitle>
                        <Award className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{currentStreak}日</div>
                        <p className="text-xs text-slate-400">継続は力なり</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Sessions */}
            {recentSessions && recentSessions.length > 0 && (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            最近の学習履歴
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentSessions.map((session) => (
                                <div
                                    key={session.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant="outline"
                                            className={
                                                session.exam_type === 'ENCOR'
                                                    ? 'border-blue-500/50 text-blue-400'
                                                    : 'border-purple-500/50 text-purple-400'
                                            }
                                        >
                                            {session.exam_type === 'ENCOR' ? 'Core ENCOR' : 'Conce ENARSI'}
                                        </Badge>
                                        <span className="text-slate-400 text-sm">
                                            {session.total_questions}問
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-semibold ${(session.score / session.total_questions) >= 0.8
                                            ? 'text-emerald-400'
                                            : (session.score / session.total_questions) >= 0.6
                                                ? 'text-amber-400'
                                                : 'text-red-400'
                                            }`}>
                                            {Math.round((session.score / session.total_questions) * 100)}%
                                        </span>
                                        <span className="text-slate-400 text-sm">
                                            {new Date(session.end_time || '').toLocaleDateString('ja-JP')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
