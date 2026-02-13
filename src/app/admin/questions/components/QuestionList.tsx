'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useOptimistic, startTransition } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Loader2, Image as ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, Star } from 'lucide-react';
import { deleteQuestion, toggleImportant } from '../actions';
import type { Question, Option, QuestionImage } from '@/types/database';

interface QuestionWithOptions extends Question {
    options: Option[];
    question_images?: QuestionImage[];
    formatted_id?: string; // Add formatted_id
}

interface QuestionListProps {
    questions: QuestionWithOptions[];
    currentSort?: string;
    currentOrder?: 'asc' | 'desc';
}

export function QuestionList({ questions, currentSort = 'created_at', currentOrder = 'desc' }: QuestionListProps) {
    const router = useRouter();
    const [optimisticQuestions, setOptimisticQuestions] = useOptimistic(
        questions,
        (state, { id, is_important }: { id: string, is_important: boolean }) => {
            return state.map((q) =>
                q.id === id ? { ...q, is_important } : q
            );
        }
    );

    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!confirm('本当にこの問題を削除しますか？\nこの操作は取り消せません。')) {
            return;
        }

        setDeletingId(id);
        const result = await deleteQuestion(id);

        if (result.error) {
            alert(`削除に失敗しました: ${result.error}`);
            setDeletingId(null);
        } else {
            router.refresh();
            setDeletingId(null);
        }
    };

    const handleToggleImportant = async (id: string, current: boolean) => {
        const newState = !current;

        // Optimistic update
        startTransition(() => {
            setOptimisticQuestions({ id, is_important: newState });
        });

        const result = await toggleImportant(id, current);

        if (result.error) {
            alert(`更新に失敗しました: ${result.error}`);
            // Revert optimistic update (Next.js handles this automatically on refresh/revalidation usually, but explicit revert might be needed if no revalidate)
            // Ideally revalidatePath in server action syncs everything back.
            router.refresh();
        } else {
            // router.refresh(); // Already called in server action via revalidatePath
        }
    };



    const getTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            Single: 'bg-blue-500/20 text-blue-400',
            Multi: 'bg-purple-500/20 text-purple-400',
            DragDrop: 'bg-amber-500/20 text-amber-400',
            Simulation: 'bg-emerald-500/20 text-emerald-400',
        };
        return <Badge className={`${colors[type] || ''} border-0`}>{type}</Badge>;
    };

    const pathname = usePathname();
    const searchParams = useSearchParams();

    const SortableHeader = ({ label, field, className }: { label: string, field: string, className?: string }) => {
        const isCurrent = currentSort === field;
        const nextOrder = isCurrent && currentOrder === 'asc' ? 'desc' : 'asc';

        // Construct new URL with sort params
        const createSortUrl = () => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('sort', field);
            params.set('order', nextOrder);
            return `${pathname}?${params.toString()}`;
        };

        return (
            <TableHead className={`${className} cursor-pointer hover:bg-slate-800 transition-colors`}>
                <Link href={createSortUrl()} scroll={false} className="flex items-center gap-1 group">
                    {label}
                    {isCurrent ? (
                        currentOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                    ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
                    )}
                </Link>
            </TableHead>
        );
    };

    return (
        <Table className="table-fixed w-full">
            <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                    <SortableHeader label="ID" field="display_id" className="text-slate-400 w-[110px]" />
                    <TableHead className="text-slate-400 w-[50px]">重要</TableHead>
                    <SortableHeader label="試験" field="exam_type" className="text-slate-400 w-[80px]" />
                    <SortableHeader label="形式" field="question_type" className="text-slate-400 w-[70px]" />
                    <SortableHeader label="分野" field="domain" className="text-slate-400 w-[120px]" />
                    <TableHead className="text-slate-400">問題文</TableHead>
                    <TableHead className="text-slate-400 w-[50px]">画像</TableHead>
                    <SortableHeader label="作成日時" field="created_at" className="text-slate-400 w-[110px]" />
                    <SortableHeader label="更新日時" field="updated_at" className="text-slate-400 w-[110px]" />
                    <TableHead className="text-slate-400 w-[80px] text-right">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {optimisticQuestions.map((question) => (
                    <TableRow key={question.id} className="border-slate-700 hover:bg-slate-800/50">
                        <TableCell className="font-mono text-slate-300">
                            {question.formatted_id || '-'}
                        </TableCell>
                        <TableCell>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleImportant(question.id, question.is_important || false)}
                                className="p-0 h-8 w-8 hover:bg-transparent"
                            >
                                <Star
                                    className={`w-4 h-4 ${question.is_important ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`}
                                />
                            </Button>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className={
                                question.exam_type === 'ENCOR'
                                    ? 'border-blue-500/50 text-blue-400'
                                    : 'border-purple-500/50 text-purple-400'
                            }>
                                {question.exam_type}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            {getTypeBadge(question.question_type)}
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm truncate" title={question.domain}>
                            {question.domain}
                        </TableCell>
                        <TableCell className="text-white truncate" title={question.question_text}>
                            {question.question_text}
                        </TableCell>
                        <TableCell className="text-slate-400">
                            {(question.question_images?.length || 0) > 0 || question.image_base64 ? (
                                <div className="flex items-center gap-1 text-slate-300">
                                    <ImageIcon className="w-4 h-4" />
                                    <span>
                                        {question.question_images?.length || (question.image_base64 ? 1 : 0)}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-slate-600">-</span>
                            )}
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs">
                            {question.created_at ? new Date(question.created_at).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs">
                            {question.updated_at ? new Date(question.updated_at).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                <Link href={`/admin/questions/${question.id}`}>
                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(question.id)}
                                    disabled={deletingId === question.id}
                                    className="text-slate-400 hover:text-red-400"
                                >
                                    {deletingId === question.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
                {optimisticQuestions.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                            問題が見つかりません
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
