'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Play, Settings, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import type { TargetExamType, User } from '@/types/database';
import { startExam } from './actions';
import { useIsMobile } from '@/hooks/use-mobile';

const QUESTION_COUNTS = [5, 10, 15, 20, 30];

const CHALLENGE_MODES = [
    { value: 'random', label: 'ランダム', description: '全問題からランダムに出題' },
    { value: 'mock_exam', label: '模擬試験', description: '本番に近い形式・配分で出題' },
    { value: 'unanswered', label: '未実施優先', description: 'まだ解いていない問題を優先' },
    { value: 'weak_points', label: '弱点克服', description: '正答率の低い問題を重点的に' },
    { value: 'hard_questions', label: '難問チャレンジ', description: '全体正答率の低い難問' },
];

export default function ExamPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const presetMode = searchParams.get('mode');
    const isMobile = useIsMobile();

    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [domains, setDomains] = useState<string[]>([]);

    const [examType, setExamType] = useState<TargetExamType>('ENCOR');
    const [mode, setMode] = useState(presetMode || 'random');
    const [domain, setDomain] = useState<string>('all');
    const [questionType, setQuestionType] = useState<string>('all');
    const [questionCount, setQuestionCount] = useState(10);

    // Mobile restrictions: Reset invalid selections if switching to mobile
    useEffect(() => {
        if (isMobile) {
            if (mode === 'mock_exam') {
                setMode('random');
            }
            if (questionType === 'Simulation') {
                setQuestionType('all');
            }
        }
    }, [isMobile, mode, questionType]);

    // Effect to handle Mock Exam defaults
    useEffect(() => {
        if (mode === 'mock_exam') {
            setDomain('all');
            if (examType === 'ENCOR') {
                setQuestionCount(100);
            } else if (examType === 'ENARSI') {
                setQuestionCount(60);
            }
        }
    }, [mode, examType]);

    useEffect(() => {
        async function loadData() {
            const supabase = createClient();

            // Get current user
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authUser.id)
                    .single() as { data: User | null };

                if (userData) {
                    setUser(userData);
                    if (userData.target_exam && userData.target_exam !== 'BOTH') {
                        setExamType(userData.target_exam);
                    }
                }
            }

            // Get available domains
            const { data: questions } = await supabase
                .from('questions')
                .select('domain') as { data: { domain: string }[] | null };

            if (questions) {
                const uniqueDomains = [...new Set(questions.map(q => q.domain))];
                setDomains(uniqueDomains.sort());
            }
        }

        loadData();
    }, []);

    const handleStart = async () => {
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('examType', examType);
            formData.append('mode', mode);
            formData.append('domain', domain);
            formData.append('questionType', questionType);
            formData.append('questionCount', questionCount.toString());

            const result = await startExam(examType, mode, domain, questionType, questionCount);

            if (result?.error) {
                console.error('Failed to start exam:', result.error);
                setIsLoading(false);
            }
        } catch (error: any) {
            if (error.message?.includes('NEXT_REDIRECT') || error.digest?.includes('NEXT_REDIRECT')) {
                // Redirecting, so ignore error
                return;
            }
            console.error('Failed to start exam:', error);
            setIsLoading(false);
        }
    };

    // Filter available modes based on mobile check
    const availableModes = CHALLENGE_MODES.filter(m => !isMobile || m.value !== 'mock_exam');

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">試験を開始</h1>
                <p className="text-slate-400 mt-1">
                    学習モードと問題数を選択してください
                </p>
            </div>

            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        試験設定
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Exam Type */}
                    <div className="space-y-2">
                        <Label className="text-slate-300">試験種別</Label>
                        <Select value={examType} onValueChange={(v) => setExamType(v as TargetExamType)}>
                            <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                <SelectItem value="ENCOR">Core ENCOR (350-401)</SelectItem>
                                <SelectItem value="ENARSI">Conce ENARSI (300-410)</SelectItem>
                                {/* <SelectItem value="BOTH">ENCOR & ENARSI</SelectItem> - Removed per request */}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Challenge Mode */}
                    <div className="space-y-2">
                        <Label className="text-slate-300">出題モード</Label>
                        <div className="grid gap-2">
                            {availableModes.map((m) => (
                                <button
                                    key={m.value}
                                    onClick={() => setMode(m.value)}
                                    className={`p-4 rounded-lg border text-left transition-all ${mode === m.value
                                        ? 'border-emerald-500 bg-emerald-500/10'
                                        : 'border-slate-600 hover:border-slate-500'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-white">{m.label}</span>
                                        {mode === m.value && (
                                            <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                                                選択中
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-400 mt-1">{m.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Domain Filter */}
                    <div className={`space-y-2 ${mode === 'mock_exam' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Label className="text-slate-300">
                            分野（オプション）
                            {mode === 'mock_exam' && <span className="text-xs text-amber-500 ml-2">※模擬試験では自動設定されます</span>}
                        </Label>
                        <Select value={domain} onValueChange={setDomain} disabled={mode === 'mock_exam'}>
                            <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                <SelectItem value="all">全分野</SelectItem>
                                {domains.map((d) => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Question Type Filter */}
                    <div className={`space-y-2 ${mode === 'mock_exam' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Label className="text-slate-300">
                            問題形式（オプション）
                            {mode === 'mock_exam' && <span className="text-xs text-amber-500 ml-2">※模擬試験では自動設定されます</span>}
                        </Label>
                        <Select value={questionType} onValueChange={setQuestionType} disabled={mode === 'mock_exam'}>
                            <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                <SelectItem value="all">全形式</SelectItem>
                                <SelectItem value="Single">単一選択 (Single)</SelectItem>
                                <SelectItem value="Multi">複数選択 (Multi)</SelectItem>
                                <SelectItem value="DragDrop">ドラッグ&ドロップ (DragDrop)</SelectItem>
                                {!isMobile && <SelectItem value="Simulation">シミュレーション (Simulation)</SelectItem>}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Question Count */}
                    <div className="space-y-2">
                        <Label className="text-slate-300">問題数</Label>
                        <div className="flex gap-2 flex-wrap">
                            {mode === 'mock_exam' ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-emerald-500 text-white border-emerald-500 cursor-default"
                                >
                                    {questionCount}問 (推奨)
                                </Button>
                            ) : (
                                QUESTION_COUNTS.map((count) => (
                                    <Button
                                        key={count}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setQuestionCount(count)}
                                        className={
                                            questionCount === count
                                                ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-400 hover:text-white'
                                                : 'bg-slate-900 text-slate-300 border-slate-600 hover:bg-slate-800 hover:text-white'
                                        }
                                    >
                                        {count}問
                                    </Button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Start Button */}
                    <Button
                        onClick={handleStart}
                        disabled={isLoading}
                        size="lg"
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-6 text-lg shadow-lg shadow-emerald-500/20"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                準備中...
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5 mr-2" />
                                試験を開始
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
