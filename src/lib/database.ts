/**
 * Database Service - Syncs local Zustand state with Supabase
 * Uses untyped client to avoid issues with generated types not matching schema
 */
import { createClient } from '@supabase/supabase-js';
import type { Task, TaskList } from '@/types/task';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Untyped client for database operations (types.ts doesn't include our tables yet)
const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
});

// ============================================
// Task Lists
// ============================================

export async function fetchUserLists(userId: string): Promise<TaskList[]> {
    const { data, error } = await db
        .from('task_lists')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order');

    if (error) throw error;

    return (data || []).map((row: any) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        name: row.name,
        color: row.color,
        icon: row.icon,
        sortOrder: row.sort_order,
        isAcademic: row.is_academic,
        courseName: row.course_name,
    }));
}

export async function upsertList(userId: string, list: TaskList): Promise<void> {
    const { error } = await db
        .from('task_lists')
        .upsert({
            id: list.id,
            user_id: userId,
            workspace_id: list.workspaceId,
            name: list.name,
            color: list.color,
            icon: list.icon || null,
            sort_order: list.sortOrder,
            is_academic: list.isAcademic || false,
            course_name: list.courseName || null,
        }, { onConflict: 'id,user_id' });

    if (error) throw error;
}

export async function deleteList(userId: string, listId: string): Promise<void> {
    const { error } = await db
        .from('task_lists')
        .delete()
        .eq('id', listId)
        .eq('user_id', userId);

    if (error) throw error;
}

// ============================================
// Tasks
// ============================================

export async function fetchUserTasks(userId: string): Promise<Task[]> {
    const { data, error } = await db
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order');

    if (error) throw error;

    return (data || []).map((row: any) => ({
        id: row.id,
        listId: row.list_id,
        sectionId: row.section_id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        isUrgent: row.is_urgent,
        isImportant: row.is_important,
        dueDate: row.due_date,
        startDate: row.start_date,
        completedAt: row.completed_at,
        isCompleted: row.is_completed,
        sortOrder: row.sort_order,
        source: row.source,
        labels: row.labels || [],
        subtasks: row.subtasks || [],
        createdAt: row.created_at,
    }));
}

export async function upsertTask(userId: string, task: Task): Promise<void> {
    const { error } = await db
        .from('tasks')
        .upsert({
            id: task.id,
            user_id: userId,
            list_id: task.listId,
            section_id: task.sectionId || null,
            title: task.title,
            description: task.description || null,
            status: task.status,
            priority: task.priority,
            is_urgent: task.isUrgent || false,
            is_important: task.isImportant || false,
            due_date: task.dueDate || null,
            start_date: task.startDate || null,
            completed_at: task.completedAt || null,
            is_completed: task.isCompleted,
            sort_order: task.sortOrder,
            source: task.source,
            labels: task.labels,
            subtasks: task.subtasks,
            created_at: task.createdAt,
        }, { onConflict: 'id,user_id' });

    if (error) throw error;
}

export async function deleteTaskFromDB(userId: string, taskId: string): Promise<void> {
    const { error } = await db
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

    if (error) throw error;
}

// ============================================
// Classroom Sync State
// ============================================

export async function fetchClassroomSync(userId: string) {
    const { data, error } = await db
        .from('classroom_sync')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function upsertClassroomSync(
    userId: string,
    syncData: {
        syncedCourses: any[];
        importedCourseworkIds: string[];
        lastSyncAt: string | null;
    }
): Promise<void> {
    const { error } = await db
        .from('classroom_sync')
        .upsert({
            user_id: userId,
            synced_courses: syncData.syncedCourses,
            imported_coursework_ids: syncData.importedCourseworkIds,
            last_sync_at: syncData.lastSyncAt,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

    if (error) throw error;
}

// ============================================
// User Profile
// ============================================

export async function fetchProfile(userId: string) {
    const { data, error } = await db
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
}
