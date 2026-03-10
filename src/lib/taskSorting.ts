import type { Task } from '@/types/task';

/**
 * Sort active (incomplete) tasks: most recently created first.
 */
export function sortActiveTasks(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
        // Newest createdAt first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

/**
 * Sort completed tasks: most recently completed first.
 */
export function sortCompletedTasks(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
        const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bTime - aTime;
    });
}

/**
 * Paginate an array: returns a slice for the given page.
 */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
    const start = page * pageSize;
    return items.slice(start, start + pageSize);
}

export const PAGE_SIZE = 50;
