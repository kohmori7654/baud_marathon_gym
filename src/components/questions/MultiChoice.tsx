'use client';

import { useState } from 'react';
import { Check, Square, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Option } from '@/types/database';

interface MultiChoiceProps {
    options: Option[];
    onAnswer: (selectedIds: string[]) => void;
    disabled?: boolean;
    showResult?: boolean;
    userAnswer?: string[];
}

export function MultiChoice({
    options,
    onAnswer,
    disabled,
    showResult,
    userAnswer
}: MultiChoiceProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const sortedOptions = [...options].sort((a, b) => a.sort_order - b.sort_order);

    const handleToggle = (optionId: string) => {
        if (disabled) return;
        const newSelected = new Set(selected);
        if (newSelected.has(optionId)) {
            newSelected.delete(optionId);
        } else {
            newSelected.add(optionId);
        }
        setSelected(newSelected);
    };

    const handleSubmit = () => {
        if (selected.size > 0) {
            onAnswer([...selected]);
        }
    };

    const getOptionStyle = (option: Option) => {
        if (!showResult) {
            return selected.has(option.id)
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-slate-600 hover:border-slate-500';
        }

        // Show result mode
        const wasSelected = userAnswer?.includes(option.id);

        if (option.is_correct && wasSelected) {
            return 'border-emerald-500 bg-emerald-500/20'; // Correct and selected
        }
        if (option.is_correct && !wasSelected) {
            return 'border-amber-500 bg-amber-500/20'; // Correct but missed
        }
        if (!option.is_correct && wasSelected) {
            return 'border-red-500 bg-red-500/20'; // Wrong selection
        }
        return 'border-slate-600 opacity-50';
    };

    const correctCount = options.filter(o => o.is_correct).length;

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-400">
                ※ {correctCount}つ選択してください
            </p>

            <div className="space-y-3">
                {sortedOptions.map((option, index) => (
                    <button
                        key={option.id}
                        onClick={() => handleToggle(option.id)}
                        disabled={disabled}
                        className={cn(
                            'w-full p-4 rounded-lg border-2 text-left transition-all flex items-start gap-3',
                            getOptionStyle(option),
                            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                        )}
                    >
                        <span className="flex-shrink-0 mt-0.5">
                            {selected.has(option.id) || (showResult && userAnswer?.includes(option.id)) ? (
                                <CheckSquare className={cn(
                                    'w-5 h-5',
                                    showResult
                                        ? option.is_correct ? 'text-emerald-500' : 'text-red-500'
                                        : 'text-emerald-500'
                                )} />
                            ) : (
                                <Square className="w-5 h-5 text-slate-500" />
                            )}
                        </span>
                        <span className={cn(
                            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold',
                            selected.has(option.id) || (showResult && option.is_correct)
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-700 text-slate-300'
                        )}>
                            {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-slate-200 pt-1">{option.text}</span>
                        {showResult && option.is_correct && (
                            <Check className="ml-auto w-5 h-5 text-emerald-500" />
                        )}
                    </button>
                ))}
            </div>

            {!disabled && !showResult && (
                <Button
                    onClick={handleSubmit}
                    disabled={selected.size === 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-500"
                >
                    回答する
                </Button>
            )}
        </div>
    );
}
