'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { ExamineeSummary } from '@/app/supporter/actions';

interface DownloadCsvButtonProps {
    examinees: ExamineeSummary[];
}

export function DownloadCsvButton({ examinees }: DownloadCsvButtonProps) {
    const handleDownload = () => {
        // Define CSV headers
        const headers = [
            'ID',
            '表示名',
            'メールアドレス',
            '目標試験',
            '平均スコア',
            '直近5日間平均',
            '最新模擬試験スコア',
            '総セッション数',
            '最終学習日時'
        ];

        // Map data to CSV rows
        const rows = examinees.map(examinee => [
            examinee.id,
            examinee.display_name || '',
            examinee.email || '',
            examinee.target_exam || '',
            examinee.averageScore.toString(),
            examinee.last5DaysAverage > 0 ? examinee.last5DaysAverage.toString() : '',
            examinee.latestMockExamScore !== null ? examinee.latestMockExamScore.toString() : '',
            examinee.totalSessions.toString(),
            examinee.lastSessionDate ? new Date(examinee.lastSessionDate).toLocaleString('ja-JP') : '未実施'
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Create blob and download link
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `examinees_list_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Button variant="ghost" size="sm" onClick={handleDownload} className="text-slate-400 hover:text-emerald-400">
            <Download className="w-4 h-4 mr-2" />
            CSVダウンロード
        </Button>
    );
}
