export interface AiAnalysisResult {
  [key: string]: any;
}

export type Priority = 'high' | 'medium' | 'low';

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_date: string;
  start_date: string | null;
  due_date: string | null;
  priority: Priority;
  category: string[];
  completed: boolean;
  ai_summary: string | null;
}

export interface TodoInsert {
  [key: string]: any;
}
