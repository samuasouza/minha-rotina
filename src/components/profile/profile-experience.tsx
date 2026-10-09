"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  deferOnboarding,
  saveGoalsStep,
  saveHealthStep,
  saveMeasuresStep,
  savePersonalStep,
  saveRoutineStep,
} from "@/lib/actions/anamnesis"
import { activityLabels, goalKinds, goalLabels, periodLabels } from "@/lib/domain/anamnesis"
import type { ProfileReady } from "@/lib/data/anamnesis"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const stepTitles = ["Você", "Objetivos", "Medidas", "Rotina", "Cuidados"]

export function ProfileExperience({
  data,
  initialStep,
  startWithSummary,
}: {
  data: ProfileReady
  initialStep: number
  startWithSummary: boolean
}) {
  const router = useRouter()
  const [step, setStep] = useState(initialStep)
  const [summary, setSummary] = useState(startWithSummary)
  const [pending, startTransition] = useTransition()
  const unitWeight = data.measurementSystem === "imperial" ? "lb" : "kg"
  const unitLength = data.measurementSystem === "imperial" ? "in" : "cm"

  function run(action: () => Promise<{ ok: boolean; message: string }>, next?: number) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      if (next === 0) {
        router.push("/meu-dia")
        return
      }
      if (next === 6) setSummary(true)
      else if (typeof next === "number") setStep(next)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-4xl">Meu Perfil</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Estas respostas ajudam a organizar alimentação, treino e descanso. O questionário não faz diagnóstico e os campos sensíveis podem ficar em branco.
        </p>
      </div>

      {summary ? (
        <ProfileSummary data={data} onEdit={(next) => { setSummary(false); setStep(next) }} />
      ) : (
        <>
          <div>
            <p className="text-sm text-muted-foreground">Etapa {step} de 5 · {stepTitles[step - 1]}</p>
            <div
              className="mt-2 h-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={5}
              aria-valuenow={step}
              aria-label="Progresso da anamnese"
            >
              <div className="h-full bg-primary" style={{ width: `${(step / 5) * 100}%` }} />
            </div>
          </div>

          <form hidden={step !== 1} className="grid gap-4 rounded-2xl border border-border bg-card px-5 py-4" onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() => savePersonalStep({
              displayName: String(form.get("displayName") ?? ""),
              birthDate: String(form.get("birthDate") ?? ""),
              height: String(form.get("height") ?? ""),
              weight: String(form.get("weight") ?? ""),
              sex: String(form.get("sex") ?? ""),
              measurementSystem: String(form.get("measurementSystem") ?? "metric"),
            }), 2)
          }}>
            <h2 className="text-xl">Dados pessoais e físicos</h2>
            <Field label="Como podemos te chamar" id="display-name">
              <Input id="display-name" name="displayName" defaultValue={data.displayName} required />
            </Field>
            <Field label="Data de nascimento" id="birth-date">
              <Input id="birth-date" name="birthDate" type="date" defaultValue={data.birthDate ?? ""} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`Altura (${unitLength})`} id="height">
                <Input id="height" name="height" inputMode="decimal" defaultValue={data.heightInput ?? ""} />
              </Field>
              <Field label={`Peso atual (${unitWeight})`} id="weight">
                <Input id="weight" name="weight" inputMode="decimal" defaultValue={data.weightInput ?? ""} />
              </Field>
            </div>
            <Field label="Sexo biológico" id="sex">
              <select id="sex" name="sex" defaultValue={data.sex} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
                <option value="">Não informar</option>
                <option value="female">Feminino</option>
                <option value="male">Masculino</option>
              </select>
            </Field>
            <p className="text-xs leading-5 text-muted-foreground">Opcional. A estimativa de cardio usa o peso datado e não usa este campo.</p>
            <Field label="Unidade preferida" id="units">
              <select id="units" name="measurementSystem" defaultValue={data.measurementSystem} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
                <option value="metric">Quilos e centímetros</option>
                <option value="imperial">Libras e polegadas</option>
              </select>
            </Field>
            <p className="text-xs leading-5 text-muted-foreground">O histórico guarda peso em quilos e as medidas principais em centímetros.</p>
            <StepActions pending={pending} onBack={null} onDefer={() => run(() => deferOnboarding(), 0)} />
          </form>

          <form hidden={step !== 2} className="grid gap-4 rounded-2xl border border-border bg-card px-5 py-4" onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() => saveGoalsStep({
              selected: form.getAll("goal").map(String),
              primary: String(form.get("primary") ?? ""),
              custom: [String(form.get("custom1") ?? ""), String(form.get("custom2") ?? ""), String(form.get("custom3") ?? "")],
            }), 3)
          }}>
            <h2 className="text-xl">Objetivos</h2>
            <fieldset className="grid gap-2">
              <legend className="text-sm">Pode marcar mais de um</legend>
              {goalKinds.filter((kind) => kind !== "other").map((kind) => (
                <label key={kind} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="goal" value={kind} defaultChecked={data.goals.some((goal) => goal.kind === kind)} />
                  {goalLabels[kind]}
                </label>
              ))}
            </fieldset>
            <Field label="Objetivo principal" id="primary-goal">
              <select id="primary-goal" name="primary" defaultValue={data.goals.find((goal) => goal.isPrimary)?.kind ?? ""} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
                <option value="">O primeiro marcado</option>
                {goalKinds.filter((kind) => kind !== "other").map((kind) => (
                  <option key={kind} value={kind}>{goalLabels[kind]}</option>
                ))}
                <option value="other">Um objetivo personalizado</option>
              </select>
            </Field>
            <Field label="Outros objetivos" id="custom-goal">
              <Input id="custom-goal" name="custom1" defaultValue={data.goals.filter((goal) => goal.kind === "other")[0]?.label ?? ""} placeholder="Opcional" />
            </Field>
            <Input name="custom2" aria-label="Segundo objetivo personalizado" defaultValue={data.goals.filter((goal) => goal.kind === "other")[1]?.label ?? ""} placeholder="Opcional" />
            <Input name="custom3" aria-label="Terceiro objetivo personalizado" defaultValue={data.goals.filter((goal) => goal.kind === "other")[2]?.label ?? ""} placeholder="Opcional" />
            <StepActions pending={pending} onBack={() => setStep(1)} onDefer={() => run(() => deferOnboarding(), 0)} />
          </form>

          <form hidden={step !== 3} className="grid gap-4 rounded-2xl border border-border bg-card px-5 py-4" onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() => saveMeasuresStep({
              waist: String(form.get("waist") ?? ""),
              abdomen: String(form.get("abdomen") ?? ""),
              hip: String(form.get("hip") ?? ""),
              chest: String(form.get("chest") ?? ""),
              arm: String(form.get("arm") ?? ""),
              thigh: String(form.get("thigh") ?? ""),
              calf: String(form.get("calf") ?? ""),
              extraName: String(form.get("extraName") ?? ""),
              extraValue: String(form.get("extraValue") ?? ""),
              extraUnit: String(form.get("extraUnit") ?? ""),
            }), 4)
          }}>
            <h2 className="text-xl">Medidas corporais</h2>
            <p className="text-sm leading-6 text-muted-foreground">Tudo é opcional. Um valor informado hoje entra no histórico de Meu Corpo.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.measures.map((measure) => (
                <Field key={measure.key} label={`${measure.name} (${unitLength})`} id={measure.key}>
                  <Input id={measure.key} name={measure.key} inputMode="decimal" defaultValue={measure.value ?? ""} />
                </Field>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Outra medida" id="extra-name"><Input id="extra-name" name="extraName" /></Field>
              <Field label="Valor" id="extra-value"><Input id="extra-value" name="extraValue" inputMode="decimal" /></Field>
              <Field label="Unidade" id="extra-unit"><Input id="extra-unit" name="extraUnit" placeholder={unitLength} /></Field>
            </div>
            <StepActions pending={pending} onBack={() => setStep(2)} onDefer={() => run(() => deferOnboarding(), 0)} />
          </form>

          <form hidden={step !== 4} className="grid gap-4 rounded-2xl border border-border bg-card px-5 py-4" onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() => saveRoutineStep({
              strengthSessions: String(form.get("strength") ?? ""),
              cardioSessions: String(form.get("cardio") ?? ""),
              activityLevel: String(form.get("activity") ?? ""),
              typicalSleepHours: String(form.get("sleep") ?? ""),
              weeklyHours: String(form.get("hours") ?? ""),
              preferredPeriod: String(form.get("period") ?? ""),
            }), 5)
          }}>
            <h2 className="text-xl">Rotina</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Musculação, dias por semana" id="strength"><Input id="strength" name="strength" inputMode="numeric" defaultValue={data.strengthSessions ?? ""} /></Field>
              <Field label="Cardio, dias por semana" id="cardio-days"><Input id="cardio-days" name="cardio" inputMode="numeric" defaultValue={data.cardioSessions ?? ""} /></Field>
              <Field label="Sono habitual, horas" id="sleep-hours"><Input id="sleep-hours" name="sleep" inputMode="decimal" defaultValue={data.typicalSleepHours ?? ""} /></Field>
              <Field label="Horas disponíveis para treinar na semana" id="week-hours"><Input id="week-hours" name="hours" inputMode="decimal" defaultValue={data.weeklyHours ?? ""} /></Field>
            </div>
            <Field label="Nível habitual de atividade" id="activity">
              <select id="activity" name="activity" defaultValue={data.activityLevel} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
                <option value="">Não informar</option>
                {Object.entries(activityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Horário em que costuma treinar" id="period">
              <select id="period" name="period" defaultValue={data.preferredPeriod} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
                <option value="">Não informar</option>
                {Object.entries(periodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <StepActions pending={pending} onBack={() => setStep(3)} onDefer={() => run(() => deferOnboarding(), 0)} />
          </form>

          <form hidden={step !== 5} className="grid gap-4 rounded-2xl border border-border bg-card px-5 py-4" onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() => saveHealthStep({
              injuries: String(form.get("injuries") ?? ""),
              dietaryRestrictions: String(form.get("restrictions") ?? ""),
              foodAllergies: String(form.get("allergies") ?? ""),
              foodPreferences: String(form.get("preferences") ?? ""),
              nutritionist: String(form.get("nutritionist") ?? ""),
              notes: String(form.get("notes") ?? ""),
              trackSleep: form.get("trackSleep") === "on",
              trackEnergy: form.get("trackEnergy") === "on",
              trackMood: form.get("trackMood") === "on",
              trackCycle: form.get("trackCycle") === "on",
              complete: true,
            }), 6)
          }}>
            <h2 className="text-xl">Saúde e preferências</h2>
            <p className="text-sm leading-6 text-muted-foreground">Conte só o que fizer diferença para treinar e comer. Detalhe clínico não é necessário.</p>
            <Field label="Lesões ou limitações para exercícios" id="injuries"><Textarea id="injuries" name="injuries" defaultValue={data.injuries} /></Field>
            <Field label="Restrições alimentares" id="restrictions"><Textarea id="restrictions" name="restrictions" defaultValue={data.dietaryRestrictions} /></Field>
            <Field label="Alergias alimentares" id="allergies"><Textarea id="allergies" name="allergies" defaultValue={data.foodAllergies} /></Field>
            <Field label="Preferências alimentares" id="preferences"><Textarea id="preferences" name="preferences" defaultValue={data.foodPreferences} /></Field>
            <Field label="Acompanhamento com nutricionista" id="nutritionist">
              <select id="nutritionist" name="nutritionist" defaultValue={data.nutritionist} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
                <option value="">Não informar</option>
                <option value="yes">Sim</option>
                <option value="no">Não</option>
              </select>
            </Field>
            <fieldset className="grid gap-2">
              <legend className="text-sm">O que quer acompanhar no bem-estar</legend>
              <Check name="trackSleep" label="Sono" defaultChecked={data.trackSleep} />
              <Check name="trackEnergy" label="Energia" defaultChecked={data.trackEnergy} />
              <Check name="trackMood" label="Humor" defaultChecked={data.trackMood} />
              <Check name="trackCycle" label="Ciclo menstrual" defaultChecked={data.trackCycle} />
            </fieldset>
            <Field label="Observações" id="profile-notes"><Textarea id="profile-notes" name="notes" defaultValue={data.notes} /></Field>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(4)}>Voltar</Button>
              <Button type="submit" disabled={pending}>{pending ? "Aguarde..." : "Concluir"}</Button>
              <Button type="button" variant="ghost" onClick={() => run(() => deferOnboarding(), 0)}>Continuar depois</Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

