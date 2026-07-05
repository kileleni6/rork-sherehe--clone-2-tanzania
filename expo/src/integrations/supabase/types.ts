// AUTO-GENERATED — DO NOT EDIT
// Run migrations to regenerate.

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      events: {
        Row: {
          check_in_enabled: boolean
          cover: string
          created_at: string
          custom_label: string | null
          date: string
          dress_code: string | null
          host_name: string
          id: string
          invited: number
          is_private: boolean
          message: string
          name: string
          passcode: string | null
          premium: boolean
          privacy: string
          reveal_at: string
          reveal_mode: string
          schedule: Json
          shots_per_guest: number
          template: string
          time_of_day: string | null
          type: string
          updated_at: string
          upload_permission: string
          user_id: string
          venue: string
          views: number
          visibility: string
        }
        Insert: {
          check_in_enabled?: boolean
          cover?: string
          created_at?: string
          custom_label?: string | null
          date: string
          dress_code?: string | null
          host_name?: string
          id?: string
          invited?: number
          is_private?: boolean
          message?: string
          name: string
          passcode?: string | null
          premium?: boolean
          privacy?: string
          reveal_at?: string
          reveal_mode?: string
          schedule?: Json
          shots_per_guest?: number
          template?: string
          time_of_day?: string | null
          type?: string
          updated_at?: string
          upload_permission?: string
          user_id: string
          venue?: string
          views?: number
          visibility?: string
        }
        Update: {
          check_in_enabled?: boolean
          cover?: string
          created_at?: string
          custom_label?: string | null
          date?: string
          dress_code?: string | null
          host_name?: string
          id?: string
          invited?: number
          is_private?: boolean
          message?: string
          name?: string
          passcode?: string | null
          premium?: boolean
          privacy?: string
          reveal_at?: string
          reveal_mode?: string
          schedule?: Json
          shots_per_guest?: number
          template?: string
          time_of_day?: string | null
          type?: string
          updated_at?: string
          upload_permission?: string
          user_id?: string
          venue?: string
          views?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string
          event_id: string
          expired: boolean
          expires_at: string | null
          filter: string | null
          flagged: boolean
          guest_name: string
          id: string
          storage_path: string | null
          style: string | null
          taken_at: string
          uploaded_at: string | null
          uri: string
        }
        Insert: {
          created_at?: string
          event_id: string
          expired?: boolean
          expires_at?: string | null
          filter?: string | null
          flagged?: boolean
          guest_name?: string
          id?: string
          storage_path?: string | null
          style?: string | null
          taken_at?: string
          uploaded_at?: string | null
          uri: string
        }
        Update: {
          created_at?: string
          event_id?: string
          expired?: boolean
          expires_at?: string | null
          filter?: string | null
          flagged?: boolean
          guest_name?: string
          id?: string
          storage_path?: string | null
          style?: string | null
          taken_at?: string
          uploaded_at?: string | null
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rsvps: {
        Row: {
          checked_in_at: string | null
          created_at: string
          event_id: string
          guests: number
          id: string
          name: string
          note: string | null
          pass_code: string
          rejection_reason: string | null
          shots_used: number
          status: string
          user_id: string | null
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          event_id: string
          guests?: number
          id?: string
          name?: string
          note?: string | null
          pass_code: string
          rejection_reason?: string | null
          shots_used?: number
          status?: string
          user_id?: string | null
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          event_id?: string
          guests?: number
          id?: string
          name?: string
          note?: string | null
          pass_code?: string
          rejection_reason?: string | null
          shots_used?: number
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      sherehe_mark_photos_expired: { Args: never; Returns: string[] }
      sherehe_purge_expired_event_photos: {
        Args: never
        Returns: {
          name: string
          purged_at: string
        }[]
      }
      user_id: { Args: never; Returns: string }
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
