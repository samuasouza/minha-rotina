type Table<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

type FoodUnit = "g" | "ml" | "unit"
type SubstitutionStatus = "pending" | "accepted" | "rejected"
type CardioActivity = "treadmill" | "walk" | "run" | "cycle" | "other"
type CardioIntensity = "easy" | "moderate" | "vigorous"
type EnergyKind = "none" | "acsm_estimate" | "informed"

export type HealthTables = {
  foods: Table<
    {
      id: string
      user_id: string
      name: string
      basis_quantity: number
      basis_unit: FoodUnit
      kcal: number
      protein_g: number
      carbs_g: number
      fat_g: number
      source_note: string
    },
    {
      user_id: string
      name: string
      basis_quantity: number
      basis_unit: FoodUnit
      kcal: number
      protein_g: number
      carbs_g: number
      fat_g: number
      source_note: string
    },
    { name?: string }
  >
  meal_templates: Table<
    { id: string; user_id: string; name: string; is_favorite: boolean },
    { user_id: string; name: string; is_favorite?: boolean },
    { name?: string; is_favorite?: boolean }
  >
  meal_template_items: Table<
    { id: string; template_id: string; food_id: string; user_id: string; quantity: number },
    { template_id: string; food_id: string; user_id: string; quantity: number },
    { quantity?: number }
  >
  meal_logs: Table<
    { id: string; user_id: string; eaten_on: string; name: string; template_id: string | null; notes: string | null },
    { user_id: string; eaten_on: string; name: string; template_id?: string | null; notes?: string | null },
    { name?: string }
  >
  meal_log_items: Table<
    {
      id: string
      meal_log_id: string
      food_id: string | null
      user_id: string
      name_snapshot: string
      quantity: number
      unit: FoodUnit
      kcal: number
      protein_g: number
      carbs_g: number
      fat_g: number
      source_note: string
    },
    {
      meal_log_id: string
      food_id?: string | null
      user_id: string
      name_snapshot: string
      quantity: number
      unit: FoodUnit
      kcal: number
      protein_g: number
      carbs_g: number
      fat_g: number
      source_note: string
    },
    { name_snapshot?: string }
  >
  water_logs: Table<
    { id: string; user_id: string; logged_on: string; milliliters: number },
    { user_id: string; logged_on: string; milliliters: number },
    { milliliters?: number }
  >
  nutrition_targets: Table<
    {
      id: string
      user_id: string
      starts_on: string
      kcal: number | null
      protein_g: number | null
      carbs_g: number | null
      fat_g: number | null
      water_ml: number | null
    },
    {
      user_id: string
      starts_on: string
      kcal?: number | null
      protein_g?: number | null
      carbs_g?: number | null
      fat_g?: number | null
      water_ml?: number | null
    },
    {
      kcal?: number | null
      protein_g?: number | null
      carbs_g?: number | null
      fat_g?: number | null
      water_ml?: number | null
    }
  >
  diet_plans: Table<
    {
      id: string
      user_id: string
      title: string
      prescribed_by: string | null
      prescribed_on: string | null
      notes: string | null
      archived_at: string | null
    },
    {
      user_id: string
      title: string
      prescribed_by?: string | null
      prescribed_on?: string | null
      notes?: string | null
    },
    { archived_at?: string | null; title?: string }
  >
  diet_meals: Table<
    { id: string; plan_id: string; user_id: string; name: string; position: number; archived_at: string | null },
    { plan_id: string; user_id: string; name: string; position: number },
    { archived_at?: string | null }
  >
  diet_items: Table<
    {
      id: string
      meal_id: string
      user_id: string
      food_id: string | null
      label: string
      quantity: number | null
      unit: FoodUnit | null
      position: number
      archived_at: string | null
    },
    {
      meal_id: string
      user_id: string
      food_id?: string | null
      label: string
      quantity?: number | null
      unit?: FoodUnit | null
      position: number
    },
    { archived_at?: string | null }
  >
  food_substitutions: Table<
    {
      id: string
      user_id: string
      diet_item_id: string
      suggested_food_id: string
      suggested_quantity: number
      original_kcal: number | null
      original_protein_g: number | null
      original_carbs_g: number | null
      original_fat_g: number | null
      suggested_kcal: number
      suggested_protein_g: number
      suggested_carbs_g: number
      suggested_fat_g: number
      status: SubstitutionStatus
      decided_at: string | null
    },
    {
      user_id: string
      diet_item_id: string
      suggested_food_id: string
      suggested_quantity: number
      original_kcal?: number | null
      original_protein_g?: number | null
      original_carbs_g?: number | null
      original_fat_g?: number | null
      suggested_kcal: number
      suggested_protein_g: number
      suggested_carbs_g: number
      suggested_fat_g: number
    },
    { status?: SubstitutionStatus; decided_at?: string | null }
  >
  cardio_sessions: Table<
    {
      id: string
      user_id: string
      performed_on: string
      activity: CardioActivity
      custom_label: string | null
      duration_minutes: number
      distance_km: number | null
      speed_kmh: number | null
      incline_percent: number | null
      intensity: CardioIntensity | null
      heart_rate_bpm: number | null
      energy_kcal: number | null
      energy_kind: EnergyKind
      formula: string | null
      weight_kg_used: number | null
      notes: string | null
    },
    {
      user_id: string
      performed_on: string
      activity: CardioActivity
      custom_label?: string | null
      duration_minutes: number
      distance_km?: number | null
      speed_kmh?: number | null
      incline_percent?: number | null
      intensity?: CardioIntensity | null
      heart_rate_bpm?: number | null
      energy_kcal?: number | null
      energy_kind?: EnergyKind
      formula?: string | null
      weight_kg_used?: number | null
      notes?: string | null
    },
    { notes?: string | null }
  >
  cardio_week_goals: Table<
    { id: string; user_id: string; week_starts_on: string; target_sessions: number; target_minutes: number | null },
    { user_id: string; week_starts_on: string; target_sessions: number; target_minutes?: number | null },
    { target_sessions?: number; target_minutes?: number | null }
  >
  body_weights: Table<
    { id: string; user_id: string; recorded_on: string; weight_kg: number; notes: string | null },
    { user_id: string; recorded_on: string; weight_kg: number; notes?: string | null },
    { weight_kg?: number; notes?: string | null }
  >
  measure_definitions: Table<
    { id: string; user_id: string; name: string; unit: string },
    { user_id: string; name: string; unit?: string },
    { name?: string }
  >
  body_measurements: Table<
    { id: string; user_id: string; definition_id: string; recorded_on: string; value: number },
    { user_id: string; definition_id: string; recorded_on: string; value: number },
    { value?: number }
  >
  body_photos: Table<
    { id: string; user_id: string; recorded_on: string; storage_path: string; caption: string | null },
    { id: string; user_id: string; recorded_on: string; storage_path: string; caption?: string | null },
    { caption?: string | null }
  >
  wellbeing_entries: Table<
    {
      id: string
      user_id: string
      entry_date: string
      sleep_hours: number | null
      sleep_quality: number | null
      energy: number | null
      mood: number | null
      menstruation: boolean | null
      notes: string | null
    },
    {
      user_id: string
      entry_date: string
      sleep_hours?: number | null
      sleep_quality?: number | null
      energy?: number | null
      mood?: number | null
      menstruation?: boolean | null
      notes?: string | null
    },
    {
      sleep_hours?: number | null
      sleep_quality?: number | null
      energy?: number | null
      mood?: number | null
      menstruation?: boolean | null
      notes?: string | null
    }
  >
}
