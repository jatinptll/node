import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationBarProps {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
}

export const PaginationBar = ({ currentPage, totalItems, pageSize, onPageChange }: PaginationBarProps) => {
    if (totalItems <= pageSize) return null;

    const totalPages = Math.ceil(totalItems / pageSize);
    const start = currentPage * pageSize + 1;
    const end = Math.min((currentPage + 1) * pageSize, totalItems);
    const hasPrev = currentPage > 0;
    const hasNext = currentPage < totalPages - 1;

    return (
        <div className="flex items-center justify-center gap-3 py-3 mt-2">
            <button
                onClick={() => hasPrev && onPageChange(currentPage - 1)}
                disabled={!hasPrev}
                className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center border border-border transition-colors",
                    hasPrev ? "text-foreground hover:surface-3 cursor-pointer" : "text-muted-foreground/30 cursor-not-allowed"
                )}
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-muted-foreground select-none">
                {start}–{end} of {totalItems}
            </span>
            <button
                onClick={() => hasNext && onPageChange(currentPage + 1)}
                disabled={!hasNext}
                className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center border border-border transition-colors",
                    hasNext ? "text-foreground hover:surface-3 cursor-pointer" : "text-muted-foreground/30 cursor-not-allowed"
                )}
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
};
