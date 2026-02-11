'use client';

import { useState } from 'react';
import { Terminal, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SimulationProps {
    targetJson: Record<string, string> | null;
    onAnswer: (config: Record<string, string>) => void;
    disabled?: boolean;
    showResult?: boolean;
    userAnswer?: Record<string, string>;
}

export function Simulation({
    targetJson,
    onAnswer,
    disabled,
    showResult,
    userAnswer
}: SimulationProps) {
    const [parsedTarget, setParsedTarget] = useState<Record<string, string> | null>(() => {
        if (!targetJson) return null;
        if (typeof targetJson === 'string') {
            try {
                return JSON.parse(targetJson);
            } catch {
                console.error("Failed to parse targetJson");
                return null;
            }
        }
        return targetJson;
    });

    const fields = parsedTarget ? Object.keys(parsedTarget) : [];

    // Update parsedTarget if prop changes
    if (JSON.stringify(parsedTarget) !== JSON.stringify(targetJson) && targetJson && typeof targetJson !== 'string') {
        // simple check to keep sync if checking from parent, though usually initial load is enough
    }

    const [values, setValues] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        if (parsedTarget) {
            Object.keys(parsedTarget).forEach(f => initial[f] = '');
        }
        return initial;
    });

    const handleChange = (field: string, value: string) => {
        if (disabled) return;
        setValues(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        onAnswer(values);
    };

    const isComplete = fields.every(f => (values[f] || '').trim() !== '');

    const checkFieldCorrect = (field: string, value: string) => {
        if (!parsedTarget) return false;
        const targetValue = String(parsedTarget[field] || '');
        const actualValue = String(value || '');
        return targetValue.toLowerCase().trim() === actualValue.toLowerCase().trim();
    };

    const fieldLabels: Record<string, string> = {
        interface: 'インターフェース名',
        ip_address: 'IPアドレス',
        subnet_mask: 'サブネットマスク',
        tunnel_source: 'トンネルソース',
        tunnel_destination: 'トンネル宛先',
    };

    return (
        <div className="space-y-6">
            {/* Mobile warning */}
            <div className="md:hidden p-4 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 text-sm">
                ⚠️ シミュレーション問題はPC画面での操作を推奨します
            </div>

            <div className="block">
                {/* Terminal-like interface */}
                <div className="rounded-lg overflow-hidden border border-slate-700">


                    <div className="bg-slate-900 p-6 space-y-4">
                        {fields.map((field) => {
                            const displayValue = showResult ? (userAnswer?.[field] || '') : (values[field] || '');
                            const isCorrect = showResult && checkFieldCorrect(field, displayValue);
                            const isWrong = showResult && displayValue && !isCorrect;

                            return (
                                <div key={field} className="space-y-2">
                                    <Label
                                        htmlFor={field}
                                        className="text-slate-400 flex items-center gap-2"
                                    >
                                        <span className="text-emerald-500">$</span>
                                        {fieldLabels[field] || field}
                                        {showResult && (
                                            isCorrect ? (
                                                <Check className="w-4 h-4 text-emerald-500" />
                                            ) : isWrong ? (
                                                <X className="w-4 h-4 text-red-500" />
                                            ) : null
                                        )}
                                    </Label>
                                    <Input
                                        id={field}
                                        value={displayValue}
                                        onChange={(e) => handleChange(field, e.target.value)}
                                        disabled={disabled}
                                        placeholder={`Enter ${field}...`}
                                        className={cn(
                                            'font-mono bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 caret-emerald-500',
                                            showResult && isCorrect && 'border-emerald-500 bg-emerald-500/10',
                                            showResult && isWrong && 'border-red-500 bg-red-500/10'
                                        )}
                                    />
                                    {showResult && isWrong && parsedTarget && (
                                        <p className="text-sm text-emerald-400">
                                            正解: <code className="bg-slate-800 px-2 py-0.5 rounded">{parsedTarget[field]}</code>
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {showResult && parsedTarget && (
                    <div className="mt-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                        <h4 className="text-sm font-medium text-slate-400 mb-3">正解の設定:</h4>
                        <pre className="text-sm text-emerald-400 font-mono bg-slate-900 p-4 rounded overflow-x-auto">
                            {Object.entries(parsedTarget).map(([key, value]) => (
                                `${key}: ${value}\n`
                            )).join('')}
                        </pre>
                    </div>
                )}

                {!disabled && !showResult && (
                    <Button
                        onClick={handleSubmit}
                        disabled={!isComplete}
                        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500"
                    >
                        設定を適用
                    </Button>
                )}
            </div>
        </div>
    );
}
