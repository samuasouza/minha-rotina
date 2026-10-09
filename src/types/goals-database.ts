type Table<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

type GoalPeriod = "daily" | "weekly" | "monthly" | "custom"
type GoalCategory = "devotional" | "training" | "study" | "nutrition" | "hydration" | "cardio" | "body" | "wellbeing" | "habit"
type GoalMeasure =
  | "manual"
  | "devotional_days"
  | "workout_sessions"
  | "training_volume"
  | "study_minutes"
  | "nutrition_kcal"
  | "nutrition_protein"
  | "water_ml"
  | "cardio_sessions"
  | "cardio_minutes"
  | "body_weight"
  | "sleep_hours"
type GoalStatus = "active" | "paused" | "completed" | "archived"
type ReminderKind = "devotional" | "training" | "study" | "water" | "appointment" | "goal"

export type GoalsTables = {
  personal_goals: Table<
    {
      id: string
      user_id: string
      title: string
      category: GoalCategory
      measure: GoalMeasure
      target_value: number
      unit: string
      period: GoalPeriod
      custom_days: number | null
      starts_on: string
      ends_on: string | null
      status: GoalStatus
      created_at: string
      updated_at: string
    },
    {
      user_id: string
      title: string
      category: GoalCategory
      measure: GoalMeasure
      target_value: number
      unit: string
      period: GoalPeriod
      custom_days?: number | null
      starts_on: string
      ends_on?: string | null
      status?: GoalStatus
    },
    {
      title?: string
      category?: GoalCategory
      measure?: GoalMeasure
      target_value?: number
      unit?: string
      period?: GoalPeriod
      custom_days?: number | null
      starts_on?: string
      ends_on?: string | null
      status?: GoalStatus
    }
  >
  personal_goal_revisions: Table<
    {
      id: string
      goal_id: string
      user_id: string
      title: string
      target_value: number
      unit: string
      period: GoalPeriod
      starts_on: string
      ends_on: string | null
      status: GoalStatus
      recorded_at: string
    },
    { goal_id: string; user_id: string; title: string; target_value: number; unit: string; period: GoalPeriod; starts_on: string; ends_on?: string | null; status: GoalStatus },
    Record<string, never>
  >
  goal_checkins: Table<
    {
      id: string
      goal_id: string
      user_id: string
      recorded_on: string
      amount: number
      note: string | null
      created_at: string
    },
    { goal_id: string; user_id: string; recorded_on: string; amount: number; note?: string | null },
    { amount?: number; note?: string | null }
  >
  reminders: Table<
    {
      id: string
      user_id: string
      title: string
      kind: ReminderKind
      goal_id: string | null
      enabled: boolean
      remind_at: string
      weekdays: number[]
      snoozed_until: string | null
      created_at: string
      updated_at: string
    },
    {
      user_id: string
      title: string
      kind: ReminderKind
      goal_id?: string | null
      enabled?: boolean
      remind_at: string
      weekdays: number[]
      snoozed_until?: string | null
    },
    {
      title?: string
      kind?: ReminderKind
      goal_id?: string | null
      enabled?: boolean
      remind_at?: string
      weekdays?: number[]
      snoozed_until?: string | null
    }
  >
}
