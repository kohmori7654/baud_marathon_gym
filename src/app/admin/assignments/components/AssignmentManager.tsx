'use client';

import { useState } from 'react';
import { User, SupporterAssignment } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, UserMinus, UserPlus, Users, Search } from 'lucide-react';
import { assignExaminee, unassignExaminee } from '../actions';
import { useRouter } from 'next/navigation';

interface AssignmentManagerProps {
    supporters: User[];
    examinees: User[];
    assignments: SupporterAssignment[];
}

export function AssignmentManager({ supporters, examinees, assignments }: AssignmentManagerProps) {
    const router = useRouter();
    const [selectedSupporter, setSelectedSupporter] = useState<string | null>(null);
    const [selectedExamineeToAssign, setSelectedExamineeToAssign] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Group assignments by supporter
    const assignmentsBySupporter = assignments.reduce((acc, curr) => {
        if (!acc[curr.supporter_id]) acc[curr.supporter_id] = [];
        acc[curr.supporter_id].push(curr.examinee_id);
        return acc;
    }, {} as Record<string, string[]>);

    // Get unassigned examinees (optional: if we want to show only truly unassigned, 
    // but typically a supporter can have multiple examinees, and an examinee might 
    // strictly belong to one supporter or multiple. Assuming M:N for schema capability, 
    // but typical use case is 1 examinee -> 1 supporter. 
    // For now, allow assigning any examinee who is NOT assigned to THIS supporter.)

    const handleAssign = async () => {
        if (!selectedSupporter || !selectedExamineeToAssign) return;
        setIsLoading(true);

        const result = await assignExaminee(selectedSupporter, selectedExamineeToAssign);
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {supporters.map((supporter) => {
                const assignedExamineeIds = assignmentsBySupporter[supporter.id] || [];
                const assignedExaminees = examinees.filter(e => assignedExamineeIds.includes(e.id));
                const availableExaminees = examinees.filter(e => !assignedExamineeIds.includes(e.id));

                return (
                    <Card key={supporter.id} className="bg-slate-800/50 border-slate-700 flex flex-col">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white flex items-center justify-between text-base">
                                <div className="flex items-center gap-2">
                                    <div className="bg-emerald-500/20 p-2 rounded-full">
                                        <Users className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <span className="truncate max-w-[150px]" title={supporter.display_name || supporter.email}>
                                        {supporter.display_name || 'No Name'}
                                    </span>
                                </div>
                                <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                    {assignedExaminees.length}名担当
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-4">
                            <div className="flex-1 space-y-2 min-h-[100px]">
                                {assignedExaminees.length > 0 ? (
                                    assignedExaminees.map((ex) => (
                                        <div key={ex.id} className="flex items-center justify-between p-2 bg-slate-900/50 rounded text-sm border border-slate-700/50">
                                            <span className="text-slate-300 truncate max-w-[140px]" title={ex.display_name || ex.email}>
                                                {ex.display_name || ex.email}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-slate-500 hover:text-red-400"
                                                onClick={() => handleUnassign(supporter.id, ex.id)}
                                                disabled={isLoading}
                                            >
                                                <UserMinus className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-500 text-sm italic text-center py-4">
                                        担当者なし
                                    </p>
                                )}
                            </div>

                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        className="w-full border border-dashed border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                                        variant="ghost"
                                        onClick={() => setSelectedSupporter(supporter.id)}
                                    >
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        受験者を割り当て
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                                    <DialogHeader>
                                        <DialogTitle>受験者を割り当て</DialogTitle>
                                        <DialogDescription className="text-slate-400">
                                            {supporter.display_name || supporter.email} の担当として追加する受験者を選択してください。
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <Users className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
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
                                        </div>
                                        <Button
                                            className="w-full bg-emerald-600 hover:bg-emerald-500"
                                            onClick={handleAssign}
                                            disabled={!selectedExamineeToAssign || isLoading}
                                        >
                                            割り当て実行
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
