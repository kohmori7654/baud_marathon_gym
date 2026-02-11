'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, GripVertical, AlertCircle, ArrowDown, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DragDropOption {
    text: string;
    isCorrect: boolean;
    sortOrder: number;
}

export type DragDropType = 'categorization' | 'ordering' | 'matching';

interface DragDropEditorProps {
    options: DragDropOption[];
    onChange: (options: DragDropOption[]) => void;
    settings: { dragDropType?: DragDropType };
    onSettingsChange: (settings: { dragDropType: DragDropType }) => void;
}

interface Group {
    id: string; // internal id for key
    source: string;
    targets: { id: string; text: string }[];
}

export function DragDropEditor({ options, onChange, settings, onSettingsChange }: DragDropEditorProps) {
    const [groups, setGroups] = useState<Group[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const mode = settings?.dragDropType || 'categorization';

    // Initialize groups from options only once on mount
    useEffect(() => {
        if (isInitialized) return;

        const initialGroups: Group[] = [];
        const sourceMap = new Map<string, Group>();

        // Fallback for options that don't match pattern
        const uncategorized: Group = {
            id: 'uncategorized',
            source: '未分類 (形式不正)',
            targets: []
        };

        options.forEach(opt => {
            if (!opt.text.includes('|')) {
                if (opt.text.trim() !== '') {
                    uncategorized.targets.push({ id: crypto.randomUUID(), text: opt.text });
                }
                return;
            }

            const [source, target] = opt.text.split('|').map(s => s.trim());
            if (!sourceMap.has(source)) {
                const newGroup: Group = {
                    id: crypto.randomUUID(),
                    source: source,
                    targets: []
                };
                sourceMap.set(source, newGroup);
                initialGroups.push(newGroup);
            }

            if (target) {
                sourceMap.get(source)!.targets.push({ id: crypto.randomUUID(), text: target });
            }
        });

        if (uncategorized.targets.length > 0) {
            initialGroups.push(uncategorized);
        }

        if (initialGroups.length === 0) {
            // Default empty state based on mode
            initialGroups.push(createEmptyGroup(mode, 1));
        }

        setGroups(initialGroups);
        setIsInitialized(true);
    }, [options, isInitialized, mode]);

    const createEmptyGroup = (currentMode: DragDropType, index: number): Group => {
        if (currentMode === 'ordering') {
            return {
                id: crypto.randomUUID(),
                source: `手順${index}`,
                targets: [{ id: crypto.randomUUID(), text: '' }]
            };
        }
        return {
            id: crypto.randomUUID(),
            source: '',
            targets: [{ id: crypto.randomUUID(), text: '' }]
        };
    };

    // Broadcast changes to parent
    const updateParent = (currentGroups: Group[]) => {
        const newOptions: DragDropOption[] = [];
        let sortOrder = 1;

        currentGroups.forEach(group => {
            if (group.id === 'uncategorized') {
                group.targets.forEach(t => {
                    newOptions.push({
                        text: t.text,
                        isCorrect: true, // Force true for dragdrop items?
                        sortOrder: sortOrder++
                    });
                });
                return;
            }

            group.targets.forEach(t => {
                if (group.source && t.text) {
                    newOptions.push({
                        text: `${group.source}|${t.text}`,
                        isCorrect: true,
                        sortOrder: sortOrder++
                    });
                }
            });
        });

        onChange(newOptions);
    };

    const handleModeChange = (newMode: DragDropType) => {
        onSettingsChange({ dragDropType: newMode });

        // Optional: Reset or reformat groups based on mode?
        // For now, let's keep data but maybe refresh labels if switching TO ordering
        if (newMode === 'ordering') {
            const newGroups = groups.map((g, i) => ({
                ...g,
                source: g.source || `手順${i + 1}`
            }));
            setGroups(newGroups);
            updateParent(newGroups);
        }
    };

    const handleAddGroup = () => {
        const newGroups = [
            ...groups,
            createEmptyGroup(mode, groups.length + 1)
        ];
        setGroups(newGroups);
        updateParent(newGroups);
    };

    const handleRemoveGroup = (index: number) => {
        const newGroups = groups.filter((_, i) => i !== index);

        // Re-number for ordering mode
        if (mode === 'ordering') {
            newGroups.forEach((g, i) => {
                // Only rename if it matches standard pattern to avoid overwriting custom text
                if (g.source.startsWith('手順')) {
                    g.source = `手順${i + 1}`;
                }
            });
        }

        setGroups(newGroups);
        updateParent(newGroups);
    };

    const handleSourceChange = (index: number, value: string) => {
        const newGroups = [...groups];
        newGroups[index].source = value;
        setGroups(newGroups);
        updateParent(newGroups);
    };

    const handleAddTarget = (groupIndex: number) => {
        const newGroups = [...groups];
        newGroups[groupIndex].targets.push({ id: crypto.randomUUID(), text: '' });
        setGroups(newGroups);
        updateParent(newGroups);
    };

    const handleRemoveTarget = (groupIndex: number, targetIndex: number) => {
        const newGroups = [...groups];
        newGroups[groupIndex].targets = newGroups[groupIndex].targets.filter((_, i) => i !== targetIndex);
        setGroups(newGroups);
        updateParent(newGroups);
    };

    const handleTargetChange = (groupIndex: number, targetIndex: number, value: string) => {
        const newGroups = [...groups];
        newGroups[groupIndex].targets[targetIndex].text = value;
        setGroups(newGroups);
        updateParent(newGroups);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <div className="space-y-1">
                    <Label className="text-slate-200">ドラッグ&ドロップ形式</Label>
                    <p className="text-xs text-slate-400">問題の性質に合わせてUIを切り替えます</p>
                </div>
                <Select
                    value={mode}
                    onValueChange={(val) => handleModeChange(val as DragDropType)}
                >
                    <SelectTrigger className="w-[200px] bg-slate-800 border-slate-600 text-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="categorization">カテゴライズ (標準)</SelectItem>
                        <SelectItem value="ordering">順序付け (シーケンス)</SelectItem>
                        <SelectItem value="matching">機能マッチング (1対1)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Alert className="bg-slate-800/50 border-emerald-500/50 text-emerald-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    {mode === 'categorization' && (
                        <span>
                            <strong>カテゴライズ</strong>: 複数の項目(Source)に、複数の選択肢(Target)を分類します。<br />
                            例: L3プロトコル → IP, ICMP / L4プロトコル → TCP, UDP
                        </span>
                    )}
                    {mode === 'ordering' && (
                        <span>
                            <strong>順序付け</strong>: 正しい手順の順番に並べ替えます。<br />
                            項目は自動的に連番(手順1, 手順2...)になります。
                        </span>
                    )}
                    {mode === 'matching' && (
                        <span>
                            <strong>機能マッチング</strong>: 用語と説明などを1対1で対応させます。<br />
                            左側(Source)に対応する右側(Target)を1つずつ入力してください。
                        </span>
                    )}
                </AlertDescription>
            </Alert>

            <div className={`space-y-4 ${mode === 'ordering' ? 'flex flex-col items-center' : ''}`}>
                {groups.map((group, gIndex) => (
                    <div key={group.id} className={`w-full ${mode === 'ordering' ? 'max-w-2xl relative' : ''}`}>

                        {/* Ordering Connector Arrow */}
                        {mode === 'ordering' && gIndex > 0 && (
                            <div className="flex justify-center py-2 text-slate-500">
                                <ArrowDown className="w-6 h-6" />
                            </div>
                        )}

                        <Card className={`bg-slate-800/30 border-slate-700 ${mode === 'matching' ? 'border-l-4 border-l-blue-500' : ''}`}>
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-start gap-4">
                                    {/* Source Input */}
                                    <div className="flex-1 space-y-2">
                                        <Label className="text-slate-300">
                                            {mode === 'ordering' ? '手順 (順序)' : mode === 'matching' ? '項目 (左側)' : '項目 (ドロップエリア)'}
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={group.source}
                                                onChange={(e) => handleSourceChange(gIndex, e.target.value)}
                                                placeholder={
                                                    mode === 'ordering' ? "手順1" :
                                                        mode === 'matching' ? "用語/コマンド" :
                                                            "カテゴリ名"
                                                }
                                                className="bg-slate-900 border-slate-600 text-white font-medium"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveGroup(gIndex)}
                                                className="text-slate-500 hover:text-red-400"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Matching Visual Indicator */}
                                    {mode === 'matching' && (
                                        <div className="self-center pt-6 text-slate-500">
                                            <ArrowRight className="w-5 h-5" />
                                        </div>
                                    )}

                                    {/* Targets Section */}
                                    <div className={`flex-1 space-y-2 ${mode === 'matching' ? '' : 'pl-6 border-l-2 border-slate-700'}`}>
                                        <Label className="text-slate-400 text-sm">
                                            {mode === 'matching' ? '対応する選択肢 (右側)' : '正解となる選択肢'}
                                        </Label>

                                        <div className="space-y-2">
                                            {group.targets.map((target, tIndex) => (
                                                <div key={target.id} className="flex gap-2 items-center">
                                                    {mode !== 'matching' && (
                                                        <div className="text-slate-600">
                                                            <GripVertical className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                    <Input
                                                        value={target.text}
                                                        onChange={(e) => handleTargetChange(gIndex, tIndex, e.target.value)}
                                                        placeholder="選択肢を入力"
                                                        className="bg-slate-900/50 border-slate-600 text-slate-200 text-sm"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveTarget(gIndex, tIndex)}
                                                        className="h-8 w-8 text-slate-500 hover:text-red-400"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleAddTarget(gIndex)}
                                                className="border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800 w-full"
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                {group.targets.length === 0 ? '選択肢を追加' : '別解を追加'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>

            <Button
                type="button"
                variant="ghost"
                onClick={handleAddGroup}
                className="w-full border border-dashed border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800 py-6"
            >
                <Plus className="w-4 h-4 mr-2" />
                {mode === 'ordering' ? '次の手順を追加' :
                    mode === 'matching' ? '新しいペアを追加' :
                        '新しい項目 (ドロップエリア) を追加'}
            </Button>
        </div>
    );
}