function ProfileSummary({ data, onEdit }: { data: ProfileReady; onEdit: (step: number) => void }) {
  const primary = data.goals.find((goal) => goal.isPrimary)
  return (
    <div className="grid gap-4">
      <Summary title="Dados pessoais" step={1} onEdit={onEdit}>
        <p>{data.displayName}</p>
        <p>{data.birthDate ? `Nascimento ${data.birthDate}` : "Nascimento não informado"}</p>
        <p>{data.heightInput ? `Altura ${data.heightInput}` : "Altura não informada"} · {data.weightInput ? `peso de hoje ${data.weightInput}` : "peso de hoje não informado"}</p>
      </Summary>
      <Summary title="Objetivos" step={2} onEdit={onEdit}>
        <p>{primary ? `Principal: ${primary.label}` : "Nenhum objetivo marcado"}</p>
        <p>{data.goals.map((goal) => goal.label).join(", ")}</p>
      </Summary>
      <Summary title="Informações físicas" step={3} onEdit={onEdit}>
        <p>{data.baselineWeight ? `Linha de base ${data.baselineWeight.kg} kg em ${data.baselineWeight.date}` : "Ainda sem peso no histórico"}</p>
        <p>{data.measures.filter((item) => item.value !== null).map((item) => `${item.name} ${item.value}`).join(" · ") || "Sem medidas neste dia"}</p>
      </Summary>
      <Summary title="Rotina" step={4} onEdit={onEdit}>
        <p>Musculação {data.strengthSessions ?? "—"} dias · cardio {data.cardioSessions ?? "—"} dias</p>
        <p>Sono habitual {data.typicalSleepHours ?? "—"} h · disponibilidade {data.weeklyHours ?? "—"} h</p>
      </Summary>
      <Summary title="Restrições e preferências" step={5} onEdit={onEdit}>
        <p>{data.dietaryRestrictions || "Sem restrição informada"}</p>
        <p>{data.foodAllergies || "Sem alergia informada"}</p>
        <p>{data.injuries || "Sem limitação informada"}</p>
      </Summary>
      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Configurações da conta</h2>
        <p className="mt-2 text-sm text-muted-foreground">Fuso, e-mail e saída da conta ficam nas configurações.</p>
        <Link href="/configuracoes" className="mt-3 inline-block text-sm underline-offset-4 hover:underline">Abrir configurações</Link>
      </section>
    </div>
  )
}

function Summary({ title, step, onEdit, children }: { title: string; step: number; onEdit: (step: number) => void; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl">{title}</h2>
        <button type="button" className="text-sm underline-offset-4 hover:underline" onClick={() => onEdit(step)}>Editar</button>
      </div>
      <div className="mt-2 grid gap-1 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  )
}

function StepActions({ pending, onBack, onDefer }: { pending: boolean; onBack: (() => void) | null; onDefer: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {onBack ? <Button type="button" variant="outline" onClick={onBack}>Voltar</Button> : null}
      <Button type="submit" disabled={pending}>{pending ? "Aguarde..." : "Continuar"}</Button>
      <Button type="button" variant="ghost" onClick={onDefer}>Continuar depois</Button>
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

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  )
}
