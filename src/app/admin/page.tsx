import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Shield,
    Users,
    FileQuestion,
    Upload,
    UserCheck,
    BarChart,
    ArrowLeft
} from 'lucide-react';

export default async function AdminPage() {
    const supabase = await createClient();

    // Get counts
    const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

    const { count: questionCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

    const { count: sessionCount } = await supabase
        .from('exam_sessions')
        .select('*', { count: 'exact', head: true });

    const adminCards = [
        {
            href: '/admin/users',
            icon: Users,
            title: 'ユーザー管理',
            description: 'ユーザーの登録・編集・ロール管理',
            stat: `${userCount || 0}人`,
            color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:border-blue-500/50',
            iconColor: 'text-blue-400'
        },
        {
            href: '/admin/questions',
            icon: FileQuestion,
            title: '問題管理',
            description: '問題の検索・編集・削除',
            stat: `${questionCount || 0}問`,
            color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 hover:border-purple-500/50',
            iconColor: 'text-purple-400'
        },
        {
            href: '/admin/questions/import',
            icon: Upload,
            title: '問題インポート',
            description: 'JSON一括インポート・更新',
            stat: 'Bulk Upsert',
            color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 hover:border-emerald-500/50',
            iconColor: 'text-emerald-400'
        },
        {
            href: '/admin/assignments',
            icon: UserCheck,
            title: 'サポーター割り当て',
            description: 'サポーターと受験者の紐づけ',
            stat: '管理',
            color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 hover:border-amber-500/50',
            iconColor: 'text-amber-400'
        },
        {
            href: '/admin/stats',
            icon: BarChart,
            title: '全体統計',
            description: '全ユーザーの学習状況確認',
            stat: `${sessionCount || 0}セッション`,
            color: 'from-rose-500/20 to-red-500/20 border-rose-500/30 hover:border-rose-500/50',
            iconColor: 'text-rose-400'
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white mr-2">
                                <ArrowLeft className="w-6 h-6" />
                            </Button>
                        </Link>
                        <Shield className="w-8 h-8 text-amber-500" />
                        管理者ダッシュボード
                    </h1>
                    <p className="text-slate-400 mt-2">
                        システム全体の管理を行います
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {adminCards.map((card) => (
                        <Link key={card.href} href={card.href}>
                            <Card className={`bg-gradient-to-br ${card.color} transition-colors cursor-pointer h-full`}>
                                <CardHeader>
                                    <card.icon className={`h-8 w-8 ${card.iconColor} mb-2`} />
                                    <CardTitle className="text-white">{card.title}</CardTitle>
                                    <CardDescription className="text-slate-400">
                                        {card.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold text-white">
                                        {card.stat}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
