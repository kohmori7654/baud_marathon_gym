'use client';

import { useState } from 'react';
import { Terminal, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn, deepEqual } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SimulationProps {
    targetJson: Record<string, string> | null;
    onAnswer: (config: Record<string, string>) => void;
    disabled?: boolean;
    showResult?: boolean;
    userAnswer?: Record<string, string>; // In this new mode, this is likely containing the full JSON string in a specific key or just passed as object
}

export function Simulation({
    targetJson,
    onAnswer,
    disabled,
    showResult,
    userAnswer
}: SimulationProps) {
    const [jsonInput, setJsonInput] = useState<string>(() => {
        if (userAnswer && userAnswer.json_input) {
            return userAnswer.json_input;
        }
        return '';
    });
    const [parseError, setParseError] = useState<string | null>(null);

    const [parsedTarget] = useState<any>(() => {
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

    const handleChange = (value: string) => {
        setJsonInput(value);
        if (parseError) setParseError(null);
    };

    const handleSubmit = () => {
        try {
            // Validate JSON syntax
            JSON.parse(jsonInput);
            // Send as a special key 'json_input' to fit the Record<string, string> signature for now
            onAnswer({ json_input: jsonInput });
        } catch (e: any) {
            setParseError("JSONの形式が正しくありません: " + e.message);
        }
    };

    // Calculate correctness for display
    const isCorrect = (() => {
        if (!showResult || !parsedTarget) return false;
        try {
            const inputStr = userAnswer?.json_input || '';
            const inputObj = JSON.parse(inputStr);
            return deepEqual(parsedTarget, inputObj);
        } catch {
            return false;
        }
    })();

    return (
        <div className="space-y-6">
            <div className="block">
                {/* Terminal-like interface */}
                <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                    <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm text-slate-400">Simulation Config</span>
                        </div>
                        {showResult && (
                            <div className={cn(
                                "flex items-center gap-2 text-sm px-3 py-1 rounded-full border",
                                isCorrect
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/50"
                                    : "bg-red-500/10 text-red-400 border-red-500/50"
                            )}>
                                {isCorrect ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        <span>正解</span>
                                    </>
                                ) : (
                                    <>
                                        <X className="w-4 h-4" />
                                        <span>不正解</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-0">
                        <Textarea
                            value={showResult ? (userAnswer?.json_input || '') : jsonInput}
                            onChange={(e) => handleChange(e.target.value)}
                            disabled={disabled}
                            placeholder="// ここにエクスポートされたJSON設定を貼り付けてください..."
                            className={cn(
                                'font-mono bg-slate-950 border-0 text-slate-300 placeholder:text-slate-600 focus-visible:ring-0 min-h-[300px] resize-y p-4 rounded-none leading-relaxed',
                                showResult && isCorrect && 'bg-emerald-950/10',
                                showResult && !isCorrect && 'bg-red-950/10'
                            )}
                            spellCheck={false}
                        />
                    </div>
                </div>

                {parseError && (
                    <Alert variant="destructive" className="mt-4 bg-red-900/20 border-red-800 text-red-300">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>エラー</AlertTitle>
                        <AlertDescription>{parseError}</AlertDescription>
                    </Alert>
                )}

                {showResult && !isCorrect && parsedTarget && (
                    <div className="mt-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                        <h4 className="text-sm font-medium text-slate-400 mb-2">正解の構成 (JSON):</h4>
                        <div className="bg-slate-950 p-4 rounded border border-slate-800 overflow-x-auto">
                            <pre className="text-xs text-emerald-400 font-mono">
                                {JSON.stringify(parsedTarget, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}

                {!disabled && !showResult && (
                    <Button
                        onClick={handleSubmit}
                        disabled={!jsonInput.trim()}
                        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500"
                    >
                        設定を適用 (JSON)
                    </Button>
                )}
            </div>
        </div>
    );
}
