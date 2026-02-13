'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types/database';
import type { SupporterStats } from '../actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Eye, Edit, UserMinus, UserPlus, Search, Users, CheckCircle, XCircle } from 'lucide-react';
import { assignExaminee, unassignExaminee } from '../actions';

interface AssignmentManagerProps {
    supporterStats: SupporterStats[];
    examinees: User[];
}

export function AssignmentManager({ supporterStats, examinees }: AssignmentManagerProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedExamineeToAssign, setSelectedExamineeToAssign] = useState<string | null>(null);

    const handleAssign = async (supporterId: string) => {
        if (!selectedExamineeToAssign) return;
        setIsLoading(true);
        const result = await assignExaminee(supporterId, selectedExamineeToAssign);
        if (result.error) {
            alert(result.error);
        } else {
            router.refresh();
            setSelectedExamineeToAssign(null);
        }
        setIsLoading(false);
    };

    const handleUnassign = async (supporterId: string, examineeId: string) => {
        if (!confirm('この割り当てを解除しますか？')) return;
        setIsLoading(true);
        const result = await unassignExaminee(supporterId, examineeId);
        if (result.error) {
            alert(result.error);
        } else {
            router.refresh();
        }
        setIsLoading(false);
    };

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-transparent">
                        <TableHead className="text-slate-400">サポーター名</TableHead>
                        <TableHead className="text-slate-400">所属部</TableHead>
                        <TableHead className="text-slate-400">受験者</TableHead>
                        <TableHead className="text-slate-400 text-center">受験者数</TableHead>
                        <TableHead className="text-slate-400 text-center">合格者数</TableHead>
                        <TableHead className="text-slate-400 text-right">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {supporterStats.map((supporter) => {
                        const assignedExamineeIds = supporter.examinees.map(e => e.id);
                        const availableExaminees = examinees.filter(e => !assignedExamineeIds.includes(e.id));

                        return (
                            <TableRow key={supporter.id} className="border-slate-700 hover:bg-slate-800/50">
                                <TableCell className="text-white font-medium">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-emerald-500/20 p-1.5 rounded-full">
                                            <Users className="w-3 h-3 text-emerald-400" />
                                        </div>
                                        {supporter.display_name || supporter.email}
                                    </div>
                                </TableCell>
                                <TableCell className="text-slate-300 text-sm whitespace-nowrap">
                                    {supporter.department || '-'}
                                </TableCell>
                                <TableCell className="text-slate-300 text-sm truncate max-w-[300px]" title={
                                    supporter.examinees.map(e => e.display_name || e.email).join(', ')
                                }>
                                    {supporter.examinees.length > 0
                                        ? supporter.examinees.map(e => e.display_name || e.email).join(', ')
                                        : <span className="text-slate-500 italic">担当なし</span>
                                    }
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                                        {supporter.examinee_count}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className={
                                        supporter.passed_count > 0
                                            ? 'border-emerald-500/50 text-emerald-400'
                                            : 'border-slate-600 text-slate-400'
                                    }>
                                        {supporter.passed_count}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {/* Detail Button */}
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-700" title="詳細">
                                                    <Eye className="w-4 h-4 text-slate-400" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
                                                <DialogHeader>
                                                    <DialogTitle>受験者一覧</DialogTitle>
                                                    <DialogDescription className="text-slate-400">
                                                        {supporter.display_name || supporter.email} の担当受験者
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                                    {supporter.examinees.length > 0 ? (
                                                        supporter.examinees.map((ex) => (
                                                            <div key={ex.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded border border-slate-700/50">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-medium text-slate-200">
                                                                        {ex.display_name || 'No Name'}
                                                                    </span>
                                                                    <span className="text-xs text-slate-500">{ex.email}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {ex.passed ? (
                                                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                                                                            <CheckCircle className="w-3 h-3 mr-1" />合格
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge className="bg-slate-500/20 text-slate-400 border-0">
                                                                            <XCircle className="w-3 h-3 mr-1" />未合格
                                                                        </Badge>
                                                                    )}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-slate-500 hover:text-red-400"
                                                                        onClick={() => handleUnassign(supporter.id, ex.id)}
                                                                        disabled={isLoading}
                                                                    >
                                                                        <UserMinus className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-center text-slate-500 text-sm py-8">担当受験者がいません</p>
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        {/* Edit/Assign Button */}
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-700" title="編集">
                                                    <Edit className="w-4 h-4 text-slate-400" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-slate-800 border-slate-700 text-white">
                                                <DialogHeader>
                                                    <DialogTitle>受験者を割り当て</DialogTitle>
                                                    <DialogDescription className="text-slate-400">
                                                        {supporter.display_name || supporter.email} に受験者を追加します
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                                        <Input
                                                            placeholder="名前またはメールで検索..."
                                                            className="pl-9 bg-slate-900 border-slate-600 text-white"
                                                            value={searchQuery}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="h-[200px] border rounded-md border-slate-700 bg-slate-900/50 overflow-y-auto p-1">
                                                        {availableExaminees
                                                            .filter(ex =>
                                                                (ex.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                                ex.email.toLowerCase().includes(searchQuery.toLowerCase())
                                                            )
                                                            .map((ex) => (
                                                                <div
                                                                    key={ex.id}
                                                                    className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-slate-800 transition-colors ${selectedExamineeToAssign === ex.id ? 'bg-emerald-500/20 ring-1 ring-emerald-500' : ''}`}
                                                                    onClick={() => setSelectedExamineeToAssign(ex.id)}
                                                                >
                                                                    <div className="flex flex-col overflow-hidden">
                                                                        <span className="text-sm font-medium text-slate-200 truncate">
                                                                            {ex.display_name || 'No Name'}
                                                                        </span>
                                                                        <span className="text-xs text-slate-500 truncate">
                                                                            {ex.email}
                                                                        </span>
                                                                    </div>
                                                                    {selectedExamineeToAssign === ex.id && (
                                                                        <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                                                                    )}
                                                                </div>
                                                            ))}
                                                        {availableExaminees.filter(ex =>
                                                            (ex.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                            ex.email.toLowerCase().includes(searchQuery.toLowerCase())
                                                        ).length === 0 && (
                                                                <p className="text-center text-slate-500 text-sm py-8">
                                                                    該当するユーザーがいません
                                                                </p>
                                                            )}
                                                    </div>
                                                    <Button
                                                        className="w-full bg-emerald-600 hover:bg-emerald-500"
                                                        onClick={() => handleAssign(supporter.id)}
                                                        disabled={!selectedExamineeToAssign || isLoading}
                                                    >
                                                        <UserPlus className="w-4 h-4 mr-2" />
                                                        割り当て実行
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {supporterStats.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                                サポーターが見つかりません
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
