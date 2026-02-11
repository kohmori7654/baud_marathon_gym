'use client';

import {
    ResponsiveContainer,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    AlertTriangle,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Target,
    Clock,
    BrainCircuit,
    AlertCircle
} from 'lucide-react';
import type { StudentAnalyticsData } from '@/types/analytics';

interface StudentAnalyticsProps {
    data: StudentAnalyticsData;
}

export function StudentAnalytics({ data }: StudentAnalyticsProps) {
    const { signal, metrics, radar_data, history_data, weak_questions } = data;

    // Signal Colors
    const signalColor = {
        'GO': 'bg-emerald-500 text-white shadow-emerald-500/50',
        'REVIEW': 'bg-amber-500 text-white shadow-amber-500/50',
        'STOP': 'bg-red-500 text-white shadow-red-500/50',
    }[signal];

    const signalText = {
        'GO': '受験推奨 (GO)',
        'REVIEW': '要確認 (REVIEW)',
        'STOP': '時期尚早 (STOP)',
    }[signal];

    // Format Radar Data
    // Recharts requires a specific format. Our data matches well.

    return (
        <div className="space-y-6">
            {/* 1. Header Signal */}
            <div className={`p-6 rounded-xl flex items-center justify-between shadow-lg ${signalColor}`}>
                <div className="flex items-center gap-4">
                    {signal === 'GO' && <CheckCircle2 className="w-10 h-10" />}
                    {signal === 'REVIEW' && <AlertTriangle className="w-10 h-10" />}
                    {signal === 'STOP' && <XCircle className="w-10 h-10" />}
                    <div>
                        <h2 className="text-3xl font-bold">{signalText}</h2>
                        <p className="opacity-90 mt-1">
                            {signal === 'GO' ? '基準をクリアしています。受験予約を進めてください。' :
                                signal === 'REVIEW' ? '合格圏内ですが、苦手分野やケアレスミスの確認が必要です。' :
                                    'まだ合格基準に達していません。基礎固めを優先してください。'}
                        </p>
                    </div>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-sm opacity-80">推奨判定基準</p>
                    <p className="text-xl font-mono">直近Avg {metrics.last_5_mock_avg}%</p>
                </div>
            </div>

            {/* 2. Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">直近安定性 (Mock Avg)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${metrics.last_5_mock_avg >= 90 ? 'text-emerald-400' : metrics.last_5_mock_avg >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                            {metrics.last_5_mock_avg}%
                        </div>
                        <p className="text-xs text-slate-500">過去5回の模擬試験平均</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">シミュレーション正答率</CardTitle>
                        <Target className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${metrics.sim_accuracy === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {metrics.sim_accuracy}%
                        </div>
                        <p className="text-xs text-slate-500">実技問題の通算正答率</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">平均回答スピード</CardTitle>
                        <Clock className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${metrics.avg_speed_seconds <= 45 ? 'text-emerald-400' : metrics.avg_speed_seconds >= 60 ? 'text-red-400' : 'text-white'}`}>
                            {metrics.avg_speed_seconds}秒
                        </div>
                        <p className="text-xs text-slate-500">1問あたりの平均時間</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">学習密度 (7days)</CardTitle>
                        <BrainCircuit className="h-4 w-4 text-pink-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {metrics.learning_density}問
                        </div>
                        <p className="text-xs text-slate-500">直近7日間の回答総数</p>
                    </CardContent>
                </Card>
            </div>

            {/* 3. Charts Area */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Radar Chart */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">分野別習熟度</CardTitle>
                        <CardDescription>70%未満の分野は重点対策が必要です</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radar_data}>
                                <PolarGrid stroke="#475569" />
                                <PolarAngleAxis dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b' }} />
                                <Radar
                                    name="正答率"
                                    dataKey="accuracy"
                                    stroke="#10b981"
                                    fill="#10b981"
                                    fillOpacity={0.5}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Line Chart */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">スコア推移 (直近10回)</CardTitle>
                        <CardDescription>得点の安定性を確認します</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history_data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="score"
                                    name="スコア(%)"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    activeDot={{ r: 8 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* 4. Weak Questions List */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        要注意問題リスト (丸暗記チェッカー)
                    </CardTitle>
                    <CardDescription>
                        3回以上間違えている、または正解・不正解を繰り返している問題
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {weak_questions.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">要注意問題はありません</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                                    <tr>
                                        <th className="px-4 py-3">分野</th>
                                        <th className="px-4 py-3 w-1/2">問題（抜粋）</th>
                                        <th className="px-4 py-3 text-center">正解</th>
                                        <th className="px-4 py-3 text-center">不正解</th>
                                        <th className="px-4 py-3 text-center">状態</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {weak_questions.map((q) => (
                                        <tr key={q.id} className="hover:bg-slate-800/30">
                                            <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{q.domain}</td>
                                            <td className="px-4 py-3 text-slate-300">
                                                <div className="line-clamp-2" title={q.text}>
                                                    {q.text}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-emerald-400 font-medium">+ {q.correct_count}</td>
                                            <td className="px-4 py-3 text-center text-red-400 font-medium">- {q.wrong_count}</td>
                                            <td className="px-4 py-3 text-center">
                                                {q.correct_count > 0 && q.wrong_count > 0 ? (
                                                    <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-xs">
                                                        不安定
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="border-red-500/50 text-red-400 text-xs">
                                                        苦手
                                                    </Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
