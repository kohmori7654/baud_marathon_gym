'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Trash2, GripVertical, Image as ImageIcon, FileJson, Upload, X } from 'lucide-react';
import { createQuestion, updateQuestion } from '../actions';
import type { Question, Option, QuestionType, TargetExamType, QuestionImage } from '@/types/database';

// Import new editor
import { DragDropEditor } from './DragDropEditor';

const questionSchema = z.object({
    examType: z.enum(['ENCOR', 'ENARSI', 'BOTH']),
    domain: z.string().min(1, '分野を入力してください'),
    questionText: z.string().min(1, '問題文を入力してください'),
    questionType: z.enum(['Single', 'Multi', 'DragDrop', 'Simulation']),
    explanation: z.string().optional(),
    simulationTargetJson: z.string().optional(),
    images: z.array(z.string()).optional(),
    options: z.array(z.object({
        text: z.string().min(1, '選択肢を入力してください'),
        isCorrect: z.boolean(),
        sortOrder: z.number(),
    })),
});

type QuestionFormValues = z.infer<typeof questionSchema>;

interface QuestionFormProps {
    initialData?: Question & { options: Option[], question_images?: QuestionImage[] };
}

export function QuestionForm({ initialData }: QuestionFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewImages, setPreviewImages] = useState<string[]>(
        initialData?.question_images?.map(img => img.image_data) ||
        (initialData?.image_base64 ? [initialData.image_base64] : [])
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<QuestionFormValues>({
        resolver: zodResolver(questionSchema),
        defaultValues: {
            examType: (initialData?.exam_type as TargetExamType) || 'ENCOR',
            domain: initialData?.domain || '',
            questionText: initialData?.question_text || '',
            questionType: (initialData?.question_type as QuestionType) || 'Single',
            explanation: initialData?.explanation || '',
            simulationTargetJson: initialData?.simulation_target_json
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? JSON.stringify(initialData.simulation_target_json, null, 2)
                : '',
            images: initialData?.question_images?.map(img => img.image_data) || (initialData?.image_base64 ? [initialData.image_base64] : []),
            options: initialData?.options?.map(o => ({
                text: o.text,
                isCorrect: o.is_correct,
                sortOrder: o.sort_order,
            })) || [
                    { text: '', isCorrect: false, sortOrder: 1 },
                    { text: '', isCorrect: false, sortOrder: 2 },
                    { text: '', isCorrect: false, sortOrder: 3 },
                    { text: '', isCorrect: false, sortOrder: 4 },
                ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'options',
    });

    const questionType = watch('questionType');
    const options = watch('options');

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Check limits (max 10 total)
        if (previewImages.length + files.length > 10) {
            alert('アップロードできる画像は最大10枚です');
            return;
        }

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setPreviewImages(prev => {
                    const newImages = [...prev, base64];
                    setValue('images', newImages);
                    return newImages;
                });
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        e.target.value = '';
    };

    const handleRemoveImage = (index: number) => {
        setPreviewImages(prev => {
            const newImages = prev.filter((_, i) => i !== index);
            setValue('images', newImages);
            return newImages;
        });
    };

    const onSubmit = async (data: QuestionFormValues) => {
        setIsLoading(true);
        setError(null);

        try {
            // Validate JSON if Simulation
            let simulationJson = undefined;
            if (data.questionType === 'Simulation' && data.simulationTargetJson) {
                try {
                    simulationJson = JSON.parse(data.simulationTargetJson);
                } catch (e) {
                    throw new Error('シミュレーションターゲットのJSON形式が不正です');
                }
            }

            const payload = {
                examType: data.examType,
                domain: data.domain,
                questionText: data.questionText,
                questionType: data.questionType,
                explanation: data.explanation,
                images: previewImages,
                imageBase64: previewImages.length > 0 ? previewImages[0] : undefined, // Fallback for backward compatibility
                simulationTargetJson: simulationJson,
                options: data.options.map((o, i) => ({
                    ...o,
                    sortOrder: i + 1, // Ensure sequential order
                })),
            };

            if (initialData) {
                const result = await updateQuestion({ ...payload, id: initialData.id });
                if (result.error) throw new Error(result.error);
            } else {
                const result = await createQuestion(payload);
                if (result.error) throw new Error(result.error);
            }

            router.push('/admin/questions');
            router.refresh();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <Card className="bg-slate-800/50 border-slate-700 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-white">基本情報</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-200">対象試験</Label>
                                <Select
                                    value={watch('examType')}
                                    onValueChange={(val) => setValue('examType', val as TargetExamType)}
                                >
                                    <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ENCOR">Core ENCOR</SelectItem>
                                        <SelectItem value="ENARSI">Conce ENARSI</SelectItem>
                                        <SelectItem value="BOTH">共通 (BOTH)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-200">問題形式</Label>
                                <Select
                                    value={questionType}
                                    onValueChange={(val) => setValue('questionType', val as QuestionType)}
                                >
                                    <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Single">単一選択 (Single)</SelectItem>
                                        <SelectItem value="Multi">複数選択 (Multi)</SelectItem>
                                        <SelectItem value="DragDrop">ドラッグ＆ドロップ (DragDrop)</SelectItem>
                                        <SelectItem value="Simulation">シミュレーション (Simulation)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-200">分野 (Domain)</Label>
                            <Input {...register('domain')} placeholder="例: Layer 3 Technologies" className="bg-slate-900 border-slate-600 text-white" />
                            {errors.domain && <p className="text-red-400 text-xs">{errors.domain.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-200">問題文</Label>
                            <Textarea {...register('questionText')} placeholder="問題文を入力..." className="min-h-[100px] bg-slate-900 border-slate-600 text-white" />
                            {errors.questionText && <p className="text-red-400 text-xs">{errors.questionText.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-200">解説 (Markdown)</Label>
                            <Textarea {...register('explanation')} placeholder="解説を入力..." className="min-h-[100px] bg-slate-900 border-slate-600 text-white" />
                        </div>
                    </CardContent>
                </Card>

                {/* Image Upload */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="w-5 h-5" />
                                問題画像 (任意)
                            </div>
                            <span className="text-xs font-normal text-slate-400">
                                最大10枚 ({previewImages.length}/10)
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => fileInputRef.current?.click()}
                                className="border border-dashed border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800 w-full"
                                disabled={previewImages.length >= 10}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                画像を選択 (複数可)
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        </div>

                        {previewImages.length > 0 && (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                {previewImages.map((img, idx) => (
                                    <div key={idx} className="relative group border border-slate-700 rounded-lg overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={
                                                img.startsWith('http') ? img :
                                                    img.startsWith('data:') ? img :
                                                        `data:image/png;base64,${img}`
                                            }
                                            alt={`Preview ${idx + 1}`}
                                            className="w-full h-full object-contain"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleRemoveImage(idx)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 rounded text-[10px] text-white">
                                            {idx + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Simulation JSON */}
                {questionType === 'Simulation' && (
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <FileJson className="w-5 h-5" />
                                シミュレーション定義 (JSON)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                {...register('simulationTargetJson')}
                                placeholder='{ "version": "1.0", "devices": [...], ... }'
                                className="font-mono min-h-[200px] bg-slate-900 border-slate-600 text-white"
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Options Section */}
                {questionType === 'DragDrop' ? (
                    <Card className="bg-slate-800/50 border-slate-700 md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-white">ドラッグ&ドロップ設定</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DragDropEditor
                                options={options}
                                onChange={(newOptions) => setValue('options', newOptions)}
                                settings={
                                    (() => {
                                        try {
                                            const json = watch('simulationTargetJson');
                                            return json ? JSON.parse(json) : {};
                                        } catch {
                                            return {};
                                        }
                                    })()
                                }
                                onSettingsChange={(newSettings) => {
                                    setValue('simulationTargetJson', JSON.stringify(newSettings));
                                }}
                            />
                        </CardContent>
                    </Card>
                ) : ['Single', 'Multi'].includes(questionType) ? (
                    <Card className="bg-slate-800/50 border-slate-700 md:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-white">選択肢</CardTitle>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => append({ text: '', isCorrect: false, sortOrder: fields.length + 1 })}
                                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                追加
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-start gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                                    <div className="mt-3 text-slate-500 cursor-move">
                                        <GripVertical className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <Input
                                                    {...register(`options.${index}.text`)}
                                                    placeholder={`選択肢 ${index + 1}`}
                                                    className="bg-slate-900 border-slate-600 text-white"
                                                />
                                                {errors.options?.[index]?.text && (
                                                    <p className="text-red-400 text-xs mt-1">{errors.options[index]?.text?.message}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 pt-2">
                                                <Checkbox
                                                    id={`correct-${index}`}
                                                    checked={watch(`options.${index}.isCorrect`)}
                                                    onCheckedChange={(checked) => setValue(`options.${index}.isCorrect`, checked as boolean)}
                                                    className="border-slate-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                                />
                                                <Label htmlFor={`correct-${index}`} className="text-sm text-slate-300 cursor-pointer select-none">
                                                    正解
                                                </Label>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                                className="text-slate-500 hover:text-red-400"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ) : null}
            </div>

            {error && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-300">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="flex justify-end gap-4">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.back()}
                    className="text-slate-400 hover:text-white"
                >
                    キャンセル
                </Button>
                <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500"
                    disabled={isLoading}
                >
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {initialData ? '更新する' : '作成する'}
                </Button>
            </div>
        </form>
    );
}
