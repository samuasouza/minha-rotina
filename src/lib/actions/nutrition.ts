"use server"

import { scaleFood } from "@/lib/domain/nutrition"
import { blankToNull, isoDateSchema } from "@/lib/validation/schemas"
import {
  amountOrNull,
  decisionSchema,
  dietItemSchema,
  dietMealSchema,
  dietPlanSchema,
  foodSchema,
  mealLogSchema,
  nutritionTargetSchema,
  recordIdSchema,
  substitutionSchema,
  waterSchema,
} from "@/lib/validation/health"
import { failure, invalid, readyAccount, refreshRecords } from "@/lib/actions/ready"

function saved(message: string) {
  refreshRecords()
  return { ok: true as const, message }
}

export async function addFood(input: unknown) {
  const parsed = foodSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("foods").insert({
    user_id: ready.auth.userId,
    name: parsed.data.name,
    basis_quantity: parsed.data.basisQuantity,
    basis_unit: parsed.data.basisUnit,
    kcal: parsed.data.kcal,
    protein_g: parsed.data.protein,
    carbs_g: parsed.data.carbs,
    fat_g: parsed.data.fat,
    source_note: parsed.data.sourceNote,
  })
  if (created.error) return failure(created.error)
  return saved("Alimento guardado com os valores que você informou.")
}

export async function deleteFood(input: unknown) {
  const parsed = recordIdSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const removed = await ready.auth.supabase.from("foods").delete().eq("id", parsed.data.id)
  if (removed.error) return failure(removed.error)
  return saved("Alimento excluído.")
}

export async function saveMealLog(input: unknown) {
  const parsed = mealLogSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const ids = [...new Set(parsed.data.items.map((item) => item.foodId))]
  const foods = await ready.auth.supabase
    .from("foods")
    .select("id, name, basis_quantity, basis_unit, kcal, protein_g, carbs_g, fat_g, source_note")
    .in("id", ids)
  if (foods.error) return failure(foods.error)
  if ((foods.data ?? []).length !== ids.length) {
    return { ok: false as const, message: "Um dos alimentos não está nesta conta." }
  }
  const byId = new Map((foods.data ?? []).map((food) => [food.id, food]))
  const lines = parsed.data.items.map((item) => {
    const food = byId.get(item.foodId)!
    const scaled = scaleFood(
      {
        basisQuantity: Number(food.basis_quantity),
        kcal: Number(food.kcal),
        protein: Number(food.protein_g),
        carbs: Number(food.carbs_g),
        fat: Number(food.fat_g),
      },
      item.quantity,
    )
    return { item, food, scaled }
  })
  if (lines.some((line) => !line.scaled)) {
    return { ok: false as const, message: "Não foi possível calcular com os valores cadastrados." }
  }

  const meal = await ready.auth.supabase
    .from("meal_logs")
    .insert({ user_id: ready.auth.userId, eaten_on: parsed.data.eatenOn, name: parsed.data.name })
    .select("id")
    .single()
  if (meal.error) return failure(meal.error)

  const inserted = await ready.auth.supabase.from("meal_log_items").insert(
    lines.map((line) => ({
      meal_log_id: meal.data.id,
      food_id: line.food.id,
      user_id: ready.auth.userId,
      name_snapshot: line.food.name,
      quantity: line.item.quantity,
      unit: line.food.basis_unit,
      kcal: line.scaled!.kcal,
      protein_g: line.scaled!.protein,
      carbs_g: line.scaled!.carbs,
      fat_g: line.scaled!.fat,
      source_note: line.food.source_note,
    })),
  )
  if (inserted.error) return failure(inserted.error)

  if (parsed.data.saveAsFavorite) {
    const template = await ready.auth.supabase
      .from("meal_templates")
      .insert({ user_id: ready.auth.userId, name: parsed.data.name, is_favorite: true })
      .select("id")
      .single()
    if (template.error) return failure(template.error)
    const favoriteItems = await ready.auth.supabase.from("meal_template_items").insert(
      lines.map((line) => ({
        template_id: template.data.id,
        food_id: line.food.id,
        user_id: ready.auth.userId,
        quantity: line.item.quantity,
      })),
    )
    if (favoriteItems.error) return failure(favoriteItems.error)
  }

  return saved("Refeição registrada. Os valores ficaram copiados neste dia.")
}

