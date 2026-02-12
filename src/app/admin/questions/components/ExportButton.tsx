'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { exportQuestions } from '../actions';
import { useSearchParams } from 'next/navigation';

export function ExportButton() {
    const [isExporting, setIsExporting] = useState(false);
    const searchParams = useSearchParams();

    const handleExport = async () => {
        setIsExporting(true);
        try {
            // Build filters from current URL params
            const filters = {
                examType: searchParams.get('examType') || undefined,
                domain: searchParams.get('domain') || undefined,
                questionType: searchParams.get('questionType') || undefined,
                keyword: searchParams.get('keyword') || undefined,
            };

            const { csv, error } = await exportQuestions(filters);

            if (error) {
                alert(`エクスポートに失敗しました: ${error}`);
                return;
            }

            if (!csv) {
                alert('対象データがありません');
                return;
            }

            // Create blob and download
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Format filename: questions_YYYYMMDD_HHMM.csv
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
            const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, '');
            link.setAttribute('download', `questions_${dateStr}_${timeStr}.csv`);

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (e) {
            console.error('Export failed:', e);
            alert('エクスポート中にエラーが発生しました');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button
            variant="ghost"
            onClick={handleExport}
            disabled={isExporting}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
            {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
                <Download className="w-4 h-4 mr-2" />
            )}
            CSV出力
        </Button>
    );
}
