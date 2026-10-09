"use server"

import type { AuthContext } from "@/lib/auth/session"
import { zonedLocalToUtc } from "@/lib/domain/dates"
import {
  duplicateTitle,
  fileByteLimit,
  findSameLabel,
  needsReview,
  providerMissingMessage,
  sameLabel,
} from "@/lib/domain/import"
import { failure, invalid, readyAccount, refreshRecords } from "@/lib/actions/ready"
import { importProviderConfigured, requestStructuredExtraction } from "@/lib/import/provider"
import {
  confirmDraftSchema,
  draftIdSchema,
  fileDraftSchema,
  normalizeProposal,
  proposalSchemas,
  proposalTooLarge,
  textDraftSchema,
} from "@/lib/validation/import"
import type { Json } from "@/types/database"

type Client = Extract<AuthContext, { status: "authenticated" }>["supabase"]
type Ready = { userId: string; supabase: Client }

function saved(message: string) {
  refreshRecords()
  return { ok: true as const, message }
}

function ownedPath(userId: string, path: string) {
  const rest = path.slice(userId.length + 1)
  return path.startsWith(`${userId}/`) && rest.length > 0 && !rest.includes("/") && !path.includes("..")
}

async function storedFile(ready: Ready, path: string) {
  const fileName = path.slice(ready.userId.length + 1)
  const listed = await ready.supabase.storage.from("imports").list(ready.userId, { search: fileName, limit: 20 })
  if (listed.error) return { ok: false as const, message: failure(listed.error).message }
  const match = listed.data?.find((item) => item.name === fileName)
  if (!match) return { ok: false as const, message: "O arquivo não foi encontrado nesta conta." }
  const size = Number(match.metadata?.size ?? 0)
  const mime = typeof match.metadata?.mimetype === "string" ? match.metadata.mimetype : ""
  return { ok: true as const, size, mime }
}

export async function createTextDraft(input: unknown) {
  const parsed = textDraftSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase
    .from("import_drafts")
    .insert({
      user_id: ready.auth.userId,
      module: parsed.data.module,
      source_kind: "text",
      source_name: parsed.data.sourceName,
      source_text: parsed.data.sourceText,
    })
    .select("id")
    .single()
  if (created.error || !created.data) return failure(created.error ?? { message: "insert" })
  refreshRecords()
  return {
    ok: true as const,
    id: created.data.id,
    message: "O texto ficou guardado. Revise a prévia antes de confirmar.",
  }
}

export async function createFileDraft(input: unknown) {
  const parsed = fileDraftSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  if (!ownedPath(ready.auth.userId, parsed.data.storagePath)) {
    return { ok: false as const, message: "O arquivo precisa ficar na pasta desta conta." }
  }
  const file = await storedFile({ userId: ready.auth.userId, supabase: ready.auth.supabase }, parsed.data.storagePath)
  if (!file.ok) return file
  if (file.size > fileByteLimit(parsed.data.sourceKind)) {
    await ready.auth.supabase.storage.from("imports").remove([parsed.data.storagePath])
    return { ok: false as const, message: "O arquivo passa do limite deste tipo." }
  }
  const created = await ready.auth.supabase
    .from("import_drafts")
    .insert({
      user_id: ready.auth.userId,
      module: parsed.data.module,
      source_kind: parsed.data.sourceKind,
      source_name: parsed.data.sourceName,
      storage_path: parsed.data.storagePath,
    })
    .select("id")
    .single()
  if (created.error || !created.data) return failure(created.error ?? { message: "insert" })
  refreshRecords()
  return {
    ok: true as const,
    id: created.data.id,
    message: importProviderConfigured()
      ? "O arquivo ficou guardado. Peça a leitura ou preencha a prévia. Nada entra no módulo antes da confirmação."
      : providerMissingMessage,
  }
}

export async function discardDraft(input: unknown) {
  const parsed = draftIdSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const updated = await ready.auth.supabase
    .from("import_drafts")
    .update({ status: "discarded" })
    .eq("id", parsed.data.id)
    .neq("status", "confirmed")
  if (updated.error) return failure(updated.error)
  return saved("A prévia foi descartada. Nenhum registro do módulo foi criado.")
}

