
export enum Priority {
  LOW = 'נמוכה',
  MEDIUM = 'בינונית',
  HIGH = 'גבוהה',
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean; // Kept for backward compatibility, synced with status
  status?: TaskStatus;  // New status field
  priority: Priority;
  subtasks: SubTask[];
  createdAt: number;
  estimatedTime?: string;
  notes?: string;       // New notes field
  dueDate?: number;     // New due date field (timestamp)
}

export interface AIAnalysisResult {
  subtasks: string[];
  priority: string;
  estimatedTime: string;
  refinedDescription: string;
}