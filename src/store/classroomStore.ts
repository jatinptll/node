/**
 * Classroom Sync Store
 * Uses the Google OAuth token from Supabase Auth session
 * to fetch Google Classroom data and create tasks
 */
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllClassroomData, formatClassroomDueDate } from '@/lib/classroomApi';
import type { Task, TaskList } from '@/types/task';
import { useTaskStore } from './taskStore';
import * as db from '@/lib/database';

interface SyncedCourse {
    id: string;
    name: string;
    listId: string;
}

interface ClassroomState {
    isConnected: boolean;
    isSyncing: boolean;
    lastSyncAt: string | null;
    syncError: string | null;
    syncedCourses: SyncedCourse[];
    importedCourseworkIds: Set<string>;

    loadSyncState: (userId: string) => Promise<void>;
    syncNow: () => Promise<{ newTasks: number; updatedCourses: number }>;
    clearState: () => void;
}

const SUBJECT_COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#8B5CF6'];

let nextTaskId = 1000;

export const useClassroomStore = create<ClassroomState>((set, get) => ({
    isConnected: false,
    isSyncing: false,
    lastSyncAt: null,
    syncError: null,
    syncedCourses: [],
    importedCourseworkIds: new Set<string>(),

    loadSyncState: async (userId: string) => {
        try {
            const syncData = await db.fetchClassroomSync(userId);
            if (syncData) {
                set({
                    syncedCourses: syncData.synced_courses as SyncedCourse[] || [],
                    importedCourseworkIds: new Set(syncData.imported_coursework_ids as string[] || []),
                    lastSyncAt: syncData.last_sync_at,
                    isConnected: true,
                });
            }
        } catch (err) {
            console.error('Failed to load classroom sync state:', err);
        }
    },

    clearState: () => {
        set({
            isConnected: false,
            isSyncing: false,
            lastSyncAt: null,
            syncError: null,
            syncedCourses: [],
            importedCourseworkIds: new Set(),
        });
    },

    syncNow: async () => {
        // Get the Google OAuth token from the Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        const providerToken = session?.provider_token;

        if (!providerToken) {
            set({ syncError: 'No Google token available. Please sign out and sign in again with Google.' });
            return { newTasks: 0, updatedCourses: 0 };
        }

        const userId = session.user.id;

        set({ isSyncing: true, syncError: null, isConnected: true });

        try {
            const classroomData = await fetchAllClassroomData(providerToken);
            const taskStore = useTaskStore.getState();
            const { syncedCourses, importedCourseworkIds } = get();

            let newTaskCount = 0;
            let updatedCourseCount = 0;
            const newSyncedCourses = [...syncedCourses];
            const newImportedIds = new Set(importedCourseworkIds);

            for (const { course, coursework } of classroomData) {
                // Find or create a list for this course
                let syncedCourse = newSyncedCourses.find((c) => c.id === course.id);

                if (!syncedCourse) {
                    const listId = `classroom-${course.id}`;
                    const color = SUBJECT_COLORS[newSyncedCourses.length % SUBJECT_COLORS.length];

                    const newList: TaskList = {
                        id: listId,
                        workspaceId: 'academic',
                        name: course.name,
                        color,
                        sortOrder: taskStore.lists.filter((l) => l.workspaceId === 'academic').length,
                        isAcademic: true,
                        courseName: course.name,
                    };

                    taskStore.addList(newList);

                    syncedCourse = { id: course.id, name: course.name, listId };
                    newSyncedCourses.push(syncedCourse);
                    updatedCourseCount++;
                }

                // Import coursework as tasks
                for (const work of coursework) {
                    const courseworkKey = `${course.id}:${work.id}`;

                    if (newImportedIds.has(courseworkKey)) continue;

                    const dueDate = formatClassroomDueDate(work.dueDate);

                    const newTask: Task = {
                        id: `classroom-${Date.now()}-${nextTaskId++}`,
                        listId: syncedCourse.listId,
                        title: work.title,
                        description: work.description || `Assignment from ${course.name}`,
                        status: 'todo',
                        priority: dueDate ? 'p2' : 'p3',
                        isUrgent: false,
                        isImportant: false,
                        dueDate,
                        isCompleted: false,
                        sortOrder: taskStore.tasks.filter((t) => t.listId === syncedCourse!.listId).length + newTaskCount,
                        source: 'classroom' as const,
                        labels: [],
                        subtasks: [],
                        createdAt: work.creationTime || new Date().toISOString(),
                    };

                    taskStore.addClassroomTask(newTask);
                    newImportedIds.add(courseworkKey);
                    newTaskCount++;
                }
            }

            const newState = {
                isSyncing: false,
                lastSyncAt: new Date().toISOString(),
                syncedCourses: newSyncedCourses,
                importedCourseworkIds: newImportedIds,
                isConnected: true,
            };
            set(newState);

            // Persist sync state to Supabase
            await db.upsertClassroomSync(userId, {
                syncedCourses: newSyncedCourses,
                importedCourseworkIds: Array.from(newImportedIds),
                lastSyncAt: newState.lastSyncAt,
            }).catch(err => console.error('Failed to save sync state:', err));

            return { newTasks: newTaskCount, updatedCourses: updatedCourseCount };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Sync failed';
            set({ isSyncing: false, syncError: message });
            return { newTasks: 0, updatedCourses: 0 };
        }
    },
}));
