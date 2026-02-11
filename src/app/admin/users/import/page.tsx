'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Upload,
    ArrowLeft,
    FileJson,
    Loader2,
    CheckCircle,
    XCircle,
    FileSpreadsheet
} from 'lucide-react';
import { bulkCreateUsers } from '../actions';
import type { UserRole, TargetExamType } from '@/types/database';

interface ImportResult {
    email: string;
    success: boolean;
    error?: string;
}

const SAMPLE_JSON = `{
  "users": [
    {
      "email": "user1@example.com",
      "password": "password123",
      "displayName": "Test User 1",
      "role": "examinee",
      "targetExam": "ENCOR"
    },
    {
      "email": "supporter1@example.com",
      "password": "password123",
      "displayName": "Supporter 1",
      "role": "supporter",
      "targetExam": "BOTH"
    }
  ]
}`;

const SAMPLE_CSV = `email,password,displayName,role,targetExam
user1@example.com,pass123,TestUser,examinee,ENCOR
supporter@example.com,pass123,Supporter,supporter,BOTH`;

export default function ImportUsersPage() {
    const [jsonInput, setJsonInput] = useState('');
    const [csvInput, setCsvInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<ImportResult[] | null>(null);
    const [activeTab, setActiveTab] = useState('json');

    const handleJsonImport = async () => {
        if (!jsonInput.trim()) {
            setError('JSONデータを入力してください');
            return;
        }

        try {
            const data = JSON.parse(jsonInput);
            if (!data.users || !Array.isArray(data.users)) {
                setError('無効なJSON形式です。"users"配列が必要です。');
                return;
            }
            await executeImport(data);
        } catch (e: any) {
            setError(`JSONパースエラー: ${e.message}`);
        }
    };

    const handleCsvImport = async () => {
        if (!csvInput.trim()) {
            setError('CSVデータを入力してください');
            return;
        }

        try {
            const lines = csvInput.trim().split('\n');
            if (lines.length < 2) {
                setError('CSVデータはヘッダー行と少なくとも1つのデータ行が必要です');
                return;
            }

            const header = lines[0].split(',').map(h => h.trim());
            const users = [];

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                if (values.length !== header.length) continue;

                const user: any = {};
                header.forEach((h, index) => {
                    user[h] = values[index];
                });
                users.push(user);
            }

            await executeImport({ users });
        } catch (e: any) {
            setError(`CSV処理エラー: ${e.message}`);
        }
    };

    const executeImport = async (data: any) => {
        setIsLoading(true);
        setError(null);
        setResults(null);

        try {
            const result = await bulkCreateUsers(data);
            setResults(result.results);
        } catch (e: any) {
            setError(`インポートエラー: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const successCount = results?.filter(r => r.success).length || 0;
    const failCount = results?.filter(r => !r.success).length || 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/users">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Upload className="w-6 h-6" />
                            ユーザー一括登録
                        </h1>
                        <p className="text-slate-400">
                            CSVまたはJSON形式でユーザーを一括登録します
                        </p>
                    </div>
                </div>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">インポートデータ</CardTitle>
                        <CardDescription className="text-slate-400">
                            以下のフォーマットに従ってデータを入力してください
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                            <TabsList className="bg-slate-900">
                                <TabsTrigger value="json" className="data-[state=active]:bg-emerald-600">
                                    <FileJson className="w-4 h-4 mr-2" />
                                    JSON
                                </TabsTrigger>
                                <TabsTrigger value="csv" className="data-[state=active]:bg-emerald-600">
                                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                                    CSV
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="json" className="space-y-4">
                                <Textarea
                                    value={jsonInput}
                                    onChange={(e) => {
                                        setJsonInput(e.target.value);
                                        setError(null);
                                        setResults(null);
                                    }}
                                    placeholder={SAMPLE_JSON}
                                    className="min-h-[300px] font-mono bg-slate-900 border-slate-600 text-slate-200"
                                />
                                <Button
                                    onClick={handleJsonImport}
                                    disabled={isLoading || !jsonInput.trim()}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            処理中...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            JSONインポート実行
                                        </>
                                    )}
                                </Button>
                            </TabsContent>

                            <TabsContent value="csv" className="space-y-4">
                                <Textarea
                                    value={csvInput}
                                    onChange={(e) => {
                                        setCsvInput(e.target.value);
                                        setError(null);
                                        setResults(null);
                                    }}
                                    placeholder={SAMPLE_CSV}
                                    className="min-h-[300px] font-mono bg-slate-900 border-slate-600 text-slate-200"
                                />
                                <Button
                                    onClick={handleCsvImport}
                                    disabled={isLoading || !csvInput.trim()}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            処理中...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            CSVインポート実行
                                        </>
                                    )}
                                </Button>
                            </TabsContent>
                        </Tabs>

                        {error && (
                            <Alert variant="destructive" className="mt-4 bg-red-900/20 border-red-800 text-red-300">
                                {error}
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {results && (
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white">実行結果</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4">
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-0 px-3 py-1">
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    成功: {successCount}
                                </Badge>
                                <Badge className={failCount > 0 ? "bg-red-500/20 text-red-400 border-0 px-3 py-1" : "bg-slate-500/20 text-slate-400 border-0 px-3 py-1"}>
                                    <XCircle className="w-4 h-4 mr-1" />
                                    失敗: {failCount}
                                </Badge>
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {results.map((r, i) => (
                                    <div
                                        key={i}
                                        className={`p-3 rounded-lg border ${r.success
                                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                                : 'bg-red-500/10 border-red-500/30'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={`text-sm font-medium ${r.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {r.email}
                                            </span>
                                            {r.success ? (
                                                <span className="text-xs text-emerald-400/70">登録完了</span>
                                            ) : (
                                                <span className="text-xs text-red-400/70">エラー</span>
                                            )}
                                        </div>
                                        {r.error && (
                                            <p className="text-xs text-red-300 mt-1 pl-2 border-l-2 border-red-500/30">
                                                {r.error}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
