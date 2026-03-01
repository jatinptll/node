import { create } from 'zustand';
import type { Task, TaskList, Workspace, Priority, TaskStatus, Goal } from '@/types/task';
import * as db from '@/lib/database';
import { useUIStore } from '@/store/uiStore';
import { getLocalDateString } from '@/lib/utils';
import { toast } from 'sonner';

const defaultWorkspaces: Workspace[] = [
  { id: 'personal', name: 'Personal', type: 'personal' },
  { id: 'work', name: 'Work', type: 'work' },
  { id: 'projects', name: 'Projects', type: 'projects' },
];

// Default lists/tasks for unauthenticated users
const defaultLists: TaskList[] = [
  { id: 'inbox', workspaceId: 'personal', name: 'Inbox', color: '#7C3AED', sortOrder: 0 },
  { id: 'projects', workspaceId: 'personal', name: 'Projects', color: '#3B82F6', sortOrder: 1 },
];

const defaultTasks: Task[] = [];

// Shared promise queue to prevent race conditions during rapid updates (e.g. typing or toggling).
// This guarantees that earlier DB updates NEVER overwrite later ones if network latency fluctuates.
let dbSyncQueue = Promise.resolve();

/**
 * Helper: persist to Supabase sequentially and show a toast if it fails.
 * Returns true on success, false on failure.
 */
async function persistToDB(
  operation: () => Promise<void>,
  errorLabel: string
): Promise<boolean> {
  return new Promise((resolve) => {
    dbSyncQueue = dbSyncQueue.then(async () => {
      try {
        await operation();
        resolve(true);
      } catch (err) {
        console.error(`${errorLabel}:`, err);
        toast.error('Sync failed', {
          description: `${errorLabel}. Your change may not be saved. Try reloading.`,
        });
        resolve(false);
      }
    });
  });
}

interface TaskStore {
  workspaces: Workspace[];
  lists: TaskList[];
  tasks: Task[];
  goals: Goal[];
  userId: string | null;
  isLoaded: boolean;

  // Data loading
  loadUserData: (userId: string) => Promise<void>;
  clearUserData: () => void;
  loadOlderTasks: () => Promise<void>;

  olderTasksLoaded: boolean;

  // Task actions
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (workspaceId: string) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'sortOrder' | 'subtasks' | 'labels' | 'isCompleted' | 'source'> & { title: string; listId: string; priority?: Priority; status?: TaskStatus; estimatedMinutes?: number }) => void;
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

  // Goals
  addGoal: (goal: Goal) => void;
  updateGoal: (goalId: string, updates: Partial<Goal>) => void;
  deleteGoal: (goalId: string) => void;
}

let nextId = 100;

export const useTaskStore = create<TaskStore>((set, get) => ({
  workspaces: defaultWorkspaces,
  lists: [], // Start empty to prevent ghosting before DB loads
  tasks: defaultTasks,
  goals: [],
  userId: null,
  isLoaded: false,
  olderTasksLoaded: false,

  loadUserData: async (userId: string) => {
    try {
      const [workspaces, lists, tasks, goals] = await Promise.all([
        db.fetchUserWorkspaces(userId),
        db.fetchUserLists(userId),
        db.fetchUserTasks(userId),
        db.fetchUserGoals(userId),
      ]);

      const finalWorkspaces = workspaces.length > 0 ? workspaces : defaultWorkspaces;
      const finalLists = lists.length > 0 ? lists : defaultLists;

      set({
        workspaces: finalWorkspaces,
        lists: finalLists,
        tasks,
        goals,
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

  loadOlderTasks: async () => {
    const userId = get().userId;
    if (!userId || get().olderTasksLoaded) return;
    try {
      const olderTasks = await db.fetchOlderCompletedTasks(userId);
      set(s => {
        const existingIds = new Set(s.tasks.map(t => t.id));
        const newTasks = olderTasks.filter(t => !existingIds.has(t.id));
        return { tasks: [...s.tasks, ...newTasks], olderTasksLoaded: true };
      });
    } catch (err) {
      console.error('Failed to load older tasks:', err);
      toast.error('Could not load older completed tasks');
    }
  },

  clearUserData: () => {
    set({
      workspaces: defaultWorkspaces,
      lists: defaultLists,
      tasks: [],
      goals: [],
      userId: null,
      isLoaded: false,
      olderTasksLoaded: false,
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
      estimatedMinutes: partial.estimatedMinutes,
      deferralCount: 0,
      energyTag: undefined,
      goalId: partial.goalId,
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

    // Reset active view if the user was viewing a list inside the deleted workspace
    const currentListId = useUIStore.getState().selectedListId;
    if (listsToDelete.some(l => l.id === currentListId)) {
      useUIStore.getState().setSelectedListId('dashboard');
    }

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

    // Reset active view if the user was viewing the deleted list
    if (useUIStore.getState().selectedListId === listId) {
      useUIStore.getState().setSelectedListId('dashboard');
    }

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
    const existingTask = prevTasks.find(t => t.id === taskId);

    let finalUpdates = { ...updates };

    // Track deferrals: if moving due date to a later date
    if (updates.dueDate && existingTask && existingTask.dueDate) {
      if (new Date(updates.dueDate) > new Date(existingTask.dueDate)) {
        finalUpdates.deferralCount = (existingTask.deferralCount || 0) + 1;
      }
    }

    set((s) => ({
      tasks: s.tasks.map(t => t.id === taskId ? { ...t, ...finalUpdates } : t),
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
      const todayStr = getLocalDateString();
      return get().tasks.filter(t => t.dueDate === todayStr && !t.isCompleted && !hiddenListIds.includes(t.listId));
    }
    if (listId === 'upcoming') {
      const todayStr = getLocalDateString();
      const weekLaterStr = getLocalDateString(Date.now() + 7 * 86400000);
      return get().tasks.filter(t => t.dueDate && t.dueDate >= todayStr && t.dueDate <= weekLaterStr && !t.isCompleted && !hiddenListIds.includes(t.listId));
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

  addGoal: (goal) => {
    const userId = get().userId;
    set(s => ({ goals: [...s.goals, goal] }));
    if (userId) {
      persistToDB(() => db.upsertGoal(userId, goal), 'Failed to save goal').then(success => {
        if (!success) set(s => ({ goals: s.goals.filter(g => g.id !== goal.id) }));
      });
    }
  },

  updateGoal: (goalId, updates) => {
    const userId = get().userId;
    const prevGoals = get().goals;
    set(s => ({ goals: s.goals.map(g => g.id === goalId ? { ...g, ...updates } : g) }));
    if (userId) {
      const goal = get().goals.find(g => g.id === goalId);
      if (goal) {
        persistToDB(() => db.upsertGoal(userId, goal), 'Failed to update goal').then(success => {
          if (!success) set({ goals: prevGoals });
        });
      }
    }
  },

  deleteGoal: (goalId) => {
    const userId = get().userId;
    const prevGoals = get().goals;
    const prevTasks = get().tasks;
    set(s => ({
      goals: s.goals.filter(g => g.id !== goalId),
      tasks: s.tasks.map(t => t.goalId === goalId ? { ...t, goalId: undefined } : t)
    }));
    if (userId) {
      persistToDB(async () => {
        await db.deleteGoal(userId, goalId);
        // Optionally update any tasks that were assigned this goal, wait, the ON DELETE SET NULL on DB handles the actual relationships
        // but it doesn't hurt to update the state correctly in case of failure.
      }, 'Failed to delete goal').then(success => {
        if (!success) set({ goals: prevGoals, tasks: prevTasks });
      });
    }
  },
}));
