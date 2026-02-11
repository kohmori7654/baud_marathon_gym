import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import { BulkAssignmentImport } from './bulk-assignment-import';

export default function ImportAssignmentsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Link href="/admin/assignments">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white mr-2">
                                <ArrowLeft className="w-6 h-6" />
                            </Button>
                        </Link>
                        <Users className="w-8 h-8 text-amber-500" />
                        サポーター割り当て一括インポート
                    </h1>
                    <p className="text-slate-400 mt-2">
                        CSVまたはJSON形式でサポーターと受験者の割り当てを一括登録します
                    </p>
                </div>

                <BulkAssignmentImport />
            </div>
        </div>
    );
}
