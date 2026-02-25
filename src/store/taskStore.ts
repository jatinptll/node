import { create } from 'zustand';
import type { Task, TaskList, Workspace, Section, KanbanColumn, Priority, TaskStatus } from '@/types/task';
import * as db from '@/lib/database';
import { useUIStore } from '@/store/uiStore';

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
    set((s) => ({ tasks: [task, ...s.tasks] }));

    // Persist to Supabase
    if (userId) {
      db.upsertTask(userId, task).catch(err => console.error('Failed to save task:', err));
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
      db.upsertTask(userId, task).catch(err => console.error('Failed to save classroom task:', err));
    }
  },

  addWorkspace: (workspace) => {
    const userId = get().userId;
    set((state) => ({ workspaces: [...state.workspaces, workspace] }));
    if (userId) {
      db.upsertWorkspace(userId, workspace, get().workspaces.length - 1).catch(err =>
        console.error('Failed to save workspace:', err)
      );
    }
  },
  updateWorkspace: (workspaceId, updates) => {
    const userId = get().userId;
    set((state) => ({
      workspaces: state.workspaces.map(w => w.id === workspaceId ? { ...w, ...updates } : w)
    }));
    if (userId) {
      const workspace = get().workspaces.find(w => w.id === workspaceId);
      if (workspace) {
        db.upsertWorkspace(userId, workspace).catch(err =>
          console.error('Failed to update workspace:', err)
        );
      }
    }
  },
  deleteWorkspace: (workspaceId) => {
    const userId = get().userId;
    const listsToDelete = get().lists.filter(l => l.workspaceId === workspaceId);
    set((state) => ({
      workspaces: state.workspaces.filter(w => w.id !== workspaceId),
      lists: state.lists.filter(l => l.workspaceId !== workspaceId),
      tasks: state.tasks.filter(t => !listsToDelete.some(l => l.id === t.listId)),
    }));
    if (userId) {
      // Delete workspace, its lists, and tasks from DB
      db.deleteWorkspaceFromDB(userId, workspaceId).catch(err =>
        console.error('Failed to delete workspace:', err)
      );
      for (const list of listsToDelete) {
        db.deleteList(userId, list.id).catch(err =>
          console.error('Failed to delete list:', err)
        );
      }
    }
  },

  addList: (list) => {
    const userId = get().userId;
    set((s) => {
      if (s.lists.some((l) => l.id === list.id)) return s;
      return { lists: [...s.lists, list] };
    });

    // Persist to Supabase
    if (userId) {
      db.upsertList(userId, list).catch(err => console.error('Failed to save list:', err));
    }
  },

  updateList: (listId, updates) => {
    const userId = get().userId;
    set((s) => ({
      lists: s.lists.map(l => l.id === listId ? { ...l, ...updates } : l),
    }));

    // Persist to Supabase
    if (userId) {
      const list = get().lists.find(l => l.id === listId);
      if (list) db.upsertList(userId, list).catch(err => console.error('Failed to update list:', err));
    }
  },

  deleteList: (listId) => {
    const userId = get().userId;
    set((s) => ({
      lists: s.lists.filter(l => l.id !== listId),
      tasks: s.tasks.filter(t => t.listId !== listId), // delete associated tasks
    }));

    // Persist to Supabase
    if (userId) {
      db.deleteList(userId, listId).catch(err => console.error('Failed to delete list:', err));
    }
  },

  toggleTask: (taskId) => {
    const userId = get().userId;
    set((s) => ({
      tasks: s.tasks.map(t => t.id === taskId ? {
        ...t,
        isCompleted: !t.isCompleted,
        completedAt: !t.isCompleted ? new Date().toISOString() : undefined,
        status: !t.isCompleted ? 'done' as TaskStatus : 'todo' as TaskStatus,
      } : t),
    }));

    // Persist to Supabase
    if (userId) {
      const task = get().tasks.find(t => t.id === taskId);
      if (task) db.upsertTask(userId, task).catch(err => console.error('Failed to update task:', err));
    }
  },

  updateTask: (taskId, updates) => {
    const userId = get().userId;
    set((s) => ({
      tasks: s.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
    }));

    // Persist to Supabase
    if (userId) {
      const task = get().tasks.find(t => t.id === taskId);
      if (task) db.upsertTask(userId, task).catch(err => console.error('Failed to update task:', err));
    }
  },

  deleteTask: (taskId) => {
    const userId = get().userId;
    set((s) => ({
      tasks: s.tasks.filter(t => t.id !== taskId),
    }));

    // Delete from Supabase
    if (userId) {
      db.deleteTaskFromDB(userId, taskId).catch(err => console.error('Failed to delete task:', err));
    }
  },

  moveTask: (taskId, status) => {
    const userId = get().userId;
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

    // Persist to Supabase
    if (userId) {
      const task = get().tasks.find(t => t.id === taskId);
      if (task) db.upsertTask(userId, task).catch(err => console.error('Failed to update task:', err));
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