export async function readDraft(input: unknown) {
  const parsed = draftIdSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const draft = await ready.auth.supabase
    .from("import_drafts")
    .select("id, module, source_kind, source_text, storage_path, extraction_attempts, status")
    .eq("id", parsed.data.id)
    .maybeSingle()
  if (draft.error) return failure(draft.error)
  if (!draft.data || draft.data.status === "confirmed" || draft.data.status === "discarded") {
    return { ok: false as const, message: "Essa prévia não está mais aberta." }
  }
  if (draft.data.extraction_attempts >= 2) {
    return { ok: false as const, message: "Essa prévia já usou as duas leituras automáticas disponíveis." }
  }
  if (!importProviderConfigured()) {
    return { ok: false as const, message: providerMissingMessage }
  }
  const attempt = await ready.auth.supabase
    .from("import_drafts")
    .update({ extraction_attempts: draft.data.extraction_attempts + 1 })
    .eq("id", draft.data.id)
  if (attempt.error) return failure(attempt.error)

  let bytes: Uint8Array | null = null
  let mime: string | null = null
  if (draft.data.storage_path) {
    const file = await storedFile({ userId: ready.auth.userId, supabase: ready.auth.supabase }, draft.data.storage_path)
    if (!file.ok) return file
    mime = file.mime || null
    const downloaded = await ready.auth.supabase.storage.from("imports").download(draft.data.storage_path)
    if (downloaded.error || !downloaded.data) return failure(downloaded.error ?? { message: "download" })
    bytes = new Uint8Array(await downloaded.data.arrayBuffer())
    if (!mime) mime = downloaded.data.type || null
  }

  const extracted = await requestStructuredExtraction({
    module: draft.data.module,
    text: draft.data.source_text,
    bytes,
    mime,
  })
  if (!extracted.configured || !extracted.ok) {
    return { ok: false as const, message: extracted.message }
  }
  if (extracted.proposal == null) {
    await ready.auth.supabase
      .from("import_drafts")
      .update({ review_note: "A leitura não encontrou dados suficientes. Preencha só o que está no material." })
      .eq("id", draft.data.id)
    refreshRecords()
    return { ok: false as const, message: "A leitura não encontrou dados suficientes. Preencha a prévia." }
  }
  const normalized = normalizeProposal(draft.data.module, extracted.proposal)
  const proposal = proposalSchemas[draft.data.module].safeParse(normalized)
  if (!proposal.success) {
    await ready.auth.supabase
      .from("import_drafts")
      .update({ review_note: "A leitura não devolveu uma estrutura válida. Preencha a prévia manualmente." })
      .eq("id", draft.data.id)
    refreshRecords()
    return { ok: false as const, message: "A leitura não devolveu uma estrutura válida. Preencha a prévia." }
  }
  const note = needsReview(extracted.confidence)
    ? "A leitura ficou com confiança baixa. Confira cada campo antes de confirmar."
    : null
  const stored = await ready.auth.supabase
    .from("import_drafts")
    .update({
      proposal: proposal.data as Json,
      status: "ready_for_review",
      review_note: note,
    })
    .eq("id", draft.data.id)
  if (stored.error) return failure(stored.error)
  refreshRecords()
  return {
    ok: true as const,
    message: note ?? "A leitura preencheu a prévia. Confirme só depois de revisar.",
  }
}

export async function confirmDraft(input: unknown) {
  const parsed = confirmDraftSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const draft = await ready.auth.supabase
    .from("import_drafts")
    .select("id, module, status")
    .eq("id", parsed.data.id)
    .maybeSingle()
  if (draft.error) return failure(draft.error)
  if (!draft.data || draft.data.status === "confirmed" || draft.data.status === "discarded") {
    return { ok: false as const, message: "Essa prévia não está mais aberta." }
  }
  const normalized = normalizeProposal(draft.data.module, parsed.data.proposal)
  if (proposalTooLarge(normalized)) {
    return { ok: false as const, message: "A prévia ficou grande demais." }
  }
  const proposal = proposalSchemas[draft.data.module].safeParse(normalized)
  if (!proposal.success) return invalid(proposal.error)
  const client: Ready = { userId: ready.auth.userId, supabase: ready.auth.supabase }
  const written = await writeProposal(client, draft.data.module, proposal.data)
  if (!written.ok) return written
  const closed = await ready.auth.supabase
    .from("import_drafts")
    .update({
      proposal: proposal.data as Json,
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      review_note: null,
    })
    .eq("id", draft.data.id)
    .neq("status", "confirmed")
  if (closed.error) {
    return {
      ok: true as const,
      message: `${written.message} A prévia não foi encerrada; confira o módulo antes de confirmar outra vez.`,
    }
  }
  return saved(written.message)
}

