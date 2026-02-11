'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Option } from '@/types/database';

interface SingleChoiceProps {
    options: Option[];
    onAnswer: (selectedIds: string[]) => void;
    disabled?: boolean;
    showResult?: boolean;
    userAnswer?: string[];
}

export function SingleChoice({
    options,
    onAnswer,
    disabled,
    showResult,
    userAnswer
}: SingleChoiceProps) {
    const [selected, setSelected] = useState<string | null>(null);

    const sortedOptions = [...options].sort((a, b) => a.sort_order - b.sort_order);

    const handleSelect = (optionId: string) => {
        if (disabled) return;
        setSelected(optionId);
    };

    const handleSubmit = () => {
        if (selected) {
            onAnswer([selected]);
        }
    };

    const getOptionStyle = (option: Option) => {
        if (!showResult) {
            return selected === option.id
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-slate-600 hover:border-slate-500';
        }

        // Show result mode
        if (option.is_correct) {
            return 'border-emerald-500 bg-emerald-500/20';
        }
        if (userAnswer?.includes(option.id) && !option.is_correct) {
            return 'border-red-500 bg-red-500/20';
        }
        return 'border-slate-600 opacity-50';
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                {sortedOptions.map((option, index) => (
                    <button
                        key={option.id}
                        onClick={() => handleSelect(option.id)}
                        disabled={disabled}
                        className={cn(
                            'w-full p-4 rounded-lg border-2 text-left transition-all flex items-start gap-3',
                            getOptionStyle(option),
                            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                        )}
                    >
                        <span className={cn(
                            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold',
                            selected === option.id || (showResult && option.is_correct)
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
                    disabled={!selected}
                    className="w-full bg-emerald-600 hover:bg-emerald-500"
                >
                    回答する
                </Button>
            )}
        </div>
    );
}
