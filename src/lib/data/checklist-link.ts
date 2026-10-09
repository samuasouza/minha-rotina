import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppDatabase } from "@/types/app-database"

type Client = SupabaseClient<AppDatabase>
export type ModuleKind = "devotional" | "workout" | "study"

export async function syncModuleChecklist(
  supabase: Client,
  input: {
    userId: string
    date: string
    module: ModuleKind
    title: string
    recordId: string
    completed: boolean
    keepPending?: boolean
  },
) {
  const existing = await supabase
    .from("tasks")
    .select("id, routine_id")
    .eq("user_id", input.userId)
    .eq("linked_record_id", input.recordId)
    .maybeSingle()

  if (existing.error) {
    return { taskId: null as string | null, error: existing.error }
  }

  if (!input.completed && !input.keepPending) {
    if (!existing.data) {
      return { taskId: null, error: null }
    }
    if (existing.data.routine_id) {
      const updated = await supabase
        .from("tasks")
        .update({ status: "pending", linked_record_id: null })
        .eq("id", existing.data.id)
      return { taskId: null, error: updated.error }
    }
    const removed = await supabase.from("tasks").delete().eq("id", existing.data.id)
    return { taskId: null, error: removed.error }
  }

  const payload = {
    status: input.completed ? ("completed" as const) : ("pending" as const),
    title: input.title,
    scheduled_on: input.date,
    completion_policy: "module_record" as const,
    linked_module: input.module,
    linked_record_id: input.recordId,
  }

  if (existing.data) {
    const updated = await supabase.from("tasks").update(payload).eq("id", existing.data.id).select("id").single()
    return { taskId: updated.data?.id ?? null, error: updated.error }
  }

  const open = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", input.userId)
    .eq("scheduled_on", input.date)
    .eq("linked_module", input.module)
    .is("linked_record_id", null)
    .in("status", ["pending", "skipped"])
    .limit(1)
    .maybeSingle()

  if (open.error) {
    return { taskId: null, error: open.error }
  }

  if (open.data) {
    const updated = await supabase.from("tasks").update(payload).eq("id", open.data.id).select("id").single()
    return { taskId: updated.data?.id ?? null, error: updated.error }
  }

  const created = await supabase
    .from("tasks")
    .insert({ user_id: input.userId, ...payload })
    .select("id")
    .single()

  return { taskId: created.data?.id ?? null, error: created.error }
}