async function writeProposal(ready: Ready, module: keyof typeof proposalSchemas, proposal: unknown) {
  if (module === "diet") return saveDiet(ready, proposalSchemas.diet.parse(proposal))
  if (module === "workout") return saveWorkout(ready, proposalSchemas.workout.parse(proposal))
  if (module === "study") return saveStudy(ready, proposalSchemas.study.parse(proposal))
  if (module === "schedule") return saveSchedule(ready, proposalSchemas.schedule.parse(proposal))
  if (module === "water") return saveWater(ready, proposalSchemas.water.parse(proposal))
  return saveMeal(ready, proposalSchemas.meal.parse(proposal))
}

async function saveDiet(ready: Ready, proposal: ReturnType<typeof proposalSchemas.diet.parse>) {
  const existing = await ready.supabase.from("diet_plans").select("title").is("archived_at", null)
  if (existing.error) return failure(existing.error)
  if (duplicateTitle((existing.data ?? []).map((row) => row.title), proposal.title)) {
    return { ok: false as const, message: "Já existe um plano com esse nome. Renomeie a prévia para não duplicar." }
  }
  const plan = await ready.supabase
    .from("diet_plans")
    .insert({
      user_id: ready.userId,
      title: proposal.title,
      prescribed_by: proposal.prescribedBy,
    })
    .select("id")
    .single()
  if (plan.error || !plan.data) return failure(plan.error ?? { message: "insert" })
  for (const [mealIndex, meal] of proposal.meals.entries()) {
    const createdMeal = await ready.supabase
      .from("diet_meals")
      .insert({ user_id: ready.userId, plan_id: plan.data.id, name: meal.name, position: mealIndex })
      .select("id")
      .single()
    if (createdMeal.error || !createdMeal.data) {
      await ready.supabase.from("diet_plans").delete().eq("id", plan.data.id)
      return failure(createdMeal.error ?? { message: "insert" })
    }
    for (const [itemIndex, item] of meal.items.entries()) {
      const createdItem = await ready.supabase.from("diet_items").insert({
        user_id: ready.userId,
        meal_id: createdMeal.data.id,
        label: item.label,
        quantity: item.quantity,
        unit: item.unit,
        position: itemIndex,
      })
      if (createdItem.error) {
        await ready.supabase.from("diet_plans").delete().eq("id", plan.data.id)
        return failure(createdItem.error)
      }
    }
  }
  return { ok: true as const, message: "O plano alimentar foi salvo depois da sua confirmação." }
}

