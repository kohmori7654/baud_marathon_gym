import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AssignmentManager } from './components/AssignmentManager';
import { Users, ArrowLeft } from 'lucide-react';
import { getSupporterStats, getExaminees } from './actions';

export default async function AssignmentsPage() {
    const [supporterStats, examinees] = await Promise.all([
        getSupporterStats(),
        getExaminees(),
    ]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Link href="/admin">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white mr-2">
                                <ArrowLeft className="w-6 h-6" />
                            </Button>
                        </Link>
                        <Users className="w-6 h-6" />
                        サポーター割り当て管理
                    </h1>
                    <div className="flex justify-between items-end">
                        <p className="text-slate-400">
                            サポーターごとの担当受験者を管理します。
                        </p>
                        <Link href="/admin/assignments/import">
                            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800">
                                <Users className="w-4 h-4 mr-2" />
                                一括インポート
                            </Button>
                        </Link>
                    </div>
                </div>

                <AssignmentManager
                    supporterStats={supporterStats}
                    examinees={examinees}
                />
            </div>
        </div>
    );
}
