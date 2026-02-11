import Link from 'next/link';
import { getExamineeDetail, getStudentAnalytics } from '../../actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { StudentAnalytics } from '@/components/dashboard/StudentAnalytics';

export default async function ExamineeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { profile } = await getExamineeDetail(id);
    const analytics = await getStudentAnalytics(id);

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/supporter">
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        {profile.display_name || profile.email}
                        <Badge variant="outline" className="ml-2 border-slate-600 text-slate-400 font-normal">
                            詳細分析
                        </Badge>
                    </h1>
                    <p className="text-slate-400 text-sm">
                        {profile.email} • 目標: {profile.target_exam || '未設定'}
                    </p>
                </div>
            </div>

            <StudentAnalytics data={analytics} />
        </div>
    );
}
