'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import type { ExamineeSummary } from '@/app/supporter/actions';
import type { TargetExamType } from '@/types/database';
import { Eye } from 'lucide-react';

interface ExamineeTableProps {
    examinees: ExamineeSummary[];
}

const TARGET_EXAM_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: 'すべて' },
    { value: 'ENCOR', label: 'Core ENCOR' },
    { value: 'ENARSI', label: 'Conce ENARSI' },
    { value: 'BOTH', label: 'ENCOR & ENARSI' },
];

export function ExamineeTable({ examinees }: ExamineeTableProps) {
    const [displayNameFilter, setDisplayNameFilter] = useState<string>('all');
    const [targetExamFilter, setTargetExamFilter] = useState<string>('all');

    const displayNameOptions = useMemo(() => {
        const names = [...new Set(examinees.map(e => e.display_name || '').filter(Boolean))].sort();
        return [{ value: 'all', label: 'すべて' }, ...names.map(n => ({ value: n, label: n }))];
    }, [examinees]);

    const filteredExaminees = useMemo(() => {
        return examinees.filter(e => {
            if (displayNameFilter !== 'all' && (e.display_name || '') !== displayNameFilter) return false;
            if (targetExamFilter !== 'all' && (e.target_exam || '') !== targetExamFilter) return false;
            return true;
        });
    }, [examinees, displayNameFilter, targetExamFilter]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400 whitespace-nowrap">表示名</span>
                    <Combobox
                        options={displayNameOptions}
                        value={displayNameFilter}
                        onValueChange={setDisplayNameFilter}
                        placeholder="表示名で絞り込み"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400 whitespace-nowrap">対象試験</span>
                    <Combobox
                        options={TARGET_EXAM_OPTIONS}
                        value={targetExamFilter}
                        onValueChange={setTargetExamFilter}
                        placeholder="対象試験で絞り込み"
                    />
                </div>
            </div>

            <div className="rounded-lg border border-slate-700 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-700 hover:bg-transparent">
                            <TableHead className="text-slate-400 font-medium">メールアドレス</TableHead>
                            <TableHead className="text-slate-400 font-medium">表示名</TableHead>
                            <TableHead className="text-slate-400 font-medium">判定基準</TableHead>
                            <TableHead className="text-slate-400 font-medium">対象試験</TableHead>
                            <TableHead className="text-slate-400 font-medium">平均スコア</TableHead>
                            <TableHead className="text-slate-400 font-medium">総セッション</TableHead>
                            <TableHead className="text-slate-400 font-medium">直近5日平均</TableHead>
                            <TableHead className="text-slate-400 font-medium">最新模擬試験</TableHead>
                            <TableHead className="text-slate-400 font-medium w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredExaminees.length === 0 ? (
                            <TableRow className="border-slate-700">
                                <TableCell colSpan={9} className="text-center text-slate-400 py-8">
                                    該当する受験者がいません
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredExaminees.map((examinee) => (
                                <TableRow key={examinee.id} className="border-slate-700 hover:bg-slate-800/50">
                                    <TableCell className="text-white font-mono text-sm">
                                        {examinee.email}
                                    </TableCell>
                                    <TableCell className="text-white">
                                        {examinee.display_name || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {examinee.signal === 'GO' && (
                                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50 text-xs">
                                                GO
                                            </Badge>
                                        )}
                                        {examinee.signal === 'REVIEW' && (
                                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 text-xs">
                                                REVIEW
                                            </Badge>
                                        )}
                                        {examinee.signal === 'STOP' && (
                                            <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs">
                                                STOP
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={
                                                examinee.target_exam === 'ENCOR'
                                                    ? 'border-blue-500/50 text-blue-400 text-xs'
                                                    : examinee.target_exam === 'ENARSI'
                                                        ? 'border-purple-500/50 text-purple-400 text-xs'
                                                        : 'border-emerald-500/50 text-emerald-400 text-xs'
                                            }
                                        >
                                            {examinee.target_exam === 'ENCOR'
                                                ? 'Core ENCOR'
                                                : examinee.target_exam === 'ENARSI'
                                                    ? 'Conce ENARSI'
                                                    : (examinee.target_exam as TargetExamType) || '未設定'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell
                                        className={
                                            examinee.averageScore >= 80
                                                ? 'text-emerald-400 font-medium'
                                                : examinee.averageScore >= 60
                                                    ? 'text-amber-400 font-medium'
                                                    : 'text-red-400 font-medium'
                                        }
                                    >
                                        {examinee.averageScore}%
                                    </TableCell>
                                    <TableCell className="text-white">
                                        {examinee.totalSessions}
                                    </TableCell>
                                    <TableCell
                                        className={
                                            examinee.last5DaysAverage >= 80
                                                ? 'text-emerald-400'
                                                : examinee.last5DaysAverage >= 60
                                                    ? 'text-amber-400'
                                                    : 'text-slate-300'
                                        }
                                    >
                                        {examinee.last5DaysAverage > 0 ? `${examinee.last5DaysAverage}%` : '-'}
                                    </TableCell>
                                    <TableCell
                                        className={
                                            examinee.latestMockExamScore != null && examinee.latestMockExamScore >= 80
                                                ? 'text-emerald-400'
                                                : examinee.latestMockExamScore != null && examinee.latestMockExamScore >= 60
                                                    ? 'text-amber-400'
                                                    : 'text-slate-300'
                                        }
                                    >
                                        {examinee.latestMockExamScore !== null ? `${examinee.latestMockExamScore}%` : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/supporter/examinees/${examinee.id}`}>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                                            >
                                                <Eye className="w-4 h-4 mr-1" />
                                                詳細を見る
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
