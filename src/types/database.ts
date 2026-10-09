export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string
          display_name: string
          full_name: string | null
          avatar_path: string | null
          timezone: string
          created_at: string
          updated_at: string
        },
        {
          id: string
          display_name: string
          full_name?: string | null
          avatar_path?: string | null
          timezone?: string
        },
        {
          display_name?: string
          full_name?: string | null
          avatar_path?: string | null
          timezone?: string
        }
      >
      user_preferences: Table<
        {
          user_id: string
          locale: string
          week_starts_on: number
          measurement_system: "metric" | "imperial"
          created_at: string
          updated_at: string
        },
        { user_id: string; locale?: string; week_starts_on?: number; measurement_system?: "metric" | "imperial" },
        { locale?: string; week_starts_on?: number; measurement_system?: "metric" | "imperial" }
      >
      categories: Table<
        {
          id: string
          user_id: string
          name: string
          color: string
          created_at: string
          updated_at: string
        },
        { id?: string; user_id: string; name: string; color?: string },
        { name?: string; color?: string }
      >
      routines: Table<
        {
          id: string
          user_id: string
          title: string
          notes: string | null
          category_id: string | null
          priority: "low" | "normal" | "high"
          is_optional: boolean
          days_of_week: number[]
          time_of_day: string | null
          completion_policy: "checklist" | "module_record"
          linked_module: string
          is_active: boolean
          starts_on: string
          ends_on: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          user_id: string
          title: string
          notes?: string | null
          category_id?: string | null
          priority?: "low" | "normal" | "high"
          is_optional?: boolean
          days_of_week: number[]
          time_of_day?: string | null
          completion_policy?: "checklist" | "module_record"
          linked_module?: string
          is_active?: boolean
          starts_on: string
          ends_on?: string | null
        },
        {
          title?: string
          notes?: string | null
          is_active?: boolean
          days_of_week?: number[]
          ends_on?: string | null
        }
      >
      tasks: Table<
        {
          id: string
          user_id: string
          routine_id: string | null
          title: string
          notes: string | null
          category_id: string | null
          priority: "low" | "normal" | "high"
          status: "pending" | "completed" | "skipped" | "rescheduled"
          is_optional: boolean
          scheduled_on: string
          time_of_day: string | null
          completed_at: string | null
          skipped_reason: string | null
          rescheduled_to: string | null
          completion_policy: "checklist" | "module_record"
          linked_module: string
          linked_record_id: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          user_id: string
          routine_id?: string | null
          title: string
          notes?: string | null
          category_id?: string | null
          priority?: "low" | "normal" | "high"
          status?: "pending" | "completed" | "skipped" | "rescheduled"
          is_optional?: boolean
          scheduled_on: string
          time_of_day?: string | null
          completed_at?: string | null
          skipped_reason?: string | null
          rescheduled_to?: string | null
          completion_policy?: "checklist" | "module_record"
          linked_module?: string
          linked_record_id?: string | null
        },
        {
          title?: string
          notes?: string | null
          status?: "pending" | "completed" | "skipped" | "rescheduled"
          skipped_reason?: string | null
          rescheduled_to?: string | null
          completed_at?: string | null
          scheduled_on?: string
          completion_policy?: "checklist" | "module_record"
          linked_module?: string
          linked_record_id?: string | null
        }
      >
      appointments: Table<
        {
          id: string
          user_id: string
          title: string
          notes: string | null
          location: string | null
          scheduled_on: string
          starts_at: string | null
          ends_at: string | null
          status: "scheduled" | "completed" | "cancelled" | "rescheduled"
          category_id: string | null
          rescheduled_to: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          user_id: string
          title: string
          notes?: string | null
          location?: string | null
          scheduled_on: string
          starts_at?: string | null
          ends_at?: string | null
          status?: "scheduled" | "completed" | "cancelled" | "rescheduled"
          category_id?: string | null
          rescheduled_to?: string | null
        },
        {
          title?: string
          notes?: string | null
          location?: string | null
          scheduled_on?: string
          starts_at?: string | null
          ends_at?: string | null
          status?: "scheduled" | "completed" | "cancelled" | "rescheduled"
          rescheduled_to?: string | null
        }
      >
      resource_shares: Table<
        {
          id: string
          owner_id: string
          grantee_id: string
          resource_type: "profile" | "task" | "appointment" | "routine"
          resource_id: string
          permission: "read" | "write"
          created_at: string
        },
        {
          id?: string
          owner_id: string
          grantee_id: string
          resource_type: "profile" | "task" | "appointment" | "routine"
          resource_id: string
          permission?: "read" | "write"
        },
        { permission?: "read" | "write" }
      >
    }
    Views: Record<string, never>
    Functions: {
      ensure_routine_tasks: {
        Args: { target_date: string }
        Returns: undefined
      }
      reschedule_task: {
        Args: { task_id: string; target_date: string }
        Returns: string
      }
      reschedule_appointment: {
        Args: { appointment_id: string; target_date: string }
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
