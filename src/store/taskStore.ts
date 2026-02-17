import { create } from 'zustand';
import type { Task, TaskList, Workspace, Section, KanbanColumn, Priority, TaskStatus } from '@/types/task';

const SUBJECT_COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#8B5CF6'];

const defaultWorkspaces: Workspace[] = [
  { id: 'personal', name: 'Personal', type: 'personal' },
  { id: 'academic', name: 'Academics', type: 'academic' },
];

const defaultLists: TaskList[] = [
  { id: 'inbox', workspaceId: 'personal', name: 'Inbox', color: '#7C3AED', sortOrder: 0 },
  { id: 'projects', workspaceId: 'personal', name: 'Projects', color: '#3B82F6', sortOrder: 1 },
  { id: 'math', workspaceId: 'academic', name: 'Mathematics', color: '#3B82F6', sortOrder: 0, isAcademic: true, courseName: 'Mathematics 201' },
  { id: 'physics', workspaceId: 'academic', name: 'Physics', color: '#10B981', sortOrder: 1, isAcademic: true, courseName: 'Physics 301' },
  { id: 'cs', workspaceId: 'academic', name: 'Computer Science', color: '#F59E0B', sortOrder: 2, isAcademic: true, courseName: 'CS 401' },
];

const defaultColumns: KanbanColumn[] = [
  { id: 'col-todo', listId: 'inbox', name: 'To Do', color: '#94A3B8', sortOrder: 0 },
  { id: 'col-progress', listId: 'inbox', name: 'In Progress', color: '#3B82F6', sortOrder: 1 },
  { id: 'col-review', listId: 'inbox', name: 'Review', color: '#F59E0B', sortOrder: 2 },
  { id: 'col-done', listId: 'inbox', name: 'Done', color: '#10B981', sortOrder: 3 },
];

const now = new Date();
const today = now.toISOString().split('T')[0];
const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
const nextWeek = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

const defaultTasks: Task[] = [
  {
    id: 't1', listId: 'inbox', title: 'Review project architecture docs', description: 'Go through the architecture documents and leave feedback', status: 'todo', priority: 'p2', isCompleted: false, sortOrder: 0, source: 'manual', labels: [{ id: 'l1', name: 'Design', color: '#7C3AED' }], subtasks: [
      { id: 'st1', title: 'Read overview section', isCompleted: true, sortOrder: 0 },
      { id: 'st2', title: 'Review API design', isCompleted: false, sortOrder: 1 },
      { id: 'st3', title: 'Check database schema', isCompleted: false, sortOrder: 2 },
    ], dueDate: tomorrow, createdAt: now.toISOString(),
  },
  {
    id: 't2', listId: 'inbox', title: 'Fix authentication bug', status: 'in_progress', priority: 'p1', isCompleted: false, sortOrder: 1, source: 'manual', labels: [{ id: 'l2', name: 'Bug', color: '#EF4444' }], subtasks: [], dueDate: today, createdAt: now.toISOString(),
  },
  {
    id: 't3', listId: 'inbox', title: 'Update dependencies', status: 'todo', priority: 'p3', isCompleted: false, sortOrder: 2, source: 'manual', labels: [], subtasks: [], dueDate: nextWeek, createdAt: now.toISOString(),
  },
  {
    id: 't4', listId: 'inbox', title: 'Write unit tests for task module', status: 'review', priority: 'p2', isCompleted: false, sortOrder: 3, source: 'manual', labels: [{ id: 'l3', name: 'Testing', color: '#10B981' }], subtasks: [], createdAt: now.toISOString(),
  },
  {
    id: 't5', listId: 'inbox', title: 'Deploy staging environment', status: 'todo', priority: 'p4', isCompleted: false, sortOrder: 4, source: 'manual', labels: [], subtasks: [], createdAt: now.toISOString(),
  },
  {
    id: 't6', listId: 'math', title: 'Linear Algebra Assignment 3', description: 'Solve problems from Chapter 5', status: 'todo', priority: 'p1', isCompleted: false, sortOrder: 0, source: 'classroom', labels: [], subtasks: [
      { id: 'st4', title: 'Problems 1-5', isCompleted: true, sortOrder: 0 },
      { id: 'st5', title: 'Problems 6-10', isCompleted: false, sortOrder: 1 },
    ], dueDate: tomorrow, createdAt: now.toISOString(),
  },
  {
    id: 't7', listId: 'physics', title: 'Lab Report: Wave Mechanics', status: 'todo', priority: 'p2', isCompleted: false, sortOrder: 0, source: 'classroom', labels: [], subtasks: [], dueDate: nextWeek, createdAt: now.toISOString(),
  },
  {
    id: 't8', listId: 'cs', title: 'Implement Binary Search Tree', status: 'in_progress', priority: 'p2', isCompleted: false, sortOrder: 0, source: 'classroom', labels: [], subtasks: [], dueDate: yesterday, createdAt: now.toISOString(),
  },
  {
    id: 't9', listId: 'inbox', title: 'Set up CI/CD pipeline', status: 'done', priority: 'p3', isCompleted: true, completedAt: now.toISOString(), sortOrder: 5, source: 'manual', labels: [], subtasks: [], createdAt: now.toISOString(),
  },
  {
    id: 't10', listId: 'projects', title: 'Design landing page mockups', status: 'todo', priority: 'p2', isCompleted: false, sortOrder: 0, source: 'manual', labels: [{ id: 'l1', name: 'Design', color: '#7C3AED' }], subtasks: [], dueDate: nextWeek, createdAt: now.toISOString(),
  },
];

interface TaskStore {
  workspaces: Workspace[];
  lists: TaskList[];
  tasks: Task[];
  sections: Section[];
  columns: KanbanColumn[];

  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'sortOrder' | 'subtasks' | 'labels' | 'isCompleted' | 'source'> & { title: string; listId: string; priority?: Priority; status?: TaskStatus }) => void;
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

  addTask: (partial) => {
    const task: Task = {
      id: `t${nextId++}`,
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
  },

  toggleTask: (taskId) => set((s) => ({
    tasks: s.tasks.map(t => t.id === taskId ? {
      ...t,
      isCompleted: !t.isCompleted,
      completedAt: !t.isCompleted ? new Date().toISOString() : undefined,
      status: !t.isCompleted ? 'done' as TaskStatus : 'todo' as TaskStatus,
    } : t),
  })),

  updateTask: (taskId, updates) => set((s) => ({
    tasks: s.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
  })),

  deleteTask: (taskId) => set((s) => ({
    tasks: s.tasks.filter(t => t.id !== taskId),
  })),

  moveTask: (taskId, status) => set((s) => ({
    tasks: s.tasks.map(t => t.id === taskId ? { ...t, status } : t),
  })),

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
