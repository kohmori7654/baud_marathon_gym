'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { User } from '@/types/database';

interface UserFiltersProps {
    departments: string[];
    supporters: User[];
    currentDepartment?: string;
    currentSupporter?: string;
}

export function UserFilters({ departments, supporters, currentDepartment, currentSupporter }: UserFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const updateFilter = (key: string, value: string | undefined) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        params.delete('page'); // Reset to page 1 on filter change
        router.push(`${pathname}?${params.toString()}`);
    };

    const clearFilters = () => {
        router.push(pathname);
    };

    const hasFilters = currentDepartment || currentSupporter;

    return (
        <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">所属部:</span>
                <Select
                    value={currentDepartment || 'all'}
                    onValueChange={(value) => updateFilter('department', value === 'all' ? undefined : value)}
                >
                    <SelectTrigger className="w-[160px] bg-slate-800/50 border-slate-700 text-white text-sm">
                        <SelectValue placeholder="すべて" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                        <SelectItem value="all">すべて</SelectItem>
                        {departments.map((dept) => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">サポーター:</span>
                <Select
                    value={currentSupporter || 'all'}
                    onValueChange={(value) => updateFilter('supporter', value === 'all' ? undefined : value)}
                >
                    <SelectTrigger className="w-[180px] bg-slate-800/50 border-slate-700 text-white text-sm">
                        <SelectValue placeholder="すべて" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                        <SelectItem value="all">すべて</SelectItem>
                        {supporters.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                                {s.display_name || s.email}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {hasFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-slate-400 hover:text-white"
                >
                    <X className="w-3 h-3 mr-1" />
                    フィルタ解除
                </Button>
            )}
        </div>
    );
}
