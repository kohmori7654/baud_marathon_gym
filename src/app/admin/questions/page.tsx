import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import {
    FileQuestion,
    ArrowLeft,
    Plus,
    Upload
} from 'lucide-react';
import { getQuestions } from './actions';
import { QuestionList } from './components/QuestionList';
import { CleanupButton } from './components/CleanupButton';

export default async function QuestionsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const resolvedSearchParams = await searchParams;
    const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1;
    const limit = 20;

    const { questions, totalPages, totalCount } = await getQuestions(page, limit);

    // Cast to compatible type if needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedQuestions = questions as any[] || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <FileQuestion className="w-6 h-6" />
                                問題管理
                            </h1>
                            <p className="text-slate-400">
                                全{totalCount}問 (Page {page} of {totalPages})
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Link href="/admin/questions/import">
                            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800">
                                <Upload className="w-4 h-4 mr-2" />
                                一括インポート
                            </Button>
                        </Link>
                        <CleanupButton />
                        <Link href="/admin/questions/new">
                            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800">
                                <Plus className="w-4 h-4 mr-2" />
                                新規作成
                            </Button>
                        </Link>
                    </div>
                </div>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-0">
                        <QuestionList questions={typedQuestions} />
                    </CardContent>
                </Card>

                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    baseUrl="/admin/questions"
                />
            </div>
        </div>
    );
}
