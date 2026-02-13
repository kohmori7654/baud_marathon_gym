'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface ComboboxOption {
    value: string;
    label: string;
}

interface ComboboxProps {
    options: ComboboxOption[];
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    emptyMessage?: string;
}

export function Combobox({
    options,
    value,
    onValueChange,
    placeholder = '入力または選択',
    className,
    inputClassName,
    emptyMessage = '該当なし',
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [inputText, setInputText] = React.useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);

    const selectedOption = options.find(o => o.value === value);
    const displayLabel = selectedOption?.label ?? '';

    const filteredOptions = React.useMemo(() => {
        if (!inputText.trim()) return options;
        const q = inputText.trim().toLowerCase();
        return options.filter(
            o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
        );
    }, [options, inputText]);

    React.useEffect(() => {
        if (!open) setInputText(displayLabel);
    }, [open, displayLabel]);

    React.useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (opt: ComboboxOption) => {
        onValueChange(opt.value);
        setInputText(opt.label);
        setOpen(false);
    };

    const handleFocus = () => setOpen(true);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value);
        setOpen(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setOpen(false);
            setInputText(displayLabel);
        }
    };

    return (
        <div ref={containerRef} className={cn('relative w-[180px]', className)}>
            <div className="relative">
                <Input
                    value={open ? inputText : (value === 'all' ? '' : displayLabel)}
                    placeholder={placeholder}
                    onFocus={handleFocus}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className={cn(
                        'bg-slate-900 border-slate-600 text-white pr-8',
                        inputClassName
                    )}
                    autoComplete="off"
                />
                <ChevronDown
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                    aria-hidden
                />
            </div>
            {open && (
                <ul
                    className="absolute z-50 mt-1 w-full max-h-[220px] overflow-auto rounded-md border border-slate-700 bg-slate-800 py-1 shadow-lg"
                    role="listbox"
                >
                    {filteredOptions.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-slate-400">{emptyMessage}</li>
                    ) : (
                        filteredOptions.map(opt => (
                            <li
                                key={opt.value}
                                role="option"
                                aria-selected={value === opt.value}
                                className={cn(
                                    'cursor-pointer px-3 py-2 text-sm text-white hover:bg-slate-700',
                                    value === opt.value && 'bg-slate-700/50'
                                )}
                                onClick={() => handleSelect(opt)}
                            >
                                {opt.label || '(未設定)'}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}
