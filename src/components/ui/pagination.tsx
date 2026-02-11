import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    baseUrl: string;
    searchParams?: Record<string, string | number | undefined>;
}

export function Pagination({ currentPage, totalPages, baseUrl, searchParams = {} }: PaginationProps) {
    if (totalPages <= 1) return null;

    const createUrl = (page: number) => {
        const params = new URLSearchParams();
        Object.entries(searchParams).forEach(([key, value]) => {
            if (value !== undefined) {
                params.set(key, String(value));
            }
        });
        params.set('page', String(page));
        return `${baseUrl}?${params.toString()}`;
    };

    // Calculate range of pages to show
    // Always show first, last, current, and neighbours
    const range = [];
    const delta = 1; // Number of pages to show on each side of current page

    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 ||
            i === totalPages ||
            (i >= currentPage - delta && i <= currentPage + delta)
        ) {
            range.push(i);
        } else if (range[range.length - 1] !== '...') {
            range.push('...');
        }
    }

    return (
        <div className="flex items-center justify-center space-x-2 py-4">
            <Link href={createUrl(1)} passHref legacyBehavior>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
                    disabled={currentPage === 1}
                >
                    <ChevronsLeft className="h-4 w-4" />
                    <span className="sr-only">First page</span>
                </Button>
            </Link>
            <Link href={createUrl(Math.max(1, currentPage - 1))} passHref legacyBehavior>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous page</span>
                </Button>
            </Link>

            {range.map((page, index) => (
                page === '...' ? (
                    <span key={`ellipsis-${index}`} className="text-slate-400 px-2">...</span>
                ) : (
                    <Link key={page} href={createUrl(page as number)} passHref legacyBehavior>
                        <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="icon"
                            className={`h-8 w-8 ${currentPage === page
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                        >
                            {page}
                        </Button>
                    </Link>
                )
            ))}

            <Link href={createUrl(Math.min(totalPages, currentPage + 1))} passHref legacyBehavior>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
                    disabled={currentPage === totalPages}
                >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next page</span>
                </Button>
            </Link>
            <Link href={createUrl(totalPages)} passHref legacyBehavior>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
                    disabled={currentPage === totalPages}
                >
                    <ChevronsRight className="h-4 w-4" />
                    <span className="sr-only">Last page</span>
                </Button>
            </Link>
        </div>
    );
}
