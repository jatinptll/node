import { create } from 'zustand';
import type { Task, TaskList, Workspace, Section, KanbanColumn, Priority, TaskStatus } from '@/types/task';
import * as db from '@/lib/database';
import { useUIStore } from '@/store/uiStore';
import { toast } from 'sonner';

const SUBJECT_COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#8B5CF6'];

const defaultWorkspaces: Workspace[] = [
  { id: 'personal', name: 'Personal', type: 'personal' },
  { id: 'academic', name: 'Academics', type: 'academic' },
];

const defaultColumns: KanbanColumn[] = [
  { id: 'col-todo', listId: 'inbox', name: 'To Do', color: '#94A3B8', sortOrder: 0 },
  { id: 'col-progress', listId: 'inbox', name: 'In Progress', color: '#3B82F6', sortOrder: 1 },
  { id: 'col-review', listId: 'inbox', name: 'Review', color: '#F59E0B', sortOrder: 2 },
  { id: 'col-done', listId: 'inbox', name: 'Done', color: '#10B981', sortOrder: 3 },
];

// Default lists/tasks for unauthenticated users
const defaultLists: TaskList[] = [
  { id: 'inbox', workspaceId: 'personal', name: 'Inbox', color: '#7C3AED', sortOrder: 0 },
  { id: 'projects', workspaceId: 'personal', name: 'Projects', color: '#3B82F6', sortOrder: 1 },
];

const defaultTasks: Task[] = [];

/**
 * Helper: persist to Supabase and show a toast if it fails.
 * Returns true on success, false on failure.
 */
async function persistToDB(
  operation: () => Promise<void>,
  errorLabel: string
): Promise<boolean> {
  try {
    await operation();
    return true;
  } catch (err) {
    console.error(`${errorLabel}:`, err);
    toast.error('Sync failed', {
      description: `${errorLabel}. Your change may not be saved. Try reloading.`,
    });
    return false;
  }
}

interface TaskStore {
  workspaces: Workspace[];
  lists: TaskList[];
  tasks: Task[];
  sections: Section[];
  columns: KanbanColumn[];
  userId: string | null;
  isLoaded: boolean;

  // Data loading
  loadUserData: (userId: string) => Promise<void>;
  clearUserData: () => void;

  // Task actions
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (workspaceId: string) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'sortOrder' | 'subtasks' | 'labels' | 'isCompleted' | 'source'> & { title: string; listId: string; priority?: Priority; status?: TaskStatus }) => void;
  addClassroomTask: (task: Task) => void;
  addList: (list: TaskList) => void;
  updateList: (listId: string, updates: Partial<TaskList>) => void;
  deleteList: (listId: string) => void;
  toggleTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  moveTask: (taskId: string, status: TaskStatus) => void;
  getTasksForList: (listId: string) => Task[];
  getTasksByStatus: (listId: string) => Record<TaskStatus, Task[]>;
}

let nextId = 100;

