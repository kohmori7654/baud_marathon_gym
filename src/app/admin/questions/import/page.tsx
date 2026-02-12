'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Upload,
    ArrowLeft,
    FileJson,
    Loader2,
    CheckCircle,
    XCircle,
    Image as ImageIcon
} from 'lucide-react';
import { bulkUpsertQuestions } from '@/app/admin/questions/actions';
import { createClient } from '@/lib/supabase/client';

interface ImportResult {
    hash: string;
    action: 'created' | 'updated' | 'skipped';
    error?: string;
}

const SAMPLE_TEMPLATES = {
    Single: {
        questions: [
            {
                examType: "ENCOR",
                domain: "Network Architecture",
                questionType: "Single",
                questionText: "問題文を入力してください",
                explanation: "解説文をMarkdown形式で入力",
                options: [
                    { text: "選択肢A", isCorrect: false, sortOrder: 1 },
                    { text: "選択肢B（正解）", isCorrect: true, sortOrder: 2 },
                    { text: "選択肢C", isCorrect: false, sortOrder: 3 },
                    { text: "選択肢D", isCorrect: false, sortOrder: 4 }
                ]
            }
        ]
    },
    Multi: {
        questions: [
            {
                examType: "ENARSI",
                domain: "Layer 3 Technologies",
                questionType: "Multi",
                questionText: "正しいものをすべて選んでください",
                explanation: "解説文...",
                options: [
                    { text: "選択肢A（正解）", isCorrect: true, sortOrder: 1 },
                    { text: "選択肢B", isCorrect: false, sortOrder: 2 },
                    { text: "選択肢C（正解）", isCorrect: true, sortOrder: 3 },
                    { text: "選択肢D", isCorrect: false, sortOrder: 4 }
                ]
            }
        ]
    },
    DragDrop: {
        questions: [
            {
                examType: "ENCOR",
                domain: "Virtualization",
                questionType: "DragDrop",
                questionText: "左側の用語と右側の説明を正しく組み合わせてください",
                explanation: "解説文...",
                options: [
                    { text: "VRF|Virtual Routing and Forwarding", isCorrect: true, sortOrder: 1 },
                    { text: "GRE|Generic Routing Encapsulation", isCorrect: true, sortOrder: 2 },
                    { text: "IPsec|IP Security", isCorrect: true, sortOrder: 3 }
                ]
            }
        ]
    },
    Simulation: {
        questions: [
            {
                examType: "ENARSI",
                domain: "VPN Technologies",
                questionType: "Simulation",
                questionText: "以下の要件に従ってACLを設定してください...",
                explanation: "解説文...",
                simulationTargetJson: {
                    targetIP: "192.168.1.1",
                    mask: "255.255.255.0",
                    action: "permit"
                },
                options: [] // シミュレーションでは通常オプションは空ですが、要件によっては使用します
            }
        ]
    }
};

