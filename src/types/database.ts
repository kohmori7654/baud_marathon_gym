// Database type definitions for Supabase
// Generated based on the migration schema


export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'examinee' | 'supporter' | 'admin';
export type TargetExamType = 'ENCOR' | 'ENARSI' | 'BOTH';
export type QuestionType = 'Single' | 'Multi' | 'DragDrop' | 'Simulation';
export type SessionStatus = 'in_progress' | 'completed' | 'interrupted';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  target_exam: TargetExamType | null;
  display_name: string | null;
  department?: string | null;
  passed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupporterAssignment {
  id: string;
  supporter_id: string;
  examinee_id: string;
  created_at: string;
}

export interface Question {
  id: string;
  exam_type: TargetExamType; // 'ENCOR' | 'ENARSI'
  domain: string;
  question_text: string;
  question_type: QuestionType; // 'Single' | 'Multi' | 'DragDrop' | 'Simulation'
  explanation?: string;
  image_base64?: string; // Legacy/Single image support
  question_images?: QuestionImage[]; // New support for multiple images
  simulation_target_json?: Record<string, unknown>; // JSON for simulation matching
  simulation_url?: string; // Custom URL for simulation iframe
  hash: string;
  display_id?: number; // Added: Sequential ID for display
  created_at?: string;
  updated_at?: string;
  is_important?: boolean;
}

export interface Option {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  sort_order: number;
  created_at: string;
}

export interface QuestionImage {
  id: string;
  question_id: string;
  image_data: string;
  sort_order: number;
  created_at: string;
}

export interface ExamSession {
  id: string;
  user_id: string;
  exam_type: TargetExamType;
  challenge_mode: string;
  domain_filter: string | null;
  question_type: QuestionType | null;
  total_questions: number;
  score: number;
  start_time: string;
  end_time: string | null;
  status: SessionStatus;
  created_at: string;
}

export interface SessionAnswer {
  id: string;
  session_id: string;
  question_id: string;
  user_id: string;
  answer_data: Record<string, unknown>;
  is_correct: boolean;
  answered_at: string;
}

// Extended types with relations
export interface QuestionWithImages extends Question {
  question_images: QuestionImage[];
}

export interface QuestionWrapper extends Question {
  options: Option[];
  question_images: QuestionImage[];
}

export interface QuestionWithOptions extends Question {
  options: Option[];
}

export interface ExamSessionWithAnswers extends ExamSession {
  session_answers: SessionAnswer[];
}

// Database schema type for Supabase client
export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          target_exam?: TargetExamType | null;
          display_name?: string | null;
        };
        Update: {
          email?: string;
          role?: UserRole;
          target_exam?: TargetExamType | null;
          display_name?: string | null;
        };
      };
      supporter_assignments: {
        Row: SupporterAssignment;
        Insert: {
          supporter_id: string;
          examinee_id: string;
        };
        Update: {
          supporter_id?: string;
          examinee_id?: string;
        };
      };
      questions: {
        Row: Question;
        Insert: {
          exam_type: TargetExamType;
          domain: string;
          question_text: string;
          question_type: QuestionType;
          hash: string;
          explanation?: string | null;
          image_base64?: string | null;
          simulation_target_json?: Record<string, unknown> | null;
          is_important?: boolean;
        };
        Update: {
          exam_type?: TargetExamType;
          domain?: string;
          question_text?: string;
          question_type?: QuestionType;
          hash?: string;
          explanation?: string | null;
          image_base64?: string | null;
          simulation_target_json?: Record<string, unknown> | null;
          is_important?: boolean;
        };
      };
      question_images: {
        Row: QuestionImage;
        Insert: {
          question_id: string;
          image_data: string;
          sort_order?: number;
        };
        Update: {
          question_id?: string;
          image_data?: string;
          sort_order?: number;
        };
      };
      options: {
        Row: Option;
        Insert: {
          question_id: string;
          text: string;
          is_correct?: boolean;
          sort_order?: number;
        };
        Update: {
          question_id?: string;
          text?: string;
          is_correct?: boolean;
          sort_order?: number;
        };
      };
      exam_sessions: {
        Row: ExamSession;
        Insert: {
          user_id: string;
          exam_type: TargetExamType;
          total_questions: number;
          challenge_mode?: string;
          domain_filter?: string | null;
          question_type?: QuestionType | null;
          score?: number;
          start_time?: string;
          end_time?: string | null;
          status?: SessionStatus;
        };
        Update: {
          user_id?: string;
          exam_type?: TargetExamType;
          total_questions?: number;
          challenge_mode?: string;
          domain_filter?: string | null;
          question_type?: QuestionType | null;
          score?: number;
          start_time?: string;
          end_time?: string | null;
          status?: SessionStatus;
        };
      };
      session_answers: {
        Row: SessionAnswer;
        Insert: {
          session_id: string;
          question_id: string;
          user_id: string;
          answer_data: Record<string, unknown>;
          is_correct: boolean;
          answered_at?: string;
        };
        Update: {
          session_id?: string;
          question_id?: string;
          user_id?: string;
          answer_data?: Record<string, unknown>;
          is_correct?: boolean;
          answered_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_student_analytics: {
        Args: {
          target_user_id: string
        }
        Returns: Json
      }
    };
    Enums: {
      user_role: UserRole;
      target_exam_type: TargetExamType;
      question_type: QuestionType;
      session_status: SessionStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
