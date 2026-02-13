'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileJson, FileType, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import { bulkCreateAssignments } from '../actions';

const ASSIGNMENT_CSV_TEMPLATE = `supporter_email,examinee1,examinee2,examinee3
supporter1@example.com,examinee1@example.com,examinee2@example.com,
supporter2@example.com,examinee3@example.com,,`;

const ASSIGNMENT_JSON_TEMPLATE = JSON.stringify([
    {
        supporter_email: "supporter1@example.com",
        examinee_emails: ["examinee1@example.com", "examinee2@example.com"]
    },
    {
        supporter_email: "supporter2@example.com",
        examinee_emails: ["examinee3@example.com"]
    }
], null, 2);

const downloadTemplate = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

export function BulkAssignmentImport() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [jsonInput, setJsonInput] = useState('');
    const [result, setResult] = useState<{
        success: number;
        failed: number;
        errors: { email: string; error: string }[];
    } | null>(null);

    const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                // Validate JSON
                JSON.parse(content);
                setJsonInput(content);
            } catch (error) {
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    };

    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            // Convert CSV to JSON
            const lines = content.split('\n');
            const assignments = [];

            // Skip header if present
            let startIndex = 0;
            if (lines[0].includes('supporter_email')) {
                startIndex = 1;
            }

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const parts = line.split(',');
                if (parts.length >= 2) {
                    const supporter_email = parts[0].trim();
                    // Treat all subsequent columns as examinee emails
                    for (let j = 1; j < parts.length; j++) {
                        const examinee_email = parts[j].trim();
                        if (examinee_email) {
                            assignments.push({
                                supporter_email,
                                examinee_email
                            });
                        }
                    }
                }
            }
            setJsonInput(JSON.stringify(assignments, null, 2));
        };
        reader.readAsText(file);
    };

    const handleSubmit = async () => {
        if (!jsonInput) return;

        try {
            setIsLoading(true);
            const rawData = JSON.parse(jsonInput);
            let data: { supporter_email: string; examinee_email: string }[] = [];

            // Normalize data structure
            if (Array.isArray(rawData)) {
                // Check if it's already flat or needs flattening
                if (rawData.length > 0 && rawData[0].examinee_emails && Array.isArray(rawData[0].examinee_emails)) {
                    // Handle { supporter_email, examinee_emails: [] } format
                    rawData.forEach((item: { supporter_email: string; examinee_emails: string[] }) => {
                        if (item.supporter_email && item.examinee_emails) {
                            item.examinee_emails.forEach(email => {
                                data.push({
                                    supporter_email: item.supporter_email,
                                    examinee_email: email
                                });
                            });
                        }
                    });
                } else {
                    // Assume already flat { supporter_email, examinee_email }
                    data = rawData;
                }
            } else {
                throw new Error('Input must be an array of assignments');
            }

            const res = await bulkCreateAssignments(data);
            setResult({
                success: res.results.filter((r: { success: boolean }) => r.success).length,
                failed: res.results.filter((r: { success: boolean }) => !r.success).length,
                errors: res.results
                    .filter((r: { success: boolean; error?: string }) => !r.success && r.error)
                    .map((r: { supporter_email: string; examinee_email: string; error?: string }) => ({
                        email: `Sup: ${r.supporter_email}, Exam: ${r.examinee_email}`,
                        error: r.error!
                    }))
            });

            if (res.results.some((r: { success: boolean }) => r.success)) {
                router.refresh();
            }
        } catch (error) {
            console.error(error);
            alert('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <FileType className="w-5 h-5 text-emerald-400" />
                            ファイルから読み込む
                        </CardTitle>
                        <CardDescription className="text-slate-400 flex items-center justify-between">
                            <span>CSVまたはJSONファイルをアップロードしてください</span>
                            <span className="flex items-center gap-1">
                                <span className="text-xs">ひな形DL:</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-400 hover:text-white h-7 px-2 text-xs"
                                    onClick={() => downloadTemplate(
                                        ASSIGNMENT_CSV_TEMPLATE,
                                        'assignments_template.csv',
                                        'text/csv'
                                    )}
                                >
                                    <Download className="w-3 h-3 mr-1" />
                                    CSV
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-400 hover:text-white h-7 px-2 text-xs"
                                    onClick={() => downloadTemplate(
                                        ASSIGNMENT_JSON_TEMPLATE,
                                        'assignments_template.json',
                                        'application/json'
                                    )}
                                >
                                    <Download className="w-3 h-3 mr-1" />
                                    JSON
                                </Button>
                            </span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label className="text-slate-300">JSONファイル (.json)</Label>
                            <Input
                                type="file"
                                accept=".json"
                                onChange={handleJsonUpload}
                                className="bg-slate-900 border-slate-600 text-slate-300"
                            />
                            <p className="text-xs text-slate-500">
                                形式1: <code>[{`{ "supporter_email": "...", "examinee_email": "..." }`}, ...]</code><br />
                                形式2: <code>[{`{ "supporter_email": "...", "examinee_emails": ["...", "..."] }`}, ...]</code>
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-slate-300">CSVファイル (.csv)</Label>
                            <Input
                                type="file"
                                accept=".csv"
                                onChange={handleCsvUpload}
                                className="bg-slate-900 border-slate-600 text-slate-300"
                            />
                            <p className="text-xs text-slate-500">
                                形式: <code>supporter_email, examinee1, examinee2, ...</code> (1行に複数の受験者を記述可)
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <FileJson className="w-5 h-5 text-amber-400" />
                            直接入力
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            JSONデータを直接編集できます
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder='[ { "supporter_email": "s1@example.com", "examinee_emails": ["e1@example.com", "e2@example.com"] } ]'
                            className="h-64 font-mono text-sm bg-slate-900 border-slate-600 text-slate-300"
                        />
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">インポート実行</CardTitle>
                        <CardDescription className="text-slate-400">
                            内容を確認して実行してください
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading || !jsonInput}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    処理中...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    インポートを実行
                                </>
                            )}
                        </Button>

                        {result && (
                            <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                                <Alert className="bg-emerald-500/10 border-emerald-500/50 text-emerald-400">
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertTitle>完了</AlertTitle>
                                    <AlertDescription>
                                        成功: {result.success}件, 失敗: {result.failed}件
                                    </AlertDescription>
                                </Alert>

                                {result.errors.length > 0 && (
                                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                                        <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            エラー詳細
                                        </h4>
                                        <ul className="text-xs text-red-300 space-y-1 max-h-40 overflow-y-auto">
                                            {result.errors.map((err, i) => (
                                                <li key={i}>
                                                    {err.email}: {err.error}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