export default function ImportPage() {
    const router = useRouter();
    const [jsonInput, setJsonInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<ImportResult[] | null>(null);
    const [sampleType, setSampleType] = useState<keyof typeof SAMPLE_TEMPLATES>('Single');
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setJsonInput(content);
            setError(null);
            setResults(null);
        };
        reader.readAsText(file);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedImages(Array.from(e.target.files));
        }
    };

    const normalizeQuestion = (q: any, uploadedImageMap: { [key: string]: string }): any => {
        // Map snake_case to camelCase

        // Resolve image URL
        // 1. Check if image_filename matches an uploaded file
        // 2. Check if image_base64 is actually a filename that matches
        // 3. Fallback to existing logic

        let imageUrls: string[] = [];

        // Try to find matching images in the uploaded map
        if (q.image_filename && uploadedImageMap[q.image_filename]) {
            imageUrls.push(uploadedImageMap[q.image_filename]);
        }

        // Also check images array for filenames
        if (Array.isArray(q.images)) {
            q.images.forEach((img: string) => {
                if (uploadedImageMap[img]) {
                    imageUrls.push(uploadedImageMap[img]);
                } else {
                    // Keep existing (might be URL or Base64)
                    imageUrls.push(img);
                }
            });
        }

        // Compat: Check image_base64 as filename
        if (q.image_base64 && uploadedImageMap[q.image_base64]) {
            if (imageUrls.length === 0) imageUrls.push(uploadedImageMap[q.image_base64]);
        }

        const normalized = {
            examType: q.examType || q.exam_type,
            domain: q.domain,
            questionText: q.questionText || q.question_text,
            questionType: q.questionType || q.question_type,
            explanation: q.explanation,
            // image_filename is commonly used in exports, map to imageBase64 if it's actually base64
            // Also support images array
            imageBase64: imageUrls.length > 0 ? imageUrls[0] : (q.imageBase64 || q.image_base64),
            images: imageUrls.length > 0 ? imageUrls : (q.images || (q.image_base64 ? [q.image_base64] : undefined)),
            simulationTargetJson: q.simulationTargetJson || q.simulation_target_json,
            options: Array.isArray(q.options) ? q.options.map((opt: any, index: number) => ({
                text: opt.text,
                isCorrect: opt.isCorrect !== undefined ? opt.isCorrect : opt.is_correct,
                sortOrder: opt.sortOrder !== undefined ? opt.sortOrder : (opt.sort_order || index + 1)
            })) : []
        };
        return normalized;
    };

    const handleImport = async () => {
        if (!jsonInput.trim()) {
            setError('JSONデータを入力してください');
            return;
        }

        try {
            let data = JSON.parse(jsonInput);
            let questions: any[] = [];

            // Support both array and object formats
            if (Array.isArray(data)) {
                questions = data;
            } else if (data.questions && Array.isArray(data.questions)) {
                questions = data.questions;
            } else {
                setError('無効なJSON形式です。"questions"配列、または問題オブジェクトの配列が必要です。');
                return;
            }

            setIsLoading(true);
            setError(null);

            setError(null);

            // Upload images first
            const uploadedImageMap: { [key: string]: string } = {};

            if (selectedImages.length > 0) {
                const supabase = createClient();

                for (const file of selectedImages) {
                    try {
                        // Generate unique filename to avoid collision but keep recognizable
                        const timestamp = new Date().getTime();
                        const uniqueFilename = `${timestamp}-${file.name}`;

                        const { data: uploadData, error: uploadError } = await supabase
                            .storage
                            .from('question-images')
                            .upload(uniqueFilename, file, {
                                cacheControl: '3600',
                                upsert: false
                            });

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase
                            .storage
                            .from('question-images')
                            .getPublicUrl(uniqueFilename);

                        uploadedImageMap[file.name] = publicUrl;

                    } catch (e: any) {
                        console.error(`Failed to upload ${file.name}:`, e);
                        // Continue with other images? Or stop? 
                        // For now we assume typical failure means config error, so maybe strict is better, 
                        // but partial success is also useful. Let's warn but continue.
                    }
                }
            }

            // Normalize data with image map
            const normalizedQuestions = questions.map(q => normalizeQuestion(q, uploadedImageMap));

            const result = await bulkUpsertQuestions({ questions: normalizedQuestions });
            setResults(result.results);

        } catch (e: any) {
            setError(`JSONパースエラー: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const createdCount = results?.filter(r => r.action === 'created').length || 0;
    const updatedCount = results?.filter(r => r.action === 'updated').length || 0;
    const skippedCount = results?.filter(r => r.action === 'skipped').length || 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Upload className="w-6 h-6" />
                            問題一括インポート
                        </h1>
                        <p className="text-slate-400">
                            JSON形式で問題を一括登録・更新します
                        </p>
                    </div>
                </div>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <FileJson className="w-5 h-5" />
                            JSONデータ
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            JSONファイルをアップロードするか、テキストエリアに直接入力してください
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* File Upload */}
                        <div>
                            <label className="block">
                                <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-lg hover:border-slate-500 transition-colors cursor-pointer bg-slate-900/50">
                                    <div className="text-center">
                                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                        <p className="text-sm text-slate-400">
                                            クリックまたはドラッグ&ドロップでJSONファイルをアップロード
                                        </p>
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>



                        {/* Image Upload Area */}
                        <div>
                            <div className="mb-2">
                                <Label className="text-white mb-1 block">画像ファイル (任意: JSON内のファイル名と紐付けます)</Label>
                                <p className="text-xs text-slate-400 mb-2">
                                    JSON内の <code>image_filename</code> や <code>images</code> 配列で指定したファイル名と一致する画像を選択してください。
                                </p>
                            </div>
                            <label className="block">
                                <div className="flex items-center justify-center w-full h-20 border border-slate-600 rounded-lg hover:border-slate-500 transition-colors cursor-pointer bg-slate-900/30">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="w-5 h-5 text-slate-400" />
                                        <p className="text-sm text-slate-400">
                                            {selectedImages.length > 0
                                                ? `${selectedImages.length} 個のファイルを選択中`
                                                : "画像を選択 (複数可)"}
                                        </p>
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageSelect}
                                    className="hidden"
                                />
                            </label>
                            {selectedImages.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedImages.map((file, i) => (
                                        <Badge key={i} variant="outline" className="text-xs border-slate-600 text-slate-400 font-normal">
                                            {file.name}
                                        </Badge>
                                    ))}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 text-xs text-red-400 hover:text-red-300 px-1"
                                        onClick={() => setSelectedImages([])}
                                    >
                                        クリア
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Text Area */}
                        <textarea
                            value={jsonInput}
                            onChange={(e) => {
                                setJsonInput(e.target.value);
                                setError(null);
                                setResults(null);
                            }}
                            placeholder={JSON.stringify(SAMPLE_TEMPLATES[sampleType], null, 2)}
                            className="w-full h-64 p-4 rounded-lg bg-slate-900 border border-slate-600 text-white font-mono text-sm placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                        />

                        {error && (
                            <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-300">
                                {error}
                            </Alert>
                        )}

                        <Button
                            onClick={handleImport}
                            disabled={isLoading || !jsonInput.trim()}
                            className="w-full bg-emerald-600 hover:bg-emerald-500"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    インポート中...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    インポート実行
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Results */}
                {results && (
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white">インポート結果</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4">
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-0 px-3 py-1">
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    新規作成: {createdCount}
                                </Badge>
                                <Badge className="bg-blue-500/20 text-blue-400 border-0 px-3 py-1">
                                    更新: {updatedCount}
                                </Badge>
                                {skippedCount > 0 && (
                                    <Badge className="bg-red-500/20 text-red-400 border-0 px-3 py-1">
                                        <XCircle className="w-4 h-4 mr-1" />
                                        スキップ: {skippedCount}
                                    </Badge>
                                )}
                            </div>

                            {results.filter(r => r.action === 'skipped').length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-slate-400">エラー詳細:</h4>
                                    {results.filter(r => r.action === 'skipped').map((r, i) => (
                                        <div key={i} className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                                            <p className="text-sm text-red-400">
                                                Hash: {r.hash.substring(0, 16)}... - {r.error}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setJsonInput('');
                                        setResults(null);
                                    }}
                                    className="border border-dashed border-slate-600 text-slate-300 hover:bg-slate-800"
                                >
                                    クリア
                                </Button>
                                <Link href="/admin/questions">
                                    <Button className="bg-emerald-600 hover:bg-emerald-500">
                                        問題一覧を確認
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Sample Format */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-white text-sm">JSON形式サンプル</CardTitle>
                        <Select
                            value={sampleType}
                            onValueChange={(val) => setSampleType(val as keyof typeof SAMPLE_TEMPLATES)}
                        >
                            <SelectTrigger className="w-[180px] bg-slate-900 border-slate-600 text-white h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Single">Single (単一選択)</SelectItem>
                                <SelectItem value="Multi">Multi (複数選択)</SelectItem>
                                <SelectItem value="DragDrop">DragDrop</SelectItem>
                                <SelectItem value="Simulation">Simulation</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent>
                        <pre className="text-xs text-slate-400 bg-slate-900 p-4 rounded-lg overflow-x-auto">
                            {JSON.stringify(SAMPLE_TEMPLATES[sampleType], null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
