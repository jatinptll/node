export type Priority = 'p1' | 'p2' | 'p3' | 'p4';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskSource = 'manual' | 'classroom';
export type ViewType = 'list' | 'kanban' | 'calendar' | 'matrix';
export type EnergyTag = 'deep_focus' | 'quick_win' | 'comms' | 'routine';
export type GoalTimeframe = 'weekly' | 'monthly' | 'quarterly';

export interface Goal {
  id: string;
  title: string;
  timeframe: GoalTimeframe;
  targetDate?: string;
  sortOrder: number;
}

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
  estimatedMinutes?: number;
  deferralCount?: number;
  energyTag?: EnergyTag;
  goalId?: string;
  classroomCourseworkId?: string;
  actualDurationMinutes?: number;
  focusSessionsCount?: number;
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
  classroomCourseId?: string;
}

export interface Workspace {
  id: string;
  name: string;
  type: 'personal' | 'academic' | 'work' | 'projects' | 'custom';
}

export interface KanbanColumn {
  id: string;
  listId: string;
  name: string;
  color: string;
  sortOrder: number;
}
