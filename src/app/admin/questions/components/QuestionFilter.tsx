'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search, X, Download, Loader2 } from 'lucide-react';
import { exportQuestions, getDistinctDomains } from '../actions';
import type { TargetExamType, QuestionType } from '@/types/database';

export function QuestionFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isExporting, setIsExporting] = useState(false);
    const [domainsList, setDomainsList] = useState<string[]>([]);

    // Load distinct domains on mount
    useEffect(() => {
        getDistinctDomains().then(setDomainsList);
    }, []);

    // Get current filters from URL
    const currentExamType = searchParams.get('examType') || 'all';
    const currentDomain = searchParams.get('domain') || 'all';
    const currentQuestionType = searchParams.get('questionType') || 'all';
    const currentKeyword = searchParams.get('keyword') || '';

    // Local state for keyword input (debounce effect)
    const [keyword, setKeyword] = useState(currentKeyword);

    // Helper to update URL
    const updateFilter = useCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value && value !== 'all') {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        // Always reset page to 1 when filtering
        params.delete('page');

        startTransition(() => {
            router.push(`/admin/questions?${params.toString()}`);
        });
    }, [searchParams, router]);

    const handleKeywordSearch = () => {
        updateFilter('keyword', keyword);
    };

    const handleClear = () => {
        setKeyword('');
        startTransition(() => {
            router.push('/admin/questions');
        });
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const result = await exportQuestions({
                examType: currentExamType !== 'all' ? currentExamType : undefined,
                domain: currentDomain !== 'all' ? currentDomain : undefined,
                questionType: currentQuestionType !== 'all' ? currentQuestionType : undefined,
                keyword: currentKeyword || undefined,
            });

            if (result.csv) {
                // Create download link
                const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `questions_export_${new Date().toISOString().slice(0, 10)}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('CSVエクスポートに失敗しました');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-4">
            <div className="flex flex-wrap items-end gap-1.5">
                {/* Exam Type */}
                <div className="space-y-1.5 w-44">
                    <Label className="text-slate-300 text-xs">試験種別</Label>
                    <Select
                        value={currentExamType}
                        onValueChange={(val) => updateFilter('examType', val)}
                    >
                        <SelectTrigger className="w-full bg-slate-900 border-slate-600 text-white">
                            <SelectValue placeholder="試験種別" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全試験種別 (All Exams)</SelectItem>
                            <SelectItem value="ENCOR">ENCOR</SelectItem>
                            <SelectItem value="ENARSI">ENARSI</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5 w-56">
                    <Label className="text-slate-300 text-xs">分野</Label>
                    <div className="relative">
                        <Input
                            placeholder="分野名..."
                            value={currentDomain === 'all' ? '' : currentDomain}
                            onChange={(e) => updateFilter('domain', e.target.value || 'all')}
                            className="bg-slate-900 border-slate-600 text-white"
                            list="domain-suggestions-filter"
                        />
                        <datalist id="domain-suggestions-filter">
                            {domainsList.map(d => (
                                <option key={d} value={d} />
                            ))}
                        </datalist>
                    </div>
                </div>

                {/* Question Type */}
                <div className="space-y-1.5 w-52">
                    <Label className="text-slate-300 text-xs">問題形式</Label>
                    <Select
                        value={currentQuestionType}
                        onValueChange={(val) => updateFilter('questionType', val)}
                    >
                        <SelectTrigger className="w-full bg-slate-900 border-slate-600 text-white">
                            <SelectValue placeholder="問題形式" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全形式 (All Types)</SelectItem>
                            <SelectItem value="Single">単一選択 (Single)</SelectItem>
                            <SelectItem value="Multi">複数選択 (Multi)</SelectItem>
                            <SelectItem value="DragDrop">ドラッグ&ドロップ (DragDrop)</SelectItem>
                            <SelectItem value="Simulation">シミュレーション (Simulation)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Keyword Search */}
                <div className="space-y-1.5 w-64">
                    <Label className="text-slate-300 text-xs">キーワード検索</Label>
                    <div className="flex gap-1.5">
                        <Input
                            placeholder="ID, 問題文..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleKeywordSearch()}
                            className="bg-slate-900 border-slate-600 text-white"
                        />
                        <Button
                            onClick={handleKeywordSearch}
                            disabled={isPending}
                            variant="secondary"
                            size="icon"
                        >
                            <Search className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                <Button
                    variant="ghost"
                    onClick={handleClear}
                    disabled={isPending}
                    className="text-slate-400 hover:text-white"
                >
                    <X className="w-4 h-4 mr-2" />
                    条件クリア
                </Button>
            </div>
        </div>
    );
}
