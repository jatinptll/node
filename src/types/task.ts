export type Priority = 'p1' | 'p2' | 'p3' | 'p4';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskSource = 'manual' | 'classroom';
export type ViewType = 'list' | 'kanban' | 'calendar' | 'matrix' | 'timeline';

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
}

export interface Task {
  id: string;
  listId: string;
  sectionId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  isUrgent?: boolean;
  isImportant?: boolean;
  dueDate?: string;
  startDate?: string;
  completedAt?: string;
  isCompleted: boolean;
  sortOrder: number;
  source: TaskSource;
  labels: Label[];
  subtasks: Subtask[];
  createdAt: string;
}

export interface Section {
  id: string;
  listId: string;
  name: string;
  sortOrder: number;
  isCollapsed: boolean;
}

export interface TaskList {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  icon?: string;
  sortOrder: number;
  isAcademic?: boolean;
  courseName?: string;
}

export interface Workspace {
  id: string;
  name: string;
  type: 'personal' | 'academic';
}

export interface KanbanColumn {
  id: string;
  listId: string;
  name: string;
  color: string;
  sortOrder: number;
}