async function saveWorkout(ready: Ready, proposal: ReturnType<typeof proposalSchemas.workout.parse>) {
  const sheets = await ready.supabase.from("workout_sheets").select("name")
  if (sheets.error) return failure(sheets.error)
  if (duplicateTitle((sheets.data ?? []).map((row) => row.name), proposal.name)) {
    return { ok: false as const, message: "Já existe uma ficha com esse nome. Renomeie a prévia para não duplicar." }
  }
  const catalog = await ready.supabase.from("exercises").select("id, name")
  if (catalog.error) return failure(catalog.error)
  const known = [...(catalog.data ?? [])]
  const createdExerciseIds: string[] = []
  const sheet = await ready.supabase
    .from("workout_sheets")
    .insert({ user_id: ready.userId, name: proposal.name, notes: proposal.notes })
    .select("id")
    .single()
  if (sheet.error || !sheet.data) return failure(sheet.error ?? { message: "insert" })

  for (const [dayIndex, day] of proposal.days.entries()) {
    const createdDay = await ready.supabase
      .from("workout_days")
      .insert({ user_id: ready.userId, sheet_id: sheet.data.id, name: day.name, position: dayIndex })
      .select("id")
      .single()
    if (createdDay.error || !createdDay.data) {
      await ready.supabase.from("workout_sheets").delete().eq("id", sheet.data.id)
      if (createdExerciseIds.length) await ready.supabase.from("exercises").delete().in("id", createdExerciseIds)
      return failure(createdDay.error ?? { message: "insert" })
    }
    for (const [exerciseIndex, exercise] of day.exercises.entries()) {
      let match = findSameLabel(known, exercise.name)
      if (!match) {
        const created = await ready.supabase
          .from("exercises")
          .insert({ user_id: ready.userId, name: exercise.name.trim() })
          .select("id, name")
          .single()
        if (created.error || !created.data) {
          await ready.supabase.from("workout_sheets").delete().eq("id", sheet.data.id)
          if (createdExerciseIds.length) await ready.supabase.from("exercises").delete().in("id", createdExerciseIds)
          return failure(created.error ?? { message: "insert" })
        }
        match = created.data
        known.push(created.data)
        createdExerciseIds.push(created.data.id)
      }
      const prescribed = await ready.supabase.from("workout_exercises").insert({
        user_id: ready.userId,
        day_id: createdDay.data.id,
        exercise_id: match.id,
        position: exerciseIndex,
        target_sets: exercise.targetSets,
        target_reps: exercise.targetReps,
      })
      if (prescribed.error) {
        await ready.supabase.from("workout_sheets").delete().eq("id", sheet.data.id)
        if (createdExerciseIds.length) await ready.supabase.from("exercises").delete().in("id", createdExerciseIds)
        return failure(prescribed.error)
      }
    }
  }
  return { ok: true as const, message: "A ficha foi salva depois da sua confirmação." }
}

async function saveStudy(ready: Ready, proposal: ReturnType<typeof proposalSchemas.study.parse>) {
  const subjects = await ready.supabase.from("study_subjects").select("id, name")
  if (subjects.error) return failure(subjects.error)
  let subject = findSameLabel(subjects.data ?? [], proposal.subjectName)
  let createdSubject = false
  if (!subject) {
    const created = await ready.supabase
      .from("study_subjects")
      .insert({ user_id: ready.userId, name: proposal.subjectName.trim(), kind: proposal.kind })
      .select("id, name")
      .single()
    if (created.error || !created.data) return failure(created.error ?? { message: "insert" })
    subject = created.data
    createdSubject = true
  }
  const note = await ready.supabase
    .from("study_notes")
    .insert({ user_id: ready.userId, subject_id: subject.id, body: proposal.notes })
    .select("id")
    .single()
  if (note.error || !note.data) {
    if (createdSubject) await ready.supabase.from("study_subjects").delete().eq("id", subject.id)
    return failure(note.error ?? { message: "insert" })
  }
  if (proposal.minutes != null && proposal.date) {
    const profile = await ready.supabase.from("profiles").select("timezone").eq("id", ready.userId).single()
    const timezone = profile.data?.timezone || "America/Sao_Paulo"
    const started = zonedLocalToUtc(proposal.date, "12:00", timezone)
    const ended = new Date(started.getTime() + proposal.minutes * 60 * 1000)
    const session = await ready.supabase.from("study_sessions").insert({
      user_id: ready.userId,
      subject_id: subject.id,
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
      duration_seconds: proposal.minutes * 60,
      status: "completed",
      notes: proposal.notes,
    })
    if (session.error) {
      await ready.supabase.from("study_notes").delete().eq("id", note.data.id)
      if (createdSubject) await ready.supabase.from("study_subjects").delete().eq("id", subject.id)
      return failure(session.error)
    }
  }
  return { ok: true as const, message: "O material de estudo foi salvo depois da sua confirmação." }
}

