import Link from 'next/link';
import { getAssignedExaminees } from './actions';
import { DownloadCsvButton } from '@/components/supporter/DownloadCsvButton';
import { ExamineeTable } from './components/ExamineeTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, AlertCircle, ArrowLeft } from 'lucide-react';

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
                <ExamineeTable examinees={examinees} />
            )}
        </div>
    );
}
