import { create } from 'zustand';
import type { Task, TaskList, Workspace, Section, KanbanColumn, Priority, TaskStatus } from '@/types/task';
import * as db from '@/lib/database';

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
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'sortOrder' | 'subtasks' | 'labels' | 'isCompleted' | 'source'> & { title: string; listId: string; priority?: Priority; status?: TaskStatus }) => void;
  addClassroomTask: (task: Task) => void;
  addList: (list: TaskList) => void;
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
  lists: defaultLists,
  tasks: defaultTasks,
  sections: [],
  columns: defaultColumns,
  userId: null,
  isLoaded: false,

  loadUserData: async (userId: string) => {
    try {
      const [lists, tasks] = await Promise.all([
        db.fetchUserLists(userId),
        db.fetchUserTasks(userId),
      ]);
      set({
        lists: lists.length > 0 ? lists : defaultLists,
        tasks,
        userId,
        isLoaded: true,
      });
    } catch (err) {
      console.error('Failed to load user data:', err);
      set({ userId, isLoaded: true });
    }
  },

  clearUserData: () => {
    set({
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
      db.deleteTask(userId, taskId).catch(err => console.error('Failed to delete task:', err));
    }
  },

  moveTask: (taskId, status) => {
    const userId = get().userId;
    set((s) => ({
      tasks: s.tasks.map(t => t.id === taskId ? { ...t, status } : t),
    }));

    // Persist to Supabase
    if (userId) {
      const task = get().tasks.find(t => t.id === taskId);
      if (task) db.upsertTask(userId, task).catch(err => console.error('Failed to update task:', err));
    }
  },

  getTasksForList: (listId) => {
    if (listId === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      return get().tasks.filter(t => t.dueDate === todayStr && !t.isCompleted);
    }
    if (listId === 'upcoming') {
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 86400000);
      return get().tasks.filter(t => t.dueDate && new Date(t.dueDate) <= weekLater && !t.isCompleted);
    }
    if (listId === 'completed') {
      return get().tasks.filter(t => t.isCompleted);
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