async function saveSchedule(ready: Ready, proposal: ReturnType<typeof proposalSchemas.schedule.parse>) {
  const tasks = await ready.supabase.from("tasks").select("title, scheduled_on")
  const appointments = await ready.supabase.from("appointments").select("title, scheduled_on")
  if (tasks.error) return failure(tasks.error)
  if (appointments.error) return failure(appointments.error)
  const createdTasks: string[] = []
  const createdAppointments: string[] = []
  let skipped = 0
  for (const item of proposal.items) {
    const time = item.time
    if (item.kind === "task") {
      const exists = (tasks.data ?? []).some((row) => sameLabel(row.title, item.title) && row.scheduled_on === item.date)
      if (exists) {
        skipped += 1
        continue
      }
      const created = await ready.supabase
        .from("tasks")
        .insert({
          user_id: ready.userId,
          title: item.title,
          scheduled_on: item.date,
          time_of_day: time,
        })
        .select("id")
        .single()
      if (created.error || !created.data) {
        if (createdTasks.length) await ready.supabase.from("tasks").delete().in("id", createdTasks)
        if (createdAppointments.length) await ready.supabase.from("appointments").delete().in("id", createdAppointments)
        return failure(created.error ?? { message: "insert" })
      }
      createdTasks.push(created.data.id)
    } else {
      const exists = (appointments.data ?? []).some(
        (row) => sameLabel(row.title, item.title) && row.scheduled_on === item.date,
      )
      if (exists) {
        skipped += 1
        continue
      }
      const created = await ready.supabase
        .from("appointments")
        .insert({
          user_id: ready.userId,
          title: item.title,
          scheduled_on: item.date,
          starts_at: time,
        })
        .select("id")
        .single()
      if (created.error || !created.data) {
        if (createdTasks.length) await ready.supabase.from("tasks").delete().in("id", createdTasks)
        if (createdAppointments.length) await ready.supabase.from("appointments").delete().in("id", createdAppointments)
        return failure(created.error ?? { message: "insert" })
      }
      createdAppointments.push(created.data.id)
    }
  }
  const savedCount = createdTasks.length + createdAppointments.length
  if (savedCount === 0) {
    return { ok: true as const, message: "Nada novo foi salvo. Esses itens já existiam." }
  }
  const skippedText = skipped ? ` ${skipped} já existia e não foi duplicado.` : ""
  return { ok: true as const, message: `${savedCount} item(ns) foram salvos depois da confirmação.${skippedText}` }
}

async function saveWater(ready: Ready, proposal: ReturnType<typeof proposalSchemas.water.parse>) {
  const existing = await ready.supabase
    .from("water_logs")
    .select("id")
    .eq("logged_on", proposal.date)
    .eq("milliliters", proposal.milliliters)
    .limit(1)
  if (existing.error) return failure(existing.error)
  if ((existing.data ?? []).length > 0) {
    return { ok: false as const, message: "Já existe um registro com essa data e essa quantidade. Ajuste a prévia." }
  }
  const created = await ready.supabase.from("water_logs").insert({
    user_id: ready.userId,
    logged_on: proposal.date,
    milliliters: proposal.milliliters,
  })
  if (created.error) return failure(created.error)
  return { ok: true as const, message: "A água foi registrada depois da sua confirmação." }
}

async function saveMeal(ready: Ready, proposal: ReturnType<typeof proposalSchemas.meal.parse>) {
  const existing = await ready.supabase.from("meal_logs").select("name").eq("eaten_on", proposal.date)
  if (existing.error) return failure(existing.error)
  if ((existing.data ?? []).some((row) => sameLabel(row.name, proposal.name))) {
    return { ok: false as const, message: "Já existe uma refeição com esse nome nesse dia. Ajuste a prévia." }
  }
  const meal = await ready.supabase
    .from("meal_logs")
    .insert({ user_id: ready.userId, eaten_on: proposal.date, name: proposal.name })
    .select("id")
    .single()
  if (meal.error || !meal.data) return failure(meal.error ?? { message: "insert" })
  for (const item of proposal.items) {
    const created = await ready.supabase.from("meal_log_items").insert({
      user_id: ready.userId,
      meal_log_id: meal.data.id,
      name_snapshot: item.name,
      quantity: item.quantity,
      unit: item.unit,
      kcal: item.kcal,
      protein_g: item.protein,
      carbs_g: item.carbs,
      fat_g: item.fat,
      source_note: item.sourceNote,
    })
    if (created.error) {
      await ready.supabase.from("meal_logs").delete().eq("id", meal.data.id)
      return failure(created.error)
    }
  }
  return { ok: true as const, message: "A refeição foi registrada depois da sua confirmação." }
}