export async function logFavoriteMeal(input: unknown) {
  const parsed = recordIdSchema.extend({ eatenOn: isoDateSchema }).safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const template = await ready.auth.supabase
    .from("meal_templates")
    .select("id, name")
    .eq("id", parsed.data.id)
    .maybeSingle()
  if (template.error) return failure(template.error)
  if (!template.data) return { ok: false as const, message: "Não encontrei essa refeição favorita." }
  const items = await ready.auth.supabase
    .from("meal_template_items")
    .select("food_id, quantity")
    .eq("template_id", template.data.id)
  if (items.error) return failure(items.error)
  return saveMealLog({
    eatenOn: parsed.data.eatenOn,
    name: template.data.name,
    saveAsFavorite: false,
    items: (items.data ?? []).map((item) => ({ foodId: item.food_id, quantity: Number(item.quantity) })),
  })
}

export async function deleteMealLog(input: unknown) {
  const parsed = recordIdSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const removed = await ready.auth.supabase.from("meal_logs").delete().eq("id", parsed.data.id)
  if (removed.error) return failure(removed.error)
  return saved("Refeição excluída deste dia.")
}

export async function deleteFavorite(input: unknown) {
  const parsed = recordIdSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const removed = await ready.auth.supabase.from("meal_templates").delete().eq("id", parsed.data.id)
  if (removed.error) return failure(removed.error)
  return saved("Favorita excluída. Os dias já registrados continuam iguais.")
}

export async function addWater(input: unknown) {
  const parsed = waterSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("water_logs").insert({
    user_id: ready.auth.userId,
    logged_on: parsed.data.loggedOn,
    milliliters: parsed.data.milliliters,
  })
  if (created.error) return failure(created.error)
  return saved("Água registrada.")
}

export async function deleteWater(input: unknown) {
  const parsed = recordIdSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const removed = await ready.auth.supabase.from("water_logs").delete().eq("id", parsed.data.id)
  if (removed.error) return failure(removed.error)
  return saved("Registro de água excluído.")
}

export async function saveNutritionTarget(input: unknown) {
  const parsed = nutritionTargetSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const savedTarget = await ready.auth.supabase.from("nutrition_targets").upsert(
    {
      user_id: ready.auth.userId,
      starts_on: parsed.data.startsOn,
      kcal: amountOrNull(parsed.data.kcal),
      protein_g: amountOrNull(parsed.data.protein),
      carbs_g: amountOrNull(parsed.data.carbs),
      fat_g: amountOrNull(parsed.data.fat),
      water_ml: amountOrNull(parsed.data.waterMl),
    },
    { onConflict: "user_id,starts_on" },
  )
  if (savedTarget.error) return failure(savedTarget.error)
  return saved("Meta guardada. Ela vale a partir desta data.")
}

export async function addDietPlan(input: unknown) {
  const parsed = dietPlanSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const prescribedOn = blankToNull(parsed.data.prescribedOn)
  if (prescribedOn && !isoDateSchema.safeParse(prescribedOn).success) {
    return { ok: false as const, message: "Informe uma data válida." }
  }
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("diet_plans").insert({
    user_id: ready.auth.userId,
    title: parsed.data.title,
    prescribed_by: blankToNull(parsed.data.prescribedBy),
    prescribed_on: prescribedOn,
    notes: blankToNull(parsed.data.notes),
  })
  if (created.error) return failure(created.error)
  return saved("Plano guardado. Substituições não alteram estas linhas.")
}

export async function addDietMeal(input: unknown) {
  const parsed = dietMealSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const existing = await ready.auth.supabase
    .from("diet_meals")
    .select("position")
    .eq("plan_id", parsed.data.planId)
    .order("position", { ascending: false })
    .limit(1)
  if (existing.error) return failure(existing.error)
  const position = (existing.data?.[0]?.position ?? -1) + 1
  const created = await ready.auth.supabase.from("diet_meals").insert({
    plan_id: parsed.data.planId,
    user_id: ready.auth.userId,
    name: parsed.data.name,
    position,
  })
  if (created.error) return failure(created.error)
  return saved("Refeição adicionada ao plano.")
}

