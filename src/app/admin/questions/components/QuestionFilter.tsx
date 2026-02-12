'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search, X, Download, Loader2 } from 'lucide-react';
import { exportQuestions } from '../actions';
import type { TargetExamType, QuestionType } from '@/types/database';

export function QuestionFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isExporting, setIsExporting] = useState(false);

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Exam Type */}
                <Select
                    value={currentExamType}
                    onValueChange={(val) => updateFilter('examType', val)}
                >
                    <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                        <SelectValue placeholder="試験種別" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全試験種別 (All Exams)</SelectItem>
                        <SelectItem value="ENCOR">ENCOR</SelectItem>
                        <SelectItem value="ENARSI">ENARSI</SelectItem>
                    </SelectContent>
                </Select>

                {/* Domain - Ideally fetched dynamically, but hardcoded for now or passed as prop */}
                <Select
                    value={currentDomain}
                    onValueChange={(val) => updateFilter('domain', val)}
                >
                    <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                        <SelectValue placeholder="分野" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        <SelectItem value="all">全分野 (All Domains)</SelectItem>
                        <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                        <SelectItem value="Virtualization">Virtualization</SelectItem>
                        <SelectItem value="Architecture">Architecture</SelectItem>
                        <SelectItem value="Security">Security</SelectItem>
                        <SelectItem value="Automation">Automation</SelectItem>
                        {/* Add common ENARSI domains */}
                        <SelectItem value="レイヤ3テクノロジー">レイヤ3テクノロジー</SelectItem>
                        <SelectItem value="VPNテクノロジー">VPNテクノロジー</SelectItem>
                        <SelectItem value="インフラのセキュリティ">インフラのセキュリティ</SelectItem>
                        <SelectItem value="インフラのサービス">インフラのサービス</SelectItem>
                    </SelectContent>
                </Select>

                {/* Question Type */}
                <Select
                    value={currentQuestionType}
                    onValueChange={(val) => updateFilter('questionType', val)}
                >
                    <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
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

                {/* Keyword Search */}
                <div className="flex gap-2">
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

                <Button
                    variant="outline"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="border-emerald-600 text-emerald-500 hover:bg-emerald-500/10"
                >
                    {isExporting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4 mr-2" />
                    )}
                    CSVエクスポート
                </Button>
            </div>
        </div>
    );
}
