'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Edit, Loader2, Trash2 } from 'lucide-react';
import type { User, UserRole, TargetExamType } from '@/types/database';
import { updateUser, deleteUser } from '@/app/admin/users/actions';

const DEPARTMENTS = [
    '第一技術部',
    '第二技術部',
    '第三技術部',
    '第四技術部',
    '第五技術部',
    '第六技術部',
    'その他',
] as const;

interface EditUserDialogProps {
    user: User;
}

export function EditUserDialog({ user }: EditUserDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        displayName: user.display_name || '',
        role: user.role,
        targetExam: user.target_exam || 'ENCOR',
        department: user.department || '',
    });

    // Auto-select exam type based on role
    useEffect(() => {
        if (formData.role === 'admin' || formData.role === 'supporter') {
            setFormData(prev => ({ ...prev, targetExam: 'BOTH' }));
        }
    }, [formData.role]);

    const handleDelete = async () => {
        if (!confirm('本当にこのユーザーを削除しますか？\nこの操作は取り消せません。')) return;

        setIsLoading(true);
        try {
            const result = await deleteUser(user.id);
            if (result.error) {
                alert(`Error: ${result.error}`);
            } else {
                setOpen(false);
                router.refresh();
            }
        } catch (error) {
            console.error('Failed to delete user:', error);
            alert('Failed to delete user');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await updateUser(user.id, {
                displayName: formData.displayName,
                role: formData.role as UserRole,
                targetExam: formData.targetExam as TargetExamType,
                department: formData.department || undefined,
            });

            if (result.error) {
                alert(`Error: ${result.error}`);
            } else {
                setOpen(false);
                router.refresh();
            }
        } catch (error) {
            console.error('Failed to update user:', error);
            alert('Failed to update user');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-slate-700">
                    <Edit className="w-4 h-4 text-slate-400" />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                    <DialogTitle>ユーザー編集</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        {user.email} の情報を編集します
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="displayName">表示名</Label>
                        <Input
                            id="displayName"
                            value={formData.displayName}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            className="bg-slate-900 border-slate-600 text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">ロール</Label>
                        <Select
                            value={formData.role}
                            onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                        >
                            <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                <SelectItem value="examinee">受験者</SelectItem>
                                <SelectItem value="supporter">サポーター</SelectItem>
                                <SelectItem value="admin">管理者</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="targetExam">対象試験</Label>
                        <Select
                            value={formData.targetExam}
                            onValueChange={(value) => setFormData({ ...formData, targetExam: value as TargetExamType })}
                            disabled={formData.role === 'admin' || formData.role === 'supporter'}
                        >
                            <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                <SelectItem value="ENCOR">Core ENCOR</SelectItem>
                                <SelectItem value="ENARSI">Conce ENARSI</SelectItem>
                                <SelectItem value="BOTH">Core ENCOR & Conce ENARSI</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="department">所属部</Label>
                        <Select
                            value={formData.department}
                            onValueChange={(value) => setFormData({ ...formData, department: value })}
                        >
                            <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                <SelectValue placeholder="所属部を選択" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                {DEPARTMENTS.map((dept) => (
                                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="flex justify-between sm:justify-between">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isLoading}
                            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/50 border"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            削除
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setOpen(false)}
                                className="text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                                キャンセル
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        保存中...
                                    </>
                                ) : (
                                    '保存'
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
