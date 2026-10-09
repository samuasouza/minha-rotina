"use server"

import { blankToNull, isoDateSchema } from "@/lib/validation/schemas"
import {
  measureDefinitionSchema,
  measurementSchema,
  recordIdSchema,
  weightSchema,
} from "@/lib/validation/health"
import { failure, invalid, readyAccount, refreshRecords } from "@/lib/actions/ready"

function saved(message: string) {
  refreshRecords()
  return { ok: true as const, message }
}

export async function saveWeight(input: unknown) {
  const parsed = weightSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const savedWeight = await ready.auth.supabase.from("body_weights").upsert(
    {
      user_id: ready.auth.userId,
      recorded_on: parsed.data.recordedOn,
      weight_kg: parsed.data.weightKg,
      notes: blankToNull(parsed.data.notes),
    },
    { onConflict: "user_id,recorded_on" },
  )
  if (savedWeight.error) return failure(savedWeight.error)
  return saved("Peso guardado neste dia.")
}

export async function deleteWeight(input: unknown) {
  const parsed = recordIdSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const removed = await ready.auth.supabase.from("body_weights").delete().eq("id", parsed.data.id)
  if (removed.error) return failure(removed.error)
  return saved("Peso excluído.")
}

export async function addMeasureDefinition(input: unknown) {
  const parsed = measureDefinitionSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("measure_definitions").insert({
    user_id: ready.auth.userId,
    name: parsed.data.name,
    unit: parsed.data.unit || "cm",
  })
  if (created.error) return failure(created.error)
  return saved("Medida criada.")
}

export async function saveMeasurement(input: unknown) {
  const parsed = measurementSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const savedMeasure = await ready.auth.supabase.from("body_measurements").upsert(
    {
      user_id: ready.auth.userId,
      definition_id: parsed.data.definitionId,
      recorded_on: parsed.data.recordedOn,
      value: parsed.data.value,
    },
    { onConflict: "definition_id,recorded_on" },
  )
  if (savedMeasure.error) return failure(savedMeasure.error)
  return saved("Medida guardada.")
}

export async function uploadBodyPhoto(formData: FormData) {
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const file = formData.get("photo")
  const recordedOn = String(formData.get("recordedOn") ?? "")
  const caption = blankToNull(String(formData.get("caption") ?? ""))
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, message: "Escolha uma foto." }
  }
  if (!isoDateSchema.safeParse(recordedOn).success) {
    return { ok: false as const, message: "Informe a data da foto." }
  }
  if (file.size > 5_242_880) return { ok: false as const, message: "A foto precisa ter até 5 MB." }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { ok: false as const, message: "Use uma foto JPG, PNG ou WebP." }
  }
  if (caption && caption.length > 160) return { ok: false as const, message: "A legenda ficou longa demais." }

  const id = crypto.randomUUID()
  const storagePath = `${ready.auth.userId}/${id}`
  const uploaded = await ready.auth.supabase.storage.from("body-photos").upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  })
  if (uploaded.error) return failure(uploaded.error)

  const created = await ready.auth.supabase.from("body_photos").insert({
    id,
    user_id: ready.auth.userId,
    recorded_on: recordedOn,
    storage_path: storagePath,
    caption,
  })
  if (created.error) {
    await ready.auth.supabase.storage.from("body-photos").remove([storagePath])
    return failure(created.error)
  }
  return saved("Foto guardada no seu espaço privado.")
}

export async function deleteBodyPhoto(input: unknown) {
  const parsed = recordIdSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const photo = await ready.auth.supabase
    .from("body_photos")
    .select("storage_path")
    .eq("id", parsed.data.id)
    .maybeSingle()
  if (photo.error) return failure(photo.error)
  if (!photo.data) return { ok: false as const, message: "Não encontrei essa foto." }
  const removedFile = await ready.auth.supabase.storage.from("body-photos").remove([photo.data.storage_path])
  if (removedFile.error) return failure(removedFile.error)
  const removed = await ready.auth.supabase.from("body_photos").delete().eq("id", parsed.data.id)
  if (removed.error) return failure(removed.error)
  return saved("Foto excluída.")
}
