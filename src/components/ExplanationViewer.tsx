'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExplanationViewerProps {
    explanation: string | null;
    isCorrect: boolean;
}

export function ExplanationViewer({ explanation, isCorrect }: ExplanationViewerProps) {
    if (!explanation) return null;

    return (
        <div className={cn(
            'mt-6 p-6 rounded-lg border',
            isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
        )}>
            <div className="flex items-center gap-2 mb-4">
                <BookOpen className={cn(
                    'w-5 h-5',
                    isCorrect ? 'text-emerald-500' : 'text-amber-500'
                )} />
                <h3 className={cn(
                    'font-semibold',
                    isCorrect ? 'text-emerald-400' : 'text-amber-400'
                )}>
                    {isCorrect ? '正解！' : '不正解'} - 解説
                </h3>
            </div>

            <div className="text-slate-200 prose prose-invert prose-sm max-w-none
        prose-headings:text-slate-100
        prose-p:text-slate-200
        prose-strong:text-white
        prose-code:text-emerald-300 prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
        prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700
        prose-table:border-collapse
        prose-th:bg-slate-800 prose-th:text-slate-100 prose-th:p-2 prose-th:border prose-th:border-slate-700
        prose-td:p-2 prose-td:border prose-td:border-slate-700 prose-td:text-slate-200
        prose-li:text-slate-200
        prose-ul:text-slate-200
        prose-a:text-emerald-300 prose-a:no-underline hover:prose-a:underline
      ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {explanation}
                </ReactMarkdown>
            </div>
        </div>
    );
}
