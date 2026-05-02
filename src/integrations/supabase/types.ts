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
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          context_id: string | null
          current_lesson_index: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          current_lesson_index?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          current_lesson_index?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      study_contexts: {
        Row: {
          content: string
          created_at: string
          error_message: string | null
          file_name: string
          file_path: string | null
          id: string
          is_demo: boolean
          processing_status: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          error_message?: string | null
          file_name: string
          file_path?: string | null
          id?: string
          is_demo?: boolean
          processing_status?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_path?: string | null
          id?: string
          is_demo?: boolean
          processing_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_events: {
        Row: {
          created_at: string
          event_date: string
          event_time: string | null
          event_type: string
          id: string
          subject: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_time?: string | null
          event_type: string
          id?: string
          subject: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_time?: string | null
          event_type?: string
          id?: string
          subject?: string
          title?: string
          user_id?: string
        }
        Relationships: []
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
          id: string
          institute_type: string
          is_beta_tester: boolean
          last_name: string | null
          nickname: string | null
          school: string | null
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
          id?: string
          institute_type?: string
          is_beta_tester?: boolean
          last_name?: string | null
          nickname?: string | null
          school?: string | null
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
          id?: string
          institute_type?: string
          is_beta_tester?: boolean
          last_name?: string | null
          nickname?: string | null
          school?: string | null
          subject_levels?: Json
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
      has_active_subscription: {
        Args: { check_env?: string; user_text: string }
        Returns: boolean
      }
      is_demo_admin: { Args: { _user_id: string }; Returns: boolean }
      is_pro_user: {
        Args: { check_env?: string; user_text: string }
        Returns: boolean
      }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
