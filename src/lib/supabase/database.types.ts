export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      ai_usage_logs: {
        Row: {
          cost_estimate: number | null;
          created_at: string;
          error_message: string | null;
          feature: string;
          id: string;
          metadata: Json | null;
          model: string | null;
          provider: string;
          success: boolean;
          tokens_input: number | null;
          tokens_output: number | null;
          user_id: string | null;
        };
        Insert: {
          cost_estimate?: number | null;
          created_at?: string;
          error_message?: string | null;
          feature: string;
          id?: string;
          metadata?: Json | null;
          model?: string | null;
          provider?: string;
          success?: boolean;
          tokens_input?: number | null;
          tokens_output?: number | null;
          user_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["ai_usage_logs"]["Insert"]>;
        Relationships: [];
      };
      attempts: {
        Row: {
          created_at: string;
          id: string;
          is_correct: boolean | null;
          metadata: Json | null;
          question_id: string;
          response_time_ms: number | null;
          selected_answer_index: number | null;
          submitted_at: string;
          time_taken_seconds: number | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_correct?: boolean | null;
          metadata?: Json | null;
          question_id: string;
          response_time_ms?: number | null;
          selected_answer_index?: number | null;
          submitted_at?: string;
          time_taken_seconds?: number | null;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["attempts"]["Insert"]>;
        Relationships: [];
      };
      badges: {
        Row: {
          category: string;
          created_at: string;
          created_by: string | null;
          description: string;
          icon: string | null;
          id: string;
          is_published: boolean;
          name: string;
          requirement: string | null;
          updated_at: string;
          xp_reward: number;
        };
        Insert: {
          category: string;
          created_at?: string;
          created_by?: string | null;
          description: string;
          icon?: string | null;
          id?: string;
          is_published?: boolean;
          name: string;
          requirement?: string | null;
          updated_at?: string;
          xp_reward?: number;
        };
        Update: Partial<Database["public"]["Tables"]["badges"]["Insert"]>;
        Relationships: [];
      };
      concepts: {
        Row: {
          created_at: string;
          description: string | null;
          english_explanation: string | null;
          exam_type: string;
          french_example: string | null;
          id: string;
          is_published: boolean;
          level: string | null;
          source_import_id: string | null;
          tags: string[];
          title: string;
          topic: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          english_explanation?: string | null;
          exam_type?: string;
          french_example?: string | null;
          id?: string;
          is_published?: boolean;
          level?: string | null;
          source_import_id?: string | null;
          tags?: string[];
          title: string;
          topic?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["concepts"]["Insert"]>;
        Relationships: [];
      };
      daily_tasks: {
        Row: {
          cefr_level: string;
          content_ref_id: string | null;
          content_ref_type: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          estimated_minutes: number;
          exam_type: string;
          icon: string | null;
          id: string;
          is_published: boolean;
          skill_type: string;
          target_count: number;
          task_type: string | null;
          title: string;
          updated_at: string;
          xp_reward: number;
        };
        Insert: {
          cefr_level?: string;
          content_ref_id?: string | null;
          content_ref_type?: string | null;
          created_at?: string;
          created_by?: string | null;
          description: string;
          estimated_minutes?: number;
          exam_type?: string;
          icon?: string | null;
          id?: string;
          is_published?: boolean;
          skill_type: string;
          target_count?: number;
          task_type?: string | null;
          title: string;
          updated_at?: string;
          xp_reward?: number;
        };
        Update: Partial<Database["public"]["Tables"]["daily_tasks"]["Insert"]>;
        Relationships: [];
      };
      daily_vocab_generations: {
        Row: {
          completed_at: string | null;
          created_at: string;
          error_message: string | null;
          failed_count: number;
          generation_date: string;
          id: string;
          inserted_count: number;
          model_used: string | null;
          requested_count: number;
          skipped_duplicate_count: number;
          status: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          error_message?: string | null;
          failed_count?: number;
          generation_date: string;
          id?: string;
          inserted_count?: number;
          model_used?: string | null;
          requested_count?: number;
          skipped_duplicate_count?: number;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_vocab_generations"]["Insert"]>;
        Relationships: [];
      };
      generated_exercises: {
        Row: {
          cefr_level: string | null;
          content_json: Json;
          created_at: string;
          exam_type: string;
          exercise_type: string;
          id: string;
          is_published: boolean;
          source_import_id: string | null;
          tags: string[];
          title: string | null;
          topic: string | null;
          updated_at: string;
        };
        Insert: {
          cefr_level?: string | null;
          content_json?: Json;
          created_at?: string;
          exam_type?: string;
          exercise_type: string;
          id?: string;
          is_published?: boolean;
          source_import_id?: string | null;
          tags?: string[];
          title?: string | null;
          topic?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["generated_exercises"]["Insert"]>;
        Relationships: [];
      };
      pdf_import_batches: {
        Row: {
          completed_at: string | null;
          created_at: string;
          error_message: string | null;
          file_name: string;
          id: string;
          model_used: string | null;
          status: string;
          storage_path: string | null;
          total_chunks: number;
          total_pages: number;
          uploaded_by: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          error_message?: string | null;
          file_name: string;
          id?: string;
          model_used?: string | null;
          status?: string;
          storage_path?: string | null;
          total_chunks?: number;
          total_pages?: number;
          uploaded_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["pdf_import_batches"]["Insert"]>;
        Relationships: [];
      };
      pdf_import_chunks: {
        Row: {
          ai_result_json: Json | null;
          ai_status: string;
          batch_id: string;
          chunk_index: number;
          created_at: string;
          id: string;
          page_end: number | null;
          page_start: number | null;
          processed_at: string | null;
          raw_text: string;
        };
        Insert: {
          ai_result_json?: Json | null;
          ai_status?: string;
          batch_id: string;
          chunk_index: number;
          created_at?: string;
          id?: string;
          page_end?: number | null;
          page_start?: number | null;
          processed_at?: string | null;
          raw_text: string;
        };
        Update: Partial<Database["public"]["Tables"]["pdf_import_chunks"]["Insert"]>;
        Relationships: [];
      };
      pdf_import_items: {
        Row: {
          batch_id: string;
          chunk_id: string | null;
          confidence: number;
          content_json: Json;
          created_at: string;
          id: string;
          item_type: string;
          status: string;
          suggested_destination: string | null;
          title: string | null;
        };
        Insert: {
          batch_id: string;
          chunk_id?: string | null;
          confidence?: number;
          content_json?: Json;
          created_at?: string;
          id?: string;
          item_type: string;
          status?: string;
          suggested_destination?: string | null;
          title?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["pdf_import_items"]["Insert"]>;
        Relationships: [];
      };
      processing_jobs: {
        Row: {
          completed_at: string | null;
          created_at: string;
          current_step: string | null;
          error_message: string | null;
          id: string;
          input_json: Json;
          job_type: string;
          progress: number;
          result_json: Json | null;
          started_at: string | null;
          status: string;
          total_steps: number | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          current_step?: string | null;
          error_message?: string | null;
          id?: string;
          input_json?: Json;
          job_type: string;
          progress?: number;
          result_json?: Json | null;
          started_at?: string | null;
          status?: string;
          total_steps?: number | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["processing_jobs"]["Insert"]>;
        Relationships: [];
      };
      flashcard_reviews: {
        Row: {
          id: string;
          new_status: string | null;
          previous_status: string | null;
          rating: string;
          reviewed_at: string;
          session_id: string | null;
          user_id: string;
          vocabulary_id: string;
          xp_earned: number;
        };
        Insert: {
          id?: string;
          new_status?: string | null;
          previous_status?: string | null;
          rating: string;
          reviewed_at?: string;
          session_id?: string | null;
          user_id: string;
          vocabulary_id: string;
          xp_earned?: number;
        };
        Update: Partial<Database["public"]["Tables"]["flashcard_reviews"]["Insert"]>;
        Relationships: [];
      };
      flashcard_sessions: {
        Row: {
          cards_reviewed: number;
          completed_at: string | null;
          deck_type: string;
          id: string;
          mastered_count: number;
          started_at: string;
          user_id: string;
          weak_count: number;
          xp_earned: number;
        };
        Insert: {
          cards_reviewed?: number;
          completed_at?: string | null;
          deck_type: string;
          id?: string;
          mastered_count?: number;
          started_at?: string;
          user_id: string;
          weak_count?: number;
          xp_earned?: number;
        };
        Update: Partial<Database["public"]["Tables"]["flashcard_sessions"]["Insert"]>;
        Relationships: [];
      };
      mock_test_results: {
        Row: {
          cefr_estimate: string | null;
          completed_at: string;
          created_at: string;
          id: string;
          mock_test_id: string;
          overall_score: number | null;
          repair_plan: Json | null;
          skill_breakdown: Json | null;
          user_id: string;
        };
        Insert: {
          cefr_estimate?: string | null;
          completed_at?: string;
          created_at?: string;
          id?: string;
          mock_test_id: string;
          overall_score?: number | null;
          repair_plan?: Json | null;
          skill_breakdown?: Json | null;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["mock_test_results"]["Insert"]>;
        Relationships: [];
      };
      mock_test_sections: {
        Row: {
          created_at: string;
          duration_minutes: number;
          id: string;
          metadata: Json | null;
          mock_test_id: string;
          question_count: number;
          skill_type: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          duration_minutes: number;
          id?: string;
          metadata?: Json | null;
          mock_test_id: string;
          question_count: number;
          skill_type: string;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["mock_test_sections"]["Insert"]>;
        Relationships: [];
      };
      mock_tests: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          exam_type: string;
          id: string;
          is_published: boolean;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          exam_type: string;
          id?: string;
          is_published?: boolean;
          title: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mock_tests"]["Insert"]>;
        Relationships: [];
      };
      passages: {
        Row: {
          audio_url: string | null;
          audio_voice: string | null;
          audio_duration_seconds: number | null;
          audio_source: string | null;
          accent: string | null;
          content: string;
          created_at: string;
          created_by: string | null;
          cefr_level: string;
          estimated_minutes: number | null;
          exam_type: string;
          highlighted_vocabulary: string[] | null;
          id: string;
          is_published: boolean;
          skill: string | null;
          speed: string | null;
          title: string;
          topic: string | null;
          transcript: string | null;
          type: string;
          updated_at: string;
          word_count: number | null;
        };
        Insert: {
          audio_url?: string | null;
          audio_voice?: string | null;
          audio_duration_seconds?: number | null;
          audio_source?: string | null;
          accent?: string | null;
          content: string;
          created_at?: string;
          created_by?: string | null;
          cefr_level: string;
          estimated_minutes?: number | null;
          exam_type?: string;
          highlighted_vocabulary?: string[] | null;
          id?: string;
          is_published?: boolean;
          skill?: string | null;
          speed?: string | null;
          title: string;
          topic?: string | null;
          transcript?: string | null;
          type?: string;
          updated_at?: string;
          word_count?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["passages"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          current_level_self_assessment: string | null;
          current_streak: number;
          email: string | null;
          exam_date: string | null;
          full_name: string | null;
          id: string;
          longest_streak: number;
          onboarding_completed: boolean;
          role: string;
          target_exam: string | null;
          target_level: string | null;
          total_xp: number;
          updated_at: string;
          weakest_skill: string | null;
          daily_time_minutes: number | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          current_level_self_assessment?: string | null;
          current_streak?: number;
          email?: string | null;
          exam_date?: string | null;
          full_name?: string | null;
          id: string;
          longest_streak?: number;
          onboarding_completed?: boolean;
          role?: string;
          target_exam?: string | null;
          target_level?: string | null;
          total_xp?: number;
          updated_at?: string;
          weakest_skill?: string | null;
          daily_time_minutes?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      questions: {
        Row: {
          audio_url: string | null;
          correct_answer_index: number;
          created_at: string;
          created_by: string | null;
          cefr_level: string;
          difficulty: string;
          exam_type: string;
          explanation: string | null;
          id: string;
          is_published: boolean;
          metadata: Json | null;
          options: Json;
          passage_id: string | null;
          question_text: string;
          skill_type: string;
          tags: string[] | null;
          topic: string | null;
          transcript: string | null;
          trap_type: string | null;
          updated_at: string;
        };
        Insert: {
          audio_url?: string | null;
          correct_answer_index: number;
          created_at?: string;
          created_by?: string | null;
          cefr_level: string;
          difficulty?: string;
          exam_type?: string;
          explanation?: string | null;
          id?: string;
          is_published?: boolean;
          metadata?: Json | null;
          options?: Json;
          passage_id?: string | null;
          question_text: string;
          skill_type: string;
          tags?: string[] | null;
          topic?: string | null;
          transcript?: string | null;
          trap_type?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["questions"]["Insert"]>;
        Relationships: [];
      };
      speaking_prompts: {
        Row: {
          cefr_level: string;
          created_at: string;
          created_by: string | null;
          criteria: Json | null;
          duration_seconds: number | null;
          exam_type: string;
          id: string;
          is_published: boolean;
          preparation_seconds: number | null;
          prompt: string;
          title: string;
          topic: string | null;
          type: string | null;
          updated_at: string;
        };
        Insert: {
          cefr_level: string;
          created_at?: string;
          created_by?: string | null;
          criteria?: Json | null;
          duration_seconds?: number | null;
          exam_type?: string;
          id?: string;
          is_published?: boolean;
          preparation_seconds?: number | null;
          prompt: string;
          title: string;
          topic?: string | null;
          type?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["speaking_prompts"]["Insert"]>;
        Relationships: [];
      };
      speaking_submissions: {
        Row: {
          audio_path: string;
          created_at: string;
          estimated_cefr: string | null;
          id: string;
          prompt_id: string;
          review_result: Json | null;
          score_20: number | null;
          status: string;
          transcript: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          audio_path: string;
          created_at?: string;
          estimated_cefr?: string | null;
          id?: string;
          prompt_id: string;
          review_result?: Json | null;
          score_20?: number | null;
          status?: string;
          transcript?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["speaking_submissions"]["Insert"]>;
        Relationships: [];
      };
      user_badges: {
        Row: {
          badge_id: string;
          created_at: string;
          earned_at: string | null;
          id: string;
          progress: number;
          user_id: string;
        };
        Insert: {
          badge_id: string;
          created_at?: string;
          earned_at?: string | null;
          id?: string;
          progress?: number;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_badges"]["Insert"]>;
        Relationships: [];
      };
      user_progress_snapshots: {
        Row: {
          cefr_estimate: string | null;
          created_at: string;
          id: string;
          listening_score: number | null;
          overall_readiness: number | null;
          reading_score: number | null;
          snapshot_date: string;
          speaking_score: number | null;
          user_id: string;
          vocabulary_score: number | null;
          writing_score: number | null;
        };
        Insert: {
          cefr_estimate?: string | null;
          created_at?: string;
          id?: string;
          listening_score?: number | null;
          overall_readiness?: number | null;
          reading_score?: number | null;
          snapshot_date?: string;
          speaking_score?: number | null;
          user_id: string;
          vocabulary_score?: number | null;
          writing_score?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["user_progress_snapshots"]["Insert"]>;
        Relationships: [];
      };
      user_progress_summary: {
        Row: {
          b2_readiness_score: number;
          current_streak: number;
          listening_accuracy: number;
          reading_accuracy: number;
          speaking_avg_score: number | null;
          total_xp: number;
          updated_at: string;
          user_id: string;
          vocabulary_mastery_pct: number;
          weak_trap_types: Json;
          writing_avg_score: number | null;
        };
        Insert: {
          b2_readiness_score?: number;
          current_streak?: number;
          listening_accuracy?: number;
          reading_accuracy?: number;
          speaking_avg_score?: number | null;
          total_xp?: number;
          updated_at?: string;
          user_id: string;
          vocabulary_mastery_pct?: number;
          weak_trap_types?: Json;
          writing_avg_score?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["user_progress_summary"]["Insert"]>;
        Relationships: [];
      };
      user_word_bank: {
        Row: {
          correct_count: number;
          created_at: string;
          ease_score: number;
          id: string;
          last_reviewed_at: string | null;
          mistake_count: number;
          next_review_at: string | null;
          review_count: number;
          status: string;
          updated_at: string;
          user_id: string;
          vocabulary_id: string;
        };
        Insert: {
          correct_count?: number;
          created_at?: string;
          ease_score?: number;
          id?: string;
          last_reviewed_at?: string | null;
          mistake_count?: number;
          next_review_at?: string | null;
          review_count?: number;
          status?: string;
          updated_at?: string;
          user_id: string;
          vocabulary_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_word_bank"]["Insert"]>;
        Relationships: [];
      };
      vocabulary: {
        Row: {
          cefr_level: string;
          created_at: string;
          created_by: string | null;
          english_example_translation: string | null;
          english_meaning: string;
          exam_type: string;
          french_example: string | null;
          french_word: string;
          frequency_score: number;
          id: string;
          import_confidence: number | null;
          is_published: boolean;
          source_import_id: string | null;
          tags: string[] | null;
          topic: string | null;
          updated_at: string;
        };
        Insert: {
          cefr_level: string;
          created_at?: string;
          created_by?: string | null;
          english_example_translation?: string | null;
          english_meaning: string;
          exam_type?: string;
          french_example?: string | null;
          french_word: string;
          frequency_score?: number;
          id?: string;
          import_confidence?: number | null;
          is_published?: boolean;
          source_import_id?: string | null;
          tags?: string[] | null;
          topic?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vocabulary"]["Insert"]>;
        Relationships: [];
      };
      weakness_quests: {
        Row: {
          cefr_level: string;
          content_ref_id: string | null;
          content_ref_type: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          difficulty: string;
          exam_type: string;
          id: string;
          is_published: boolean;
          questions_count: number;
          skill_type: string;
          target_count: number;
          title: string;
          trap_type: string | null;
          updated_at: string;
          xp_reward: number;
        };
        Insert: {
          cefr_level?: string;
          content_ref_id?: string | null;
          content_ref_type?: string | null;
          created_at?: string;
          created_by?: string | null;
          description: string;
          difficulty?: string;
          exam_type?: string;
          id?: string;
          is_published?: boolean;
          questions_count?: number;
          skill_type: string;
          target_count?: number;
          title: string;
          trap_type?: string | null;
          updated_at?: string;
          xp_reward?: number;
        };
        Update: Partial<Database["public"]["Tables"]["weakness_quests"]["Insert"]>;
        Relationships: [];
      };
      writing_prompts: {
        Row: {
          cefr_level: string;
          created_at: string;
          created_by: string | null;
          criteria: Json | null;
          exam_type: string;
          id: string;
          is_published: boolean;
          prompt: string;
          sample_response: string | null;
          title: string;
          topic: string | null;
          type: string | null;
          updated_at: string;
          word_limit_max: number | null;
          word_limit_min: number | null;
        };
        Insert: {
          cefr_level: string;
          created_at?: string;
          created_by?: string | null;
          criteria?: Json | null;
          exam_type?: string;
          id?: string;
          is_published?: boolean;
          prompt: string;
          sample_response?: string | null;
          title: string;
          topic?: string | null;
          type?: string | null;
          updated_at?: string;
          word_limit_max?: number | null;
          word_limit_min?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["writing_prompts"]["Insert"]>;
        Relationships: [];
      };
      writing_submissions: {
        Row: {
          created_at: string;
          estimated_cefr: string | null;
          id: string;
          prompt_id: string;
          review_result: Json | null;
          score_20: number | null;
          status: string;
          submitted_text: string;
          updated_at: string;
          user_id: string;
          word_count: number | null;
        };
        Insert: {
          created_at?: string;
          estimated_cefr?: string | null;
          id?: string;
          prompt_id: string;
          review_result?: Json | null;
          score_20?: number | null;
          status?: string;
          submitted_text: string;
          updated_at?: string;
          user_id: string;
          word_count?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["writing_submissions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}


