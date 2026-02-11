import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AssignmentManager } from './components/AssignmentManager';
import { Users, ArrowLeft } from 'lucide-react';
import { getSupporters, getExaminees, getAssignments } from './actions';

export default async function AssignmentsPage() {
    const [supporters, examinees, assignments] = await Promise.all([
        getSupporters(),
        getExaminees(),
        getAssignments(),
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

                {supporters.length === 0 ? (
                    <div className="text-center py-20 bg-slate-800/30 rounded-lg border border-slate-700">
                        <p className="text-slate-400">サポーターが見つかりません</p>
                        <p className="text-sm text-slate-500 mt-2">ユーザー管理画面でロールを「supporter」に設定してください</p>
                    </div>
                ) : (
                    <AssignmentManager
                        supporters={supporters}
                        examinees={examinees}
                        assignments={assignments}
                    />
                )}
            </div>
        </div>
    );
}
