import "server-only"

import { personalExport } from "@/lib/domain/privacy"
import { todayInTimeZone } from "@/lib/domain/dates"
import { failure, readyAccount } from "@/lib/actions/ready"
import type { AppDatabase } from "@/types/app-database"

const exportTables = [
  "profiles",
  "user_preferences",
  "anamnesis",
  "anamnesis_goals",
  "categories",
  "routines",
  "tasks",
  "appointments",
  "resource_shares",
  "personal_goals",
  "personal_goal_revisions",
  "goal_checkins",
  "reminders",
  "devotional_entries",
  "reading_plans",
  "reading_plan_items",
  "reading_logs",
  "prayer_requests",
  "gratitude_entries",
  "devotional_week_goals",
  "exercises",
  "workout_sheets",
  "workout_days",
  "workout_exercises",
  "workout_sessions",
  "workout_sets",
  "load_suggestions",
  "study_subjects",
  "study_topics",
  "study_week_goals",
  "study_sessions",
  "study_notes",
  "foods",
  "meal_templates",
  "meal_template_items",
  "meal_logs",
  "meal_log_items",
  "water_logs",
  "nutrition_targets",
  "diet_plans",
  "diet_meals",
  "diet_items",
  "food_substitutions",
  "cardio_sessions",
  "cardio_week_goals",
  "body_weights",
  "measure_definitions",
  "body_measurements",
  "body_photos",
  "wellbeing_entries",
  "import_drafts",
  "account_deletion_requests",
] as const satisfies readonly (keyof AppDatabase["public"]["Tables"])[]

export async function buildPersonalExport() {
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const tables: Record<string, unknown[]> = {}
  const truncated: string[] = []
  for (const table of exportTables) {
    const result = await ready.auth.supabase.from(table).select("*").limit(5001)
    if (result.error) return failure(result.error)
    const rows = result.data ?? []
    if (rows.length > 5000) {
      truncated.push(table)
      tables[table] = rows.slice(0, 5000)
    } else {
      tables[table] = rows
    }
  }
  const profile = tables.profiles?.[0] as { timezone?: string } | undefined
  const exportedOn = todayInTimeZone(profile?.timezone || "America/Sao_Paulo")
  return {
    ok: true as const,
    filename: `minha-rotina-${exportedOn}.json`,
    json: JSON.stringify(personalExport({ exportedOn, tables, truncated }), null, 2),
  }
}
