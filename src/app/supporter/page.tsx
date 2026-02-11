import Link from 'next/link';
import { getAssignedExaminees } from './actions';
import { DownloadCsvButton } from '@/components/supporter/DownloadCsvButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Clock, AlertCircle, ArrowLeft } from 'lucide-react';

export default async function SupporterDashboardPage() {
    const examinees = await getAssignedExaminees();

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <Users className="h-8 w-8 text-emerald-400" />
                            担当受験者一覧
                        </h1>
                        <p className="text-slate-400 mt-1">
                            担当する受験者の学習状況を確認できます
                        </p>
                    </div>
                </div>
                {examinees.length > 0 && (
                    <DownloadCsvButton examinees={examinees} />
                )}
            </div>

            {examinees.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="bg-slate-700/50 p-4 rounded-full mb-4">
                            <AlertCircle className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">担当受験者がいません</h3>
                        <p className="text-slate-400 max-w-md">
                            まだ受験者が割り当てられていません。管理者に連絡して、担当受験者の割り当てを依頼してください。
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {examinees.map((examinee) => (
                        <Card key={examinee.id} className="bg-slate-800/50 border-slate-700 flex flex-col hover:border-emerald-500/50 transition-all">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start flex-wrap gap-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-lg">
                                            {examinee.display_name?.[0]?.toUpperCase() || examinee.email[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <CardTitle className="text-white text-lg">
                                                {examinee.display_name || 'Examinee'}
                                            </CardTitle>
                                            <CardDescription className="text-slate-400 text-xs">
                                                {examinee.email}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Signal Badge */}
                                        {examinee.signal === 'GO' && (
                                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50 text-[10px] px-1.5">
                                                GO
                                            </Badge>
                                        )}
                                        {examinee.signal === 'REVIEW' && (
                                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 text-[10px] px-1.5">
                                                REVIEW
                                            </Badge>
                                        )}
                                        {examinee.signal === 'STOP' && (
                                            <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-[10px] px-1.5">
                                                STOP
                                            </Badge>
                                        )}

                                        <Badge variant="outline" className={
                                            examinee.target_exam === 'ENCOR' ? 'border-blue-500/50 text-blue-400 text-[10px] px-1.5' :
                                                examinee.target_exam === 'ENARSI' ? 'border-purple-500/50 text-purple-400 text-[10px] px-1.5' :
                                                    'border-emerald-500/50 text-emerald-400 text-[10px] px-1.5'
                                        }>
                                            {examinee.target_exam === 'ENCOR' ? 'Core ENCOR' :
                                                examinee.target_exam === 'ENARSI' ? 'Conce ENARSI' :
                                                    (examinee.target_exam || '未設定')}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-4 py-2">
                                    <div className="space-y-1">
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <TrendingUp className="h-3 w-3" /> 平均スコア
                                        </span>
                                        <p className={`text-xl font-bold ${examinee.averageScore >= 80 ? 'text-emerald-400' :
                                            examinee.averageScore >= 60 ? 'text-amber-400' :
                                                'text-red-400'
                                            }`}>
                                            {examinee.averageScore}%
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> 総セッション
                                        </span>
                                        <p className="text-xl font-bold text-white">
                                            {examinee.totalSessions}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <TrendingUp className="h-3 w-3" /> 直近5日平均
                                        </span>
                                        <p className={`text-xl font-bold ${examinee.last5DaysAverage >= 80 ? 'text-emerald-400' :
                                            examinee.last5DaysAverage >= 60 ? 'text-amber-400' :
                                                'text-red-400'
                                            }`}>
                                            {examinee.last5DaysAverage > 0 ? `${examinee.last5DaysAverage}%` : '-'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" /> 最新模擬試験
                                        </span>
                                        <p className={`text-xl font-bold ${examinee.latestMockExamScore && examinee.latestMockExamScore >= 80 ? 'text-emerald-400' :
                                            examinee.latestMockExamScore && examinee.latestMockExamScore >= 60 ? 'text-amber-400' :
                                                'text-red-400'
                                            }`}>
                                            {examinee.latestMockExamScore !== null ? `${examinee.latestMockExamScore}%` : '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-auto space-y-3">
                                    <div className="text-xs text-slate-500 bg-slate-900/50 p-2 rounded flex justify-between">
                                        <span>最終学習:</span>
                                        <span className="text-slate-300">
                                            {examinee.lastSessionDate
                                                ? new Date(examinee.lastSessionDate).toLocaleDateString('ja-JP')
                                                : '未実施'
                                            }
                                        </span>
                                    </div>

                                    <Link href={`/supporter/examinees/${examinee.id}`} className="block">
                                        <Button className="w-full bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 hover:text-emerald-300 border border-emerald-500/30">
                                            詳細を見る
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
