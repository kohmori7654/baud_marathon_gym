'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
import { Edit, Trash2, Loader2, Image as ImageIcon, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { deleteQuestion } from '../actions';
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

    const getTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            Single: 'bg-blue-500/20 text-blue-400',
            Multi: 'bg-purple-500/20 text-purple-400',
            DragDrop: 'bg-amber-500/20 text-amber-400',
            Simulation: 'bg-emerald-500/20 text-emerald-400',
        };
        return <Badge className={`${colors[type] || ''} border-0`}>{type}</Badge>;
    };

    const SortableHeader = ({ label, field, className }: { label: string, field: string, className?: string }) => {
        const isCurrent = currentSort === field;
        const nextOrder = isCurrent && currentOrder === 'asc' ? 'desc' : 'asc';

        // Construct new URL with sort params
        const createSortUrl = () => {
            const url = new URL(window.location.href);
            url.searchParams.set('sort', field);
            url.searchParams.set('order', nextOrder);
            return url.toString();
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
                    <SortableHeader label="試験" field="exam_type" className="text-slate-400 w-[80px]" />
                    <SortableHeader label="形式" field="question_type" className="text-slate-400 w-[70px]" />
                    <SortableHeader label="分野" field="domain" className="text-slate-400 w-[120px]" />
                    <TableHead className="text-slate-400">問題文</TableHead>
                    <TableHead className="text-slate-400 w-[50px]">画像</TableHead>
                    <TableHead className="text-slate-400 w-[50px]">選択肢</TableHead>
                    <TableHead className="text-slate-400 w-[80px] text-right">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {questions.map((question) => (
                    <TableRow key={question.id} className="border-slate-700 hover:bg-slate-800/50">
                        <TableCell className="font-mono text-slate-300">
                            {question.formatted_id || '-'}
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
                        <TableCell className="text-slate-300 text-sm">
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
                        <TableCell className="text-slate-400">
                            {question.options?.length || 0}
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
                {questions.length === 0 && (
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