export const useTaskStore = create<TaskStore>((set, get) => ({
  workspaces: defaultWorkspaces,
  lists: [], // Start empty to prevent ghosting before DB loads
  tasks: defaultTasks,
  sections: [],
  columns: defaultColumns,
  userId: null,
  isLoaded: false,

  loadUserData: async (userId: string) => {
    try {
      const [workspaces, lists, tasks] = await Promise.all([
        db.fetchUserWorkspaces(userId),
        db.fetchUserLists(userId),
        db.fetchUserTasks(userId),
      ]);

      const finalWorkspaces = workspaces.length > 0 ? workspaces : defaultWorkspaces;
      const finalLists = lists.length > 0 ? lists : defaultLists;

      set({
        workspaces: finalWorkspaces,
        lists: finalLists,
        tasks,
        userId,
        isLoaded: true,
      });

      // If user had no workspaces saved yet, seed the defaults to DB
      if (workspaces.length === 0) {
        for (let i = 0; i < defaultWorkspaces.length; i++) {
          db.upsertWorkspace(userId, defaultWorkspaces[i], i).catch(err =>
            console.error('Failed to seed default workspace:', err)
          );
        }
      }

      // Cleanup hidden list IDs that reference lists that no longer exist
      useUIStore.getState().cleanupHiddenLists(finalLists.map(l => l.id));
    } catch (err) {
      console.error('Failed to load user data:', err);
      toast.error('Failed to load data', {
        description: 'Could not fetch your data from the server. Please reload.',
      });
      set({ userId, isLoaded: true });
    }
  },

  clearUserData: () => {
    set({
      workspaces: defaultWorkspaces,
      lists: defaultLists,
      tasks: [],
      userId: null,
      isLoaded: false,
    });
  },

  addTask: (partial) => {
    const userId = get().userId;
    const task: Task = {
      id: `t${Date.now()}-${nextId++}`,
      listId: partial.listId,
      title: partial.title,
      description: partial.description,
      status: partial.status || 'todo',
      priority: partial.priority || 'p4',
      isCompleted: false,
      sortOrder: get().tasks.filter(t => t.listId === partial.listId).length,
      source: 'manual',
      labels: [],
      subtasks: [],
      dueDate: partial.dueDate,
      createdAt: new Date().toISOString(),
    };

    // Optimistically update UI
    set((s) => ({ tasks: [task, ...s.tasks] }));

    // Persist to Supabase — rollback on failure
    if (userId) {
      persistToDB(
        () => db.upsertTask(userId, task),
        'Failed to save task'
      ).then(success => {
        if (!success) {
          // Rollback: remove the task from local state
          set((s) => ({ tasks: s.tasks.filter(t => t.id !== task.id) }));
        }
      });
    }
  },

  addClassroomTask: (task) => {
    const userId = get().userId;
    set((s) => {
      if (s.tasks.some((t) => t.id === task.id)) return s;
      return { tasks: [...s.tasks, task] };
    });

    // Persist to Supabase
    if (userId) {
      persistToDB(
        () => db.upsertTask(userId, task),
        'Failed to save classroom task'
      );
    }
  },

  addWorkspace: (workspace) => {
    const userId = get().userId;
    const prevWorkspaces = get().workspaces;
    set((state) => ({ workspaces: [...state.workspaces, workspace] }));

    if (userId) {
      persistToDB(
        () => db.upsertWorkspace(userId, workspace, get().workspaces.length - 1),
        'Failed to save workspace'
      ).then(success => {
        if (!success) {
          set({ workspaces: prevWorkspaces });
        }
      });
    }
  },

  updateWorkspace: (workspaceId, updates) => {
    const userId = get().userId;
    const prevWorkspaces = get().workspaces;
    set((state) => ({
      workspaces: state.workspaces.map(w => w.id === workspaceId ? { ...w, ...updates } : w)
    }));

    if (userId) {
      const workspace = get().workspaces.find(w => w.id === workspaceId);
      if (workspace) {
        persistToDB(
          () => db.upsertWorkspace(userId, workspace),
          'Failed to update workspace'
        ).then(success => {
          if (!success) {
            set({ workspaces: prevWorkspaces });
          }
        });
      }
    }
  },

  deleteWorkspace: (workspaceId) => {
    const userId = get().userId;
    const prevState = { workspaces: get().workspaces, lists: get().lists, tasks: get().tasks };
    const listsToDelete = get().lists.filter(l => l.workspaceId === workspaceId);

    set((state) => ({
      workspaces: state.workspaces.filter(w => w.id !== workspaceId),
      lists: state.lists.filter(l => l.workspaceId !== workspaceId),
      tasks: state.tasks.filter(t => !listsToDelete.some(l => l.id === t.listId)),
    }));

    if (userId) {
      persistToDB(
        async () => {
          await db.deleteWorkspaceFromDB(userId, workspaceId);
          for (const list of listsToDelete) {
            await db.deleteList(userId, list.id);
          }
        },
        'Failed to delete workspace'
      ).then(success => {
        if (!success) {
          set(prevState);
        }
      });
    }
  },

  addList: (list) => {
    const userId = get().userId;
    const prevLists = get().lists;

    set((s) => {
      if (s.lists.some((l) => l.id === list.id)) return s;
      return { lists: [...s.lists, list] };
    });

    // Persist to Supabase — rollback on failure
    if (userId) {
      persistToDB(
        () => db.upsertList(userId, list),
        'Failed to save list'
      ).then(success => {
        if (!success) {
          set({ lists: prevLists });
        }
      });
    }
  },

  updateList: (listId, updates) => {
    const userId = get().userId;
    const prevLists = get().lists;

    set((s) => ({
      lists: s.lists.map(l => l.id === listId ? { ...l, ...updates } : l),
    }));

    // Persist to Supabase — rollback on failure
    if (userId) {
      const list = get().lists.find(l => l.id === listId);
      if (list) {
        persistToDB(
          () => db.upsertList(userId, list),
          'Failed to update list'
        ).then(success => {
          if (!success) {
            set({ lists: prevLists });
          }
        });
      }
    }
  },

  deleteList: (listId) => {
    const userId = get().userId;
    const prevState = { lists: get().lists, tasks: get().tasks };

    set((s) => ({
      lists: s.lists.filter(l => l.id !== listId),
      tasks: s.tasks.filter(t => t.listId !== listId),
    }));

    // Persist to Supabase — rollback on failure
    if (userId) {
      persistToDB(
        () => db.deleteList(userId, listId),
        'Failed to delete list'
      ).then(success => {
        if (!success) {
          set(prevState);
        }
      });
    }
  },

  toggleTask: (taskId) => {
    const userId = get().userId;
    const prevTasks = get().tasks;

    set((s) => ({
      tasks: s.tasks.map(t => t.id === taskId ? {
        ...t,
        isCompleted: !t.isCompleted,
        completedAt: !t.isCompleted ? new Date().toISOString() : undefined,
        status: !t.isCompleted ? 'done' as TaskStatus : 'todo' as TaskStatus,
      } : t),
    }));

    // Persist to Supabase — rollback on failure
    if (userId) {
      const task = get().tasks.find(t => t.id === taskId);
      if (task) {
        persistToDB(
          () => db.upsertTask(userId, task),
          'Failed to update task'
        ).then(success => {
          if (!success) {
            set({ tasks: prevTasks });
          }
        });
      }
    }
  },

  updateTask: (taskId, updates) => {
    const userId = get().userId;
    const prevTasks = get().tasks;

    set((s) => ({
      tasks: s.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
    }));

    // Persist to Supabase — rollback on failure
    if (userId) {
      const task = get().tasks.find(t => t.id === taskId);
      if (task) {
        persistToDB(
          () => db.upsertTask(userId, task),
          'Failed to update task'
        ).then(success => {
          if (!success) {
            set({ tasks: prevTasks });
          }
        });
      }
    }
  },

  deleteTask: (taskId) => {
    const userId = get().userId;
    const prevTasks = get().tasks;

    set((s) => ({
      tasks: s.tasks.filter(t => t.id !== taskId),
    }));

    // Persist to Supabase — rollback on failure
    if (userId) {
      persistToDB(
        () => db.deleteTaskFromDB(userId, taskId),
        'Failed to delete task'
      ).then(success => {
        if (!success) {
          set({ tasks: prevTasks });
        }
      });
    }
  },

  moveTask: (taskId, status) => {
    const userId = get().userId;
    const prevTasks = get().tasks;

    set((s) => ({
      tasks: s.tasks.map(t => {
        if (t.id !== taskId) return t;
        const isCompleted = status === 'done';
        return {
          ...t,
          status,
          isCompleted,
          completedAt: isCompleted ? (t.completedAt || new Date().toISOString()) : undefined,
        };
      }),
    }));

    // Persist to Supabase — rollback on failure
    if (userId) {
      const task = get().tasks.find(t => t.id === taskId);
      if (task) {
        persistToDB(
          () => db.upsertTask(userId, task),
          'Failed to update task'
        ).then(success => {
          if (!success) {
            set({ tasks: prevTasks });
          }
        });
      }
    }
  },

  getTasksForList: (listId) => {
    const hiddenListIds = useUIStore.getState().hiddenListIds;
    if (listId === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      return get().tasks.filter(t => t.dueDate === todayStr && !t.isCompleted && !hiddenListIds.includes(t.listId));
    }
    if (listId === 'upcoming') {
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 86400000);
      return get().tasks.filter(t => t.dueDate && new Date(t.dueDate) <= weekLater && !t.isCompleted && !hiddenListIds.includes(t.listId));
    }
    if (listId === 'completed') {
      return get().tasks.filter(t => t.isCompleted && !hiddenListIds.includes(t.listId));
    }
    return get().tasks.filter(t => t.listId === listId);
  },

  getTasksByStatus: (listId) => {
    const tasks = get().getTasksForList(listId);
    return {
      todo: tasks.filter(t => t.status === 'todo' && !t.isCompleted),
      in_progress: tasks.filter(t => t.status === 'in_progress' && !t.isCompleted),
      review: tasks.filter(t => t.status === 'review' && !t.isCompleted),
      done: tasks.filter(t => t.isCompleted || t.status === 'done'),
    };
  },
}));
