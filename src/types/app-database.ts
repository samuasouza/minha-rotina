import type { AnamnesisTables } from "@/types/anamnesis-database"
import type { Database } from "@/types/database"
import type { GoalsTables } from "@/types/goals-database"
import type { HealthTables } from "@/types/health-database"
import type { ImportTables } from "@/types/import-database"

type Table<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

type ModuleTables = {
  devotional_entries: Table<
    {
      id: string
      user_id: string
      entry_date: string
      passage_label: string | null
      passage_url: string | null
      reflection: string | null
      completed_at: string | null
      task_id: string | null
      created_at: string
      updated_at: string
    },
    {
      id?: string
      user_id: string
      entry_date: string
      passage_label?: string | null
      passage_url?: string | null
      reflection?: string | null
      completed_at?: string | null
      task_id?: string | null
    },
    {
      passage_label?: string | null
      passage_url?: string | null
      reflection?: string | null
      completed_at?: string | null
      task_id?: string | null
    }
  >
  reading_plans: Table<
    {
      id: string
      user_id: string
      title: string
      description: string | null
      starts_on: string
      ends_on: string | null
      is_active: boolean
    },
    {
      id?: string
      user_id: string
      title: string
      description?: string | null
      starts_on: string
      ends_on?: string | null
      is_active?: boolean
    },
    { title?: string; description?: string | null; is_active?: boolean; ends_on?: string | null }
  >
  reading_plan_items: Table<
    {
      id: string
      plan_id: string
      user_id: string
      day_number: number
      passage_label: string
      passage_url: string | null
      scheduled_on: string | null
    },
    {
      id?: string
      plan_id: string
      user_id: string
      day_number: number
      passage_label: string
      passage_url?: string | null
      scheduled_on?: string | null
    },
    { passage_label?: string; passage_url?: string | null; day_number?: number }
  >
  reading_logs: Table<
    {
      id: string
      user_id: string
      read_on: string
      kind: "plan" | "free"
      plan_item_id: string | null
      passage_label: string
      passage_url: string | null
      notes: string | null
    },
    {
      id?: string
      user_id: string
      read_on: string
      kind: "plan" | "free"
      plan_item_id?: string | null
      passage_label: string
      passage_url?: string | null
      notes?: string | null
    },
    { notes?: string | null }
  >
  prayer_requests: Table<
    {
      id: string
      user_id: string
      title: string
      details: string | null
      asked_on: string
      status: "open" | "answered"
      answer: string | null
      answered_on: string | null
    },
    {
      id?: string
      user_id: string
      title: string
      details?: string | null
      asked_on: string
      status?: "open" | "answered"
      answer?: string | null
      answered_on?: string | null
    },
    {
      title?: string
      details?: string | null
      status?: "open" | "answered"
      answer?: string | null
      answered_on?: string | null
    }
  >
  gratitude_entries: Table<
    { id: string; user_id: string; entry_date: string; body: string },
    { id?: string; user_id: string; entry_date: string; body: string },
    { body?: string }
  >
  devotional_week_goals: Table<
    { id: string; user_id: string; week_starts_on: string; title: string; is_done: boolean },
    { id?: string; user_id: string; week_starts_on: string; title: string; is_done?: boolean },
    { title?: string; is_done?: boolean }
  >
  exercises: Table<
    { id: string; user_id: string; name: string; notes: string | null; is_active: boolean },
    { id?: string; user_id: string; name: string; notes?: string | null; is_active?: boolean },
    { name?: string; notes?: string | null; is_active?: boolean }
  >
  workout_sheets: Table<
    { id: string; user_id: string; name: string; notes: string | null; is_active: boolean },
    { id?: string; user_id: string; name: string; notes?: string | null; is_active?: boolean },
    { name?: string; notes?: string | null; is_active?: boolean }
  >
  workout_days: Table<
    {
      id: string
      sheet_id: string
      user_id: string
      name: string
      weekday: number | null
      position: number
    },
    {
      id?: string
      sheet_id: string
      user_id: string
      name: string
      weekday?: number | null
      position: number
    },
    { name?: string; weekday?: number | null; position?: number }
  >
  workout_exercises: Table<
    {
      id: string
      day_id: string
      exercise_id: string
      user_id: string
      position: number
      target_sets: number
      target_reps: string
      rest_seconds: number | null
      notes: string | null
    },
    {
      id?: string
      day_id: string
      exercise_id: string
      user_id: string
      position: number
      target_sets: number
      target_reps: string
      rest_seconds?: number | null
      notes?: string | null
    },
    { target_sets?: number; target_reps?: string; position?: number; notes?: string | null }
  >
  workout_sessions: Table<
    {
      id: string
      user_id: string
      sheet_id: string | null
      day_id: string | null
      task_id: string | null
      performed_on: string
      status: "partial" | "completed"
      notes: string | null
      started_at: string | null
      ended_at: string | null
    },
    {
      id?: string
      user_id: string
      sheet_id?: string | null
      day_id?: string | null
      task_id?: string | null
      performed_on: string
      status?: "partial" | "completed"
      notes?: string | null
      started_at?: string | null
      ended_at?: string | null
    },
    {
      status?: "partial" | "completed"
      notes?: string | null
      task_id?: string | null
      ended_at?: string | null
    }
  >
  workout_sets: Table<
    {
      id: string
      session_id: string
      exercise_id: string
      user_id: string
      set_number: number
      reps: number
      load_kg: number
      completed: boolean
      notes: string | null
    },
    {
      id?: string
      session_id: string
      exercise_id: string
      user_id: string
      set_number: number
      reps: number
      load_kg?: number
      completed?: boolean
      notes?: string | null
    },
    { reps?: number; load_kg?: number; completed?: boolean; notes?: string | null }
  >
  load_suggestions: Table<
    {
      id: string
      user_id: string
      exercise_id: string
      based_on_set_id: string | null
      suggested_load_kg: number
      note: string | null
      status: "pending" | "accepted" | "dismissed"
      decided_at: string | null
    },
    {
      id?: string
      user_id: string
      exercise_id: string
      based_on_set_id?: string | null
      suggested_load_kg: number
      note?: string | null
      status?: "pending" | "accepted" | "dismissed"
      decided_at?: string | null
    },
    { status?: "pending" | "accepted" | "dismissed"; decided_at?: string | null; note?: string | null }
  >
  study_subjects: Table<
    { id: string; user_id: string; name: string; kind: "subject" | "course"; notes: string | null; is_active: boolean },
    { id?: string; user_id: string; name: string; kind?: "subject" | "course"; notes?: string | null; is_active?: boolean },
    { name?: string; notes?: string | null; is_active?: boolean; kind?: "subject" | "course" }
  >
  study_topics: Table<
    { id: string; subject_id: string; user_id: string; title: string; position: number; is_done: boolean },
    { id?: string; subject_id: string; user_id: string; title: string; position: number; is_done?: boolean },
    { title?: string; is_done?: boolean; position?: number }
  >
  study_week_goals: Table<
    {
      id: string
      user_id: string
      subject_id: string | null
      week_starts_on: string
      title: string
      target_minutes: number | null
      is_done: boolean
    },
    {
      id?: string
      user_id: string
      subject_id?: string | null
      week_starts_on: string
      title: string
      target_minutes?: number | null
      is_done?: boolean
    },
    { title?: string; target_minutes?: number | null; is_done?: boolean; subject_id?: string | null }
  >
  study_sessions: Table<
    {
      id: string
      user_id: string
      subject_id: string
      task_id: string | null
      started_at: string
      ended_at: string | null
      duration_seconds: number | null
      notes: string | null
      status: "running" | "completed" | "discarded"
    },
    {
      id?: string
      user_id: string
      subject_id: string
      task_id?: string | null
      started_at: string
      ended_at?: string | null
      duration_seconds?: number | null
      notes?: string | null
      status?: "running" | "completed" | "discarded"
    },
    {
      task_id?: string | null
      ended_at?: string | null
      duration_seconds?: number | null
      notes?: string | null
      status?: "running" | "completed" | "discarded"
    }
  >
  study_notes: Table<
    { id: string; user_id: string; subject_id: string | null; session_id: string | null; body: string; created_at: string },
    { id?: string; user_id: string; subject_id?: string | null; session_id?: string | null; body: string },
    { body?: string }
  >
}

export type AppDatabase = {
  public: {
    Tables: Database["public"]["Tables"] &
      ModuleTables &
      HealthTables &
      AnamnesisTables &
      GoalsTables &
      ImportTables
    Views: Database["public"]["Views"]
    Functions: Database["public"]["Functions"]
    Enums: Database["public"]["Enums"]
    CompositeTypes: Database["public"]["CompositeTypes"]
  }
}