export async function addDietItem(input: unknown) {
  const parsed = dietItemSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const quantity = amountOrNull(parsed.data.quantity)
  const unit = parsed.data.unit || null
  if ((quantity === null) !== (unit === null)) {
    return { ok: false as const, message: "Informe quantidade e unidade juntas, ou deixe as duas em branco." }
  }
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const existing = await ready.auth.supabase
    .from("diet_items")
    .select("position")
    .eq("meal_id", parsed.data.mealId)
    .order("position", { ascending: false })
    .limit(1)
  if (existing.error) return failure(existing.error)
  const created = await ready.auth.supabase.from("diet_items").insert({
    meal_id: parsed.data.mealId,
    user_id: ready.auth.userId,
    food_id: blankToNull(parsed.data.foodId),
    label: parsed.data.label,
    quantity,
    unit,
    position: (existing.data?.[0]?.position ?? -1) + 1,
  })
  if (created.error) return failure(created.error)
  return saved("Item original do plano guardado.")
}

export async function archiveDietPlan(input: unknown) {
  const parsed = recordIdSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const archived = await ready.auth.supabase
    .from("diet_plans")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
  if (archived.error) return failure(archived.error)
  return saved("Plano arquivado. O texto original permanece no histórico.")
}

export async function suggestSubstitution(input: unknown) {
  const parsed = substitutionSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const item = await ready.auth.supabase
    .from("diet_items")
    .select("id, food_id, quantity")
    .eq("id", parsed.data.dietItemId)
    .maybeSingle()
  if (item.error) return failure(item.error)
  if (!item.data) return { ok: false as const, message: "Não encontrei o item do plano." }
  const suggested = await ready.auth.supabase
    .from("foods")
    .select("basis_quantity, kcal, protein_g, carbs_g, fat_g")
    .eq("id", parsed.data.suggestedFoodId)
    .maybeSingle()
  if (suggested.error) return failure(suggested.error)
  if (!suggested.data) return { ok: false as const, message: "Não encontrei o alimento sugerido." }

  const suggestedLine = scaleFood(
    {
      basisQuantity: Number(suggested.data.basis_quantity),
      kcal: Number(suggested.data.kcal),
      protein: Number(suggested.data.protein_g),
      carbs: Number(suggested.data.carbs_g),
      fat: Number(suggested.data.fat_g),
    },
    parsed.data.quantity,
  )
  if (!suggestedLine) return { ok: false as const, message: "O alimento sugerido não tem uma base válida." }

  let originalLine = null
  if (item.data.food_id && item.data.quantity) {
    const original = await ready.auth.supabase
      .from("foods")
      .select("basis_quantity, kcal, protein_g, carbs_g, fat_g")
      .eq("id", item.data.food_id)
      .maybeSingle()
    if (original.error) return failure(original.error)
    if (original.data) {
      originalLine = scaleFood(
        {
          basisQuantity: Number(original.data.basis_quantity),
          kcal: Number(original.data.kcal),
          protein: Number(original.data.protein_g),
          carbs: Number(original.data.carbs_g),
          fat: Number(original.data.fat_g),
        },
        Number(item.data.quantity),
      )
    }
  }

  const created = await ready.auth.supabase.from("food_substitutions").insert({
    user_id: ready.auth.userId,
    diet_item_id: item.data.id,
    suggested_food_id: parsed.data.suggestedFoodId,
    suggested_quantity: parsed.data.quantity,
    original_kcal: originalLine?.kcal ?? null,
    original_protein_g: originalLine?.protein ?? null,
    original_carbs_g: originalLine?.carbs ?? null,
    original_fat_g: originalLine?.fat ?? null,
    suggested_kcal: suggestedLine.kcal,
    suggested_protein_g: suggestedLine.protein,
    suggested_carbs_g: suggestedLine.carbs,
    suggested_fat_g: suggestedLine.fat,
  })
  if (created.error) return failure(created.error)
  return saved("Sugestão registrada. O plano original não foi alterado.")
}

export async function decideSubstitution(input: unknown) {
  const parsed = decisionSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const decided = await ready.auth.supabase
    .from("food_substitutions")
    .update({ status: parsed.data.status, decided_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
  if (decided.error) return failure(decided.error)
  return saved(
    parsed.data.status === "accepted"
      ? "Sugestão aceita. O item do plano continua como foi prescrito."
      : "Sugestão recusada. O plano permanece igual.",
  )
}
