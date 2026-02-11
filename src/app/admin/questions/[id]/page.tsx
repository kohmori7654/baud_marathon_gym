import { notFound } from 'next/navigation';
import { QuestionForm } from '../components/QuestionForm';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getQuestion } from '../actions';
import type { Question, Option } from '@/types/database';

interface EditQuestionPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditQuestionPage({ params }: EditQuestionPageProps) {
    const { id } = await params;
    const { data: initialData, error } = await getQuestion(id);

    if (error || !initialData) {
        notFound();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedData = initialData as (Question & { options: Option[] });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/questions">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-white">問題編集</h1>
                </div>

                <QuestionForm initialData={typedData} />
            </div>
        </div>
    );
}
