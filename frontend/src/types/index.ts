export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  task_type: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  file_url: string;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkExperience {
  company: string;
  title: string;
  duration: string | null;
  highlights: string[] | null;
}

export interface SectionFeedback {
  section: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
}

export interface ResumeResult {
  id: string;
  task_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  skills: string[] | null;
  experience_years: number | null;
  raw_text: string | null;
  summary: string | null;
  education: string[] | null;
  work_experience: WorkExperience[] | null;
  overall_score: number | null;
  summary_verdict: string | null;
  section_feedback: SectionFeedback[] | null;
  suggestions: string[] | null;
  ats_tips: string[] | null;
  keywords_missing: string[] | null;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export interface ResumeContextType {
  tasks: Task[];
  results: Record<string, ResumeResult>;
  isUploading: boolean;
  isLoadingTasks: boolean;
  fetchTasks: () => Promise<void>;
  uploadResume: (file: File) => Promise<Task>;
  fetchResult: (taskId: string) => Promise<ResumeResult>;
  deleteTask: (taskId: string) => void;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

/** Pipeline stages for real-time visualization */
export type PipelineStage = 'uploading' | 'parsing' | 'embedding' | 'analysing' | 'completed' | 'failed';

export interface PipelineStatus {
  taskId: string;
  currentStage: PipelineStage;
  stages: {
    name: PipelineStage;
    label: string;
    status: 'pending' | 'active' | 'completed' | 'failed';
  }[];
}
