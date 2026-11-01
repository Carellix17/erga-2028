export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          completion_tokens: number | null
          created_at: string
          duration_ms: number | null
          fn: string | null
          id: number
          model: string | null
          ok: boolean
          prompt_tokens: number | null
          provider: string | null
          status: number | null
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          duration_ms?: number | null
          fn?: string | null
          id?: never
          model?: string | null
          ok?: boolean
          prompt_tokens?: number | null
          provider?: string | null
          status?: number | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          duration_ms?: number | null
          fn?: string | null
          id?: never
          model?: string | null
          ok?: boolean
          prompt_tokens?: number | null
          provider?: string | null
          status?: number | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          context_id: string | null
          created_at: string
          id: string
          system_prompt: string | null
          title: string
          topic_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          created_at?: string
          id?: string
          system_prompt?: string | null
          title?: string
          topic_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          created_at?: string
          id?: string
          system_prompt?: string | null
          title?: string
          topic_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "study_contexts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      cognitive_profiles: {
        Row: {
          ans_score: number
          app_score: number
          created_at: string
          eta: number | null
          foc_score: number
          id: string
          istituto: string | null
          log_score: number
          mem_score: number
          nome: string | null
          updated_at: string
          user_id: string
          voc_score: number
        }
        Insert: {
          ans_score?: number
          app_score?: number
          created_at?: string
          eta?: number | null
          foc_score?: number
          id?: string
          istituto?: string | null
          log_score?: number
          mem_score?: number
          nome?: string | null
          updated_at?: string
          user_id: string
          voc_score?: number
        }
        Update: {
          ans_score?: number
          app_score?: number
          created_at?: string
          eta?: number | null
          foc_score?: number
          id?: string
          istituto?: string | null
          log_score?: number
          mem_score?: number
          nome?: string | null
          updated_at?: string
          user_id?: string
          voc_score?: number
        }
        Relationships: []
      }
      demo_rate_limits: {
        Row: {
          ip_hash: string
          request_count: number
          window_start: string
        }
        Insert: {
          ip_hash: string
          request_count?: number
          window_start?: string
        }
        Update: {
          ip_hash?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          created_at: string
          date: string
          description: string | null
          free_topic_title: string | null
          goal: number | null
          id: string
          is_completed: boolean
          subject_id: string | null
          title: string
          topic_id: string | null
          topic_type: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          free_topic_title?: string | null
          goal?: number | null
          id?: string
          is_completed?: boolean
          subject_id?: string | null
          title: string
          topic_id?: string | null
          topic_type?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          free_topic_title?: string | null
          goal?: number | null
          id?: string
          is_completed?: boolean
          subject_id?: string | null
          title?: string
          topic_id?: string | null
          topic_type?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "user_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "study_contexts"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_jobs: {
        Row: {
          context_id: string | null
          created_at: string
          error: string | null
          id: string
          lesson_ids: Json
          result: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          lesson_ids?: Json
          result?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          lesson_ids?: Json
          result?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          block_index: number
          device_id: string | null
          end_reason: string | null
          ended_at: string | null
          id: string
          paused_at: string | null
          pauses: Json
          phase: string
          phase_ends_at: string | null
          slot_id: string | null
          started_at: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          block_index?: number
          device_id?: string | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          paused_at?: string | null
          pauses?: Json
          phase?: string
          phase_ends_at?: string | null
          slot_id?: string | null
          started_at?: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          block_index?: number
          device_id?: string | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          paused_at?: string | null
          pauses?: Json
          phase?: string
          phase_ends_at?: string | null
          slot_id?: string | null
          started_at?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "study_events"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_figures: {
        Row: {
          bbox: Json
          context_id: string | null
          created_at: string
          description: string | null
          figure_index: number
          id: string
          lesson_id: string
          page_number: number
          storage_path: string
          user_id: string
        }
        Insert: {
          bbox?: Json
          context_id?: string | null
          created_at?: string
          description?: string | null
          figure_index?: number
          id?: string
          lesson_id: string
          page_number: number
          storage_path: string
          user_id: string
        }
        Update: {
          bbox?: Json
          context_id?: string | null
          created_at?: string
          description?: string | null
          figure_index?: number
          id?: string
          lesson_id?: string
          page_number?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_figures_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "study_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_figures_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "mini_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_lessons: Json
          context_id: string | null
          current_lesson_index: number
          final_test: Json | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_lessons?: Json
          context_id?: string | null
          current_lesson_index?: number
          final_test?: Json | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_lessons?: Json
          context_id?: string | null
          current_lesson_index?: number
          final_test?: Json | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_reading_logs: {
        Row: {
          active_seconds: number
          base_estimate_min: number
          completed_at: string
          context_id: string | null
          exercise_count: number
          id: string
          lesson_order: number
          slot_id: string | null
          subject: string | null
          subject_type: string | null
          user_id: string
          word_count: number
        }
        Insert: {
          active_seconds: number
          base_estimate_min: number
          completed_at?: string
          context_id?: string | null
          exercise_count?: number
          id?: string
          lesson_order: number
          slot_id?: string | null
          subject?: string | null
          subject_type?: string | null
          user_id: string
          word_count: number
        }
        Update: {
          active_seconds?: number
          base_estimate_min?: number
          completed_at?: string
          context_id?: string | null
          exercise_count?: number
          id?: string
          lesson_order?: number
          slot_id?: string | null
          subject?: string | null
          subject_type?: string | null
          user_id?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_reading_logs_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "study_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_reading_logs_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "study_events"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_lessons: {
        Row: {
          concept: string
          context_id: string | null
          created_at: string
          example: string | null
          exercises: Json
          explanation: string
          id: string
          is_generated: boolean
          lesson_order: number
          page_end: number | null
          page_start: number | null
          title: string
          user_id: string
        }
        Insert: {
          concept: string
          context_id?: string | null
          created_at?: string
          example?: string | null
          exercises?: Json
          explanation: string
          id?: string
          is_generated?: boolean
          lesson_order?: number
          page_end?: number | null
          page_start?: number | null
          title: string
          user_id: string
        }
        Update: {
          concept?: string
          context_id?: string | null
          created_at?: string
          example?: string | null
          exercises?: Json
          explanation?: string
          id?: string
          is_generated?: boolean
          lesson_order?: number
          page_end?: number | null
          page_start?: number | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mini_lessons_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "study_contexts"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_changes: {
        Row: {
          applied_at: string | null
          changes: Json
          created_at: string
          id: string
          reason: string
          status: string
          undone_at: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          changes: Json
          created_at?: string
          id?: string
          reason: string
          status?: string
          undone_at?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          changes?: Json
          created_at?: string
          id?: string
          reason?: string
          status?: string
          undone_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      planner_events: {
        Row: {
          created_at: string
          id: number
          name: string
          props: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          props?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          props?: Json
          user_id?: string
        }
        Relationships: []
      }
      planner_settings: {
        Row: {
          ask_before_move: boolean
          daily_limit_free_min: number
          daily_limit_school_min: number
          lessons_per_block: number
          long_break_min: number
          max_block_min: number
          medium_break_min: number
          notify_types: Json
          short_break_min: number
          sound_enabled: boolean
          subject_types: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          ask_before_move?: boolean
          daily_limit_free_min?: number
          daily_limit_school_min?: number
          lessons_per_block?: number
          long_break_min?: number
          max_block_min?: number
          medium_break_min?: number
          notify_types?: Json
          short_break_min?: number
          sound_enabled?: boolean
          subject_types?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          ask_before_move?: boolean
          daily_limit_free_min?: number
          daily_limit_school_min?: number
          lessons_per_block?: number
          long_break_min?: number
          max_block_min?: number
          medium_break_min?: number
          notify_types?: Json
          short_break_min?: number
          sound_enabled?: boolean
          subject_types?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          context_id: string | null
          created_at: string
          details: Json
          id: string
          score: number
          title: string
          total: number
          user_id: string
        }
        Insert: {
          context_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          score: number
          title: string
          total: number
          user_id: string
        }
        Update: {
          context_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          score?: number
          title?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "study_contexts"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_pushes: {
        Row: {
          body: string
          cancelled_at: string | null
          created_at: string
          focus_session_id: string | null
          id: string
          kind: string
          send_at: string
          sent_at: string | null
          skip_reason: string | null
          tag: string | null
          title: string
          url: string
          user_id: string
        }
        Insert: {
          body: string
          cancelled_at?: string | null
          created_at?: string
          focus_session_id?: string | null
          id?: string
          kind: string
          send_at: string
          sent_at?: string | null
          skip_reason?: string | null
          tag?: string | null
          title: string
          url?: string
          user_id: string
        }
        Update: {
          body?: string
          cancelled_at?: string | null
          created_at?: string
          focus_session_id?: string | null
          id?: string
          kind?: string
          send_at?: string
          sent_at?: string | null
          skip_reason?: string | null
          tag?: string | null
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_pushes_focus_session_id_fkey"
            columns: ["focus_session_id"]
            isOneToOne: false
            referencedRelation: "focus_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_contexts: {
        Row: {
          content: string
          cover_image_url: string | null
          created_at: string
          error_message: string | null
          file_name: string
          file_path: string | null
          generation_error: string | null
          generation_progress: Json
          generation_started_at: string | null
          generation_status: string
          id: string
          is_demo: boolean
          module_titles: string[] | null
          new_material_pending: boolean
          path_version: number
          processing_status: string | null
          subject: string | null
          subject_family: string | null
          user_id: string
        }
        Insert: {
          content: string
          cover_image_url?: string | null
          created_at?: string
          error_message?: string | null
          file_name: string
          file_path?: string | null
          generation_error?: string | null
          generation_progress?: Json
          generation_started_at?: string | null
          generation_status?: string
          id?: string
          is_demo?: boolean
          module_titles?: string[] | null
          new_material_pending?: boolean
          path_version?: number
          processing_status?: string | null
          subject?: string | null
          subject_family?: string | null
          user_id: string
        }
        Update: {
          content?: string
          cover_image_url?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_path?: string | null
          generation_error?: string | null
          generation_progress?: Json
          generation_started_at?: string | null
          generation_status?: string
          id?: string
          is_demo?: boolean
          module_titles?: string[] | null
          new_material_pending?: boolean
          path_version?: number
          processing_status?: string | null
          subject?: string | null
          subject_family?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_events: {
        Row: {
          completed_at: string | null
          context_id: string | null
          created_at: string
          end_time: string | null
          evaluation_id: string | null
          event_date: string
          event_time: string | null
          event_type: string
          id: string
          is_completed: boolean
          lesson_from: number | null
          lesson_to: number | null
          locked: boolean
          move_count: number
          notes: string | null
          original_date: string | null
          original_time: string | null
          source: string
          status: string
          subject: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          completed_at?: string | null
          context_id?: string | null
          created_at?: string
          end_time?: string | null
          evaluation_id?: string | null
          event_date: string
          event_time?: string | null
          event_type: string
          id?: string
          is_completed?: boolean
          lesson_from?: number | null
          lesson_to?: number | null
          locked?: boolean
          move_count?: number
          notes?: string | null
          original_date?: string | null
          original_time?: string | null
          source?: string
          status?: string
          subject: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          completed_at?: string | null
          context_id?: string | null
          created_at?: string
          end_time?: string | null
          evaluation_id?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string
          id?: string
          is_completed?: boolean
          lesson_from?: number | null
          lesson_to?: number | null
          locked?: boolean
          move_count?: number
          notes?: string | null
          original_date?: string | null
          original_time?: string | null
          source?: string
          status?: string
          subject?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_events_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "study_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_events_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions_logs: {
        Row: {
          actual_duration: number
          completed_at: string
          created_at: string
          estimated_duration: number | null
          event_id: string | null
          id: string
          source_type: string
          subject_id: string | null
          subject_name: string | null
          task_label: string | null
          user_id: string
        }
        Insert: {
          actual_duration: number
          completed_at?: string
          created_at?: string
          estimated_duration?: number | null
          event_id?: string | null
          id?: string
          source_type: string
          subject_id?: string | null
          subject_name?: string | null
          task_label?: string | null
          user_id: string
        }
        Update: {
          actual_duration?: number
          completed_at?: string
          created_at?: string
          estimated_duration?: number | null
          event_id?: string | null
          id?: string
          source_type?: string
          subject_id?: string | null
          subject_name?: string | null
          task_label?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "study_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "user_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          created_at: string
          granted: boolean
          id: number
          policy_version: string
          purpose: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted: boolean
          id?: never
          policy_version: string
          purpose: string
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: never
          policy_version?: string
          purpose?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      user_data: {
        Row: {
          id: string
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          created_at: string
          first_name: string | null
          generation_count: number
          has_completed_onboarding: boolean
          id: string
          institute_type: string
          is_beta_tester: boolean
          last_name: string | null
          last_studio_context_id: string | null
          nickname: string | null
          school: string | null
          subject_goals: Json
          subject_levels: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          generation_count?: number
          has_completed_onboarding?: boolean
          id?: string
          institute_type?: string
          is_beta_tester?: boolean
          last_name?: string | null
          last_studio_context_id?: string | null
          nickname?: string | null
          school?: string | null
          subject_goals?: Json
          subject_levels?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          generation_count?: number
          has_completed_onboarding?: boolean
          id?: string
          institute_type?: string
          is_beta_tester?: boolean
          last_name?: string | null
          last_studio_context_id?: string | null
          nickname?: string | null
          school?: string | null
          subject_goals?: Json
          subject_levels?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_routines: {
        Row: {
          created_at: string
          days_of_week: number[]
          end_time: string
          id: string
          kind: string
          label: string | null
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[]
          end_time: string
          id?: string
          kind: string
          label?: string | null
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          end_time?: string
          id?: string
          kind?: string
          label?: string | null
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subjects: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_plan_changes: {
        Args: { p_changes: Json; p_reason: string; p_user_id: string }
        Returns: string
      }
      check_and_increment_demo_usage: {
        Args: { p_ip_hash: string; p_window?: string }
        Returns: number
      }
      claim_due_pushes: {
        Args: { p_limit?: number }
        Returns: {
          body: string
          cancelled_at: string | null
          created_at: string
          focus_session_id: string | null
          id: string
          kind: string
          send_at: string
          sent_at: string | null
          skip_reason: string | null
          tag: string | null
          title: string
          url: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "scheduled_pushes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_demo_rate_limits: { Args: never; Returns: undefined }
      has_active_subscription: {
        Args: { check_env?: string; user_text: string }
        Returns: boolean
      }
      is_demo_admin: { Args: { _user_id: string }; Returns: boolean }
      is_pro_user: {
        Args: { check_env?: string; user_text: string }
        Returns: boolean
      }
      purge_user_planner_data: {
        Args: { p_include_consents?: boolean; p_user_id: string }
        Returns: Json
      }
      user_is_pro: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
