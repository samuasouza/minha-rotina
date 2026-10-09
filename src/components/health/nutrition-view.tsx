"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  addDietItem,
  addDietMeal,
  addDietPlan,
  addFood,
  addWater,
  archiveDietPlan,
  decideSubstitution,
  deleteFavorite,
  deleteFood,
  deleteMealLog,
  deleteWater,
  logFavoriteMeal,
  saveMealLog,
  saveNutritionTarget,
  suggestSubstitution,
} from "@/lib/actions/nutrition"
import { macroDifference } from "@/lib/domain/nutrition"
import type { NutritionReady } from "@/lib/data/health"
import { DateNav } from "@/components/health/date-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function NutritionView({ data }: { data: NutritionReady }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [lines, setLines] = useState<{ foodId: string; quantity: string }[]>([])

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setLines([])
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Alimentação</h1>
        <DateNav base="/alimentacao" date={data.date} today={data.today} />
      </div>

      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Resumo do dia</h2>
        {data.meals.length === 0 && data.water.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum consumo registrado neste dia.</p>
        ) : null}
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {data.comparison.map((item) => (
            <li key={item.key} className="text-sm leading-6">
              <span className="text-foreground">{item.label}: </span>
              <span className="text-muted-foreground">
                {item.key === "waterMl" ? `${item.consumed} ml` : item.consumed}
                {item.target === null ? " · sem meta" : ` · meta ${item.target} · diferença ${item.difference}`}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Os números saem dos alimentos que você cadastrou. Nada é completado por estimativa externa.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Refeição</h2>
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() =>
              saveMealLog({
                eatenOn: data.date,
                name: String(form.get("name") ?? ""),
                saveAsFavorite: form.get("favorite") === "on",
                items: lines.map((line) => ({ foodId: line.foodId, quantity: line.quantity })),
              }),
            )
          }}
        >
          <Field label="Nome" id="meal-name">
            <Input id="meal-name" name="name" required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
            <Field label="Alimento" id="meal-food">
              <select id="meal-food" name="foodId" className="h-10 rounded-xl border border-border bg-background px-3 text-sm" defaultValue="">
                <option value="">Escolha</option>
                {data.foods.map((food) => (
                  <option key={food.id} value={food.id}>
                    {food.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantidade" id="meal-qty">
              <Input id="meal-qty" name="quantity" inputMode="decimal" />
            </Field>
            <Button
              type="button"
              variant="outline"
              className="self-end"
              onClick={(event) => {
                const form = event.currentTarget.form
                if (!form) return
                const foodId = String(new FormData(form).get("foodId") ?? "")
                const quantity = String(new FormData(form).get("quantity") ?? "")
                if (!foodId || !quantity) return
                setLines((current) => [...current, { foodId, quantity }])
              }}
            >
              Incluir
            </Button>
          </div>
          <ul className="text-sm text-muted-foreground">
            {lines.map((line, index) => (
              <li key={`${line.foodId}-${index}`}>
                {data.foods.find((food) => food.id === line.foodId)?.name} · {line.quantity}
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="favorite" />
            Guardar como favorita
          </label>
          <Button type="submit" disabled={pending || data.foods.length === 0}>
            {pending ? "Aguarde..." : "Registrar refeição"}
          </Button>
        </form>
        <ul className="mt-4 grid gap-3">
          {data.meals.map((meal) => (
            <li key={meal.id} className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <strong>{meal.name}</strong>
                <button type="button" className="underline-offset-4 hover:underline" onClick={() => run(() => deleteMealLog({ id: meal.id }))}>
                  Excluir
                </button>
              </div>
              {meal.items.map((item, index) => (
                <p key={index} className="text-muted-foreground">
                  {item.name} · {item.quantity} {item.unit} · {item.kcal} kcal · {item.source}
                </p>
              ))}
            </li>
          ))}
        </ul>
        {data.favorites.length > 0 ? (
          <div className="mt-4">
            <h3 className="text-sm">Favoritas</h3>
            <ul className="mt-2 grid gap-2">
              {data.favorites.map((favorite) => (
                <li key={favorite.id} className="flex gap-3 text-sm">
                  <button type="button" className="underline-offset-4 hover:underline" onClick={() => run(() => logFavoriteMeal({ id: favorite.id, eatenOn: data.date }))}>
                    {favorite.name}
                  </button>
                  <button type="button" className="text-muted-foreground underline-offset-4 hover:underline" onClick={() => run(() => deleteFavorite({ id: favorite.id }))}>
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Água</h2>
        <p className="mt-2 text-sm text-muted-foreground">{data.water.reduce((total, row) => total + row.milliliters, 0)} ml neste dia</p>
        <form
          className="mt-3 flex gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const milliliters = String(new FormData(event.currentTarget).get("ml") ?? "")
            run(() => addWater({ loggedOn: data.date, milliliters }))
          }}
        >
          <Input name="ml" inputMode="numeric" placeholder="ml" aria-label="Mililitros" />
          <Button type="submit" disabled={pending}>Adicionar</Button>
        </form>
        <ul className="mt-3 text-sm">
          {data.water.map((row) => (
            <li key={row.id} className="flex justify-between">
              {row.milliliters} ml
              <button type="button" onClick={() => run(() => deleteWater({ id: row.id }))}>Excluir</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Alimentos</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Informe calorias e macros da quantidade de referência. A fonte fica registrada com o alimento.
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() =>
              addFood({
                name: String(form.get("name") ?? ""),
                basisQuantity: String(form.get("basis") ?? ""),
                basisUnit: String(form.get("unit") ?? "g"),
                kcal: String(form.get("kcal") ?? ""),
                protein: String(form.get("protein") ?? ""),
                carbs: String(form.get("carbs") ?? ""),
                fat: String(form.get("fat") ?? ""),
                sourceNote: String(form.get("source") ?? ""),
              }),
            )
            event.currentTarget.reset()
          }}
        >
          <Field label="Nome" id="food-name"><Input id="food-name" name="name" required /></Field>
          <Field label="Fonte do valor" id="food-source"><Input id="food-source" name="source" required /></Field>
          <Field label="Quantidade de referência" id="food-basis"><Input id="food-basis" name="basis" inputMode="decimal" required /></Field>
          <Field label="Unidade" id="food-unit">
            <select id="food-unit" name="unit" className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="unit">unidade</option>
            </select>
          </Field>
          <Field label="Calorias" id="food-kcal"><Input id="food-kcal" name="kcal" inputMode="decimal" required /></Field>
          <Field label="Proteínas (g)" id="food-protein"><Input id="food-protein" name="protein" inputMode="decimal" required /></Field>
          <Field label="Carboidratos (g)" id="food-carbs"><Input id="food-carbs" name="carbs" inputMode="decimal" required /></Field>
          <Field label="Gorduras (g)" id="food-fat"><Input id="food-fat" name="fat" inputMode="decimal" required /></Field>
          <Button type="submit" disabled={pending} className="sm:col-span-2">Cadastrar alimento</Button>
        </form>
        <ul className="mt-4 grid gap-2 text-sm">
          {data.foods.map((food) => (
            <li key={food.id} className="flex justify-between gap-3">
              <span>
                {food.name} · {food.kcal} kcal / {food.basisQuantity} {food.unit} · {food.source}
              </span>
              <button type="button" onClick={() => run(() => deleteFood({ id: food.id }))}>Excluir</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Metas</h2>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() =>
              saveNutritionTarget({
                startsOn: data.date,
                kcal: String(form.get("kcal") ?? ""),
                protein: String(form.get("protein") ?? ""),
                carbs: String(form.get("carbs") ?? ""),
                fat: String(form.get("fat") ?? ""),
                waterMl: String(form.get("water") ?? ""),
              }),
            )
          }}
        >
          <Field label="Calorias" id="goal-kcal"><Input id="goal-kcal" name="kcal" inputMode="decimal" /></Field>
          <Field label="Proteínas" id="goal-protein"><Input id="goal-protein" name="protein" inputMode="decimal" /></Field>
          <Field label="Carboidratos" id="goal-carbs"><Input id="goal-carbs" name="carbs" inputMode="decimal" /></Field>
          <Field label="Gorduras" id="goal-fat"><Input id="goal-fat" name="fat" inputMode="decimal" /></Field>
          <Field label="Água (ml)" id="goal-water"><Input id="goal-water" name="water" inputMode="numeric" /></Field>
          <Button type="submit" disabled={pending}>Guardar meta</Button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Plano da nutricionista</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          O plano original fica preservado. Aceitar uma substituição não troca o item prescrito.
        </p>
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() =>
              addDietPlan({
                title: String(form.get("title") ?? ""),
                prescribedBy: String(form.get("author") ?? ""),
                prescribedOn: String(form.get("prescribedOn") ?? ""),
                notes: String(form.get("notes") ?? ""),
              }),
            )
          }}
        >
          <Field label="Nome do plano" id="plan-title"><Input id="plan-title" name="title" required /></Field>
          <Field label="Prescrito por" id="plan-author"><Input id="plan-author" name="author" /></Field>
          <Field label="Data" id="plan-date"><Input id="plan-date" name="prescribedOn" type="date" /></Field>
          <Field label="Observações" id="plan-notes"><Textarea id="plan-notes" name="notes" /></Field>
          <Button type="submit" disabled={pending}>Guardar plano</Button>
        </form>
        {data.plans.map((plan) => (
          <article key={plan.id} className="mt-6 border-t border-border pt-4">
            <div className="flex justify-between gap-3">
              <h3 className="text-lg">{plan.title}</h3>
              <button type="button" className="text-sm underline-offset-4 hover:underline" onClick={() => run(() => archiveDietPlan({ id: plan.id }))}>
                Arquivar
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {plan.prescribedBy ? `Por ${plan.prescribedBy}` : "Sem autor informado"}
              {plan.prescribedOn ? ` · ${plan.prescribedOn}` : ""}
            </p>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                const name = String(new FormData(event.currentTarget).get("name") ?? "")
                run(() => addDietMeal({ planId: plan.id, name }))
              }}
            >
              <Input name="name" placeholder="Nome da refeição" aria-label="Nome da refeição" />
              <Button type="submit" variant="outline">Adicionar</Button>
            </form>
            {plan.meals.map((meal) => (
              <div key={meal.id} className="mt-4">
                <h4 className="text-sm">{meal.name}</h4>
                <ul className="mt-2 grid gap-2 text-sm">
                  {meal.items.map((item) => {
                    const suggestions = data.substitutions.filter((row) => row.itemId === item.id)
                    return (
                      <li key={item.id}>
                        {item.label}
                        {item.quantity ? ` · ${item.quantity} ${item.unit}` : ""}
                        {suggestions.map((suggestion) => {
                          const difference = macroDifference(suggestion.original, suggestion.suggested)
                          const statusLabel = suggestion.status === "accepted" ? "aceita" : suggestion.status === "rejected" ? "recusada" : "pendente"
                          return (
                            <p key={suggestion.id} className="mt-1 text-muted-foreground">
                              Sugestão {statusLabel}: quantidade {suggestion.suggestedQuantity} · {suggestion.suggested.kcal} kcal, {suggestion.suggested.protein} g de proteína, {suggestion.suggested.carbs} g de carboidrato, {suggestion.suggested.fat} g de gordura
                              {difference
                                ? ` · diferença ${difference.kcal} kcal, ${difference.protein} g, ${difference.carbs} g e ${difference.fat} g`
                                : " · original sem valores cadastrados"}
                              {suggestion.status === "pending" ? (
                                <>
                                  {" "}
                                  <button type="button" onClick={() => run(() => decideSubstitution({ id: suggestion.id, status: "accepted" }))}>Aceitar</button>
                                  {" "}
                                  <button type="button" onClick={() => run(() => decideSubstitution({ id: suggestion.id, status: "rejected" }))}>Recusar</button>
                                </>
                              ) : null}
                            </p>
                          )
                        })}
                        <form
                          className="mt-2 flex flex-wrap gap-2"
                          onSubmit={(event) => {
                            event.preventDefault()
                            const form = new FormData(event.currentTarget)
                            run(() =>
                              suggestSubstitution({
                                dietItemId: item.id,
                                suggestedFoodId: String(form.get("foodId") ?? ""),
                                quantity: String(form.get("quantity") ?? ""),
                              }),
                            )
                          }}
                        >
                          <select name="foodId" className="h-10 rounded-xl border border-border bg-background px-3 text-sm" aria-label="Alimento sugerido">
                            {data.foods.map((food) => (
                              <option key={food.id} value={food.id}>{food.name}</option>
                            ))}
                          </select>
                          <Input name="quantity" inputMode="decimal" className="w-24" aria-label="Quantidade sugerida" />
                          <Button type="submit" variant="outline">Sugerir troca</Button>
                        </form>
                      </li>
                    )
                  })}
                </ul>
                <form
                  className="mt-3 grid gap-2 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const form = new FormData(event.currentTarget)
                    run(() =>
                      addDietItem({
                        mealId: meal.id,
                        label: String(form.get("label") ?? ""),
                        foodId: String(form.get("foodId") ?? ""),
                        quantity: String(form.get("quantity") ?? ""),
                        unit: String(form.get("unit") ?? ""),
                      }),
                    )
                  }}
                >
                  <Input name="label" placeholder="Item prescrito" aria-label="Item prescrito" required />
                  <select name="foodId" className="h-10 rounded-xl border border-border bg-background px-3 text-sm" defaultValue="">
                    <option value="">Sem alimento cadastrado</option>
                    {data.foods.map((food) => (
                      <option key={food.id} value={food.id}>{food.name}</option>
                    ))}
                  </select>
                  <Input name="quantity" inputMode="decimal" placeholder="Quantidade" aria-label="Quantidade" />
                  <select name="unit" className="h-10 rounded-xl border border-border bg-background px-3 text-sm" defaultValue="">
                    <option value="">Unidade</option>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="unit">unidade</option>
                  </select>
                  <Button type="submit" variant="outline">Incluir no plano</Button>
                </form>
              </div>
            ))}
          </article>
        ))}
        {data.archivedPlans.length > 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Histórico arquivado: {data.archivedPlans.map((plan) => plan.title).join(", ")}
          </p>
        ) : null}
      </section>
    </div>
  )
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
