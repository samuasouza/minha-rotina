type Table<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

type Goal = "fat_loss" | "muscle_gain" | "recomposition" | "conditioning" | "maintenance" | "wellbeing" | "other"
type Sex = "female" | "male"
type Activity = "sedentary" | "light" | "moderate" | "active"
type Period = "morning" | "afternoon" | "evening" | "flexible"

export type AnamnesisTables = {
  anamnesis: Table<
    {
      user_id: string
      birth_date: string | null
      height_cm: number | null
      biological_sex: Sex | null
      strength_sessions_per_week: number | null
      cardio_sessions_per_week: number | null
      activity_level: Activity | null
      typical_sleep_hours: number | null
      weekly_availability_minutes: number | null
      preferred_period: Period | null
      injuries: string | null
      dietary_restrictions: string | null
      food_allergies: string | null
      food_preferences: string | null
      nutritionist_followup: boolean | null
      notes: string | null
      track_sleep: boolean
      track_energy: boolean
      track_mood: boolean
      track_cycle: boolean
      current_step: number
      completed_at: string | null
      deferred_at: string | null
      created_at: string
      updated_at: string
    },
    {
      user_id: string
      birth_date?: string | null
      height_cm?: number | null
      biological_sex?: Sex | null
      strength_sessions_per_week?: number | null
      cardio_sessions_per_week?: number | null
      activity_level?: Activity | null
      typical_sleep_hours?: number | null
      weekly_availability_minutes?: number | null
      preferred_period?: Period | null
      injuries?: string | null
      dietary_restrictions?: string | null
      food_allergies?: string | null
      food_preferences?: string | null
      nutritionist_followup?: boolean | null
      notes?: string | null
      track_sleep?: boolean
      track_energy?: boolean
      track_mood?: boolean
      track_cycle?: boolean
      current_step?: number
      completed_at?: string | null
      deferred_at?: string | null
    },
    {
      birth_date?: string | null
      height_cm?: number | null
      biological_sex?: Sex | null
      strength_sessions_per_week?: number | null
      cardio_sessions_per_week?: number | null
      activity_level?: Activity | null
      typical_sleep_hours?: number | null
      weekly_availability_minutes?: number | null
      preferred_period?: Period | null
      injuries?: string | null
      dietary_restrictions?: string | null
      food_allergies?: string | null
      food_preferences?: string | null
      nutritionist_followup?: boolean | null
      notes?: string | null
      track_sleep?: boolean
      track_energy?: boolean
      track_mood?: boolean
      track_cycle?: boolean
      current_step?: number
      completed_at?: string | null
      deferred_at?: string | null
    }
  >
  anamnesis_goals: Table<
    {
      id: string
      user_id: string
      goal: Goal
      custom_label: string | null
      is_primary: boolean
      created_at: string
    },
    {
      id?: string
      user_id: string
      goal: Goal
      custom_label?: string | null
      is_primary?: boolean
    },
    { is_primary?: boolean; custom_label?: string | null }
  >
}
