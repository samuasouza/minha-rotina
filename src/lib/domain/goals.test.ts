import { describe, expect, it } from "vitest"
import { emptyFacts, type ActivityFacts } from "@/lib/domain/activity"
import {
  bodyWeightRatio,
  goalProgress,
  periodWindow,
  reminderIsDue,
  reportBounds,
  snoozeUntil,
  type GoalDefinition,
} from "@/lib/domain/goals"
import { cardioReport, nutritionReport, studyReport, trainingReport, weekPulse, wellbeingReport } from "@/lib/domain/reports"

const anchor = "2026-10-09"

function goal(partial: Partial<GoalDefinition> & Pick<GoalDefinition, "measure">): GoalDefinition {
  return {
    id: "goal-1",
    target: 5,
    period: "weekly",
    customDays: null,
    startsOn: "2026-10-01",
    endsOn: null,
    status: "active",
    ...partial,
  }
}

describe("janelas de meta", () => {
  it("abre a semana na segunda e o mês no primeiro dia", () => {
    expect(periodWindow({ period: "weekly", anchor, startsOn: "2026-01-01", endsOn: null, customDays: null })).toEqual({
      from: "2026-10-05",
      to: "2026-10-11",
    })
    expect(periodWindow({ period: "monthly", anchor, startsOn: "2026-01-01", endsOn: null, customDays: null })).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    })
    expect(periodWindow({ period: "weekly", anchor: "2026-10-01", startsOn: "2026-01-01", endsOn: null, customDays: null })).toEqual({
      from: "2026-09-28",
      to: "2026-10-04",
    })
  })

  it("calcula o período personalizado e recorta nas datas da meta", () => {
    expect(periodWindow({ period: "custom", anchor, startsOn: "2026-01-01", endsOn: null, customDays: 10 })).toEqual({
      from: "2026-09-30",
      to: "2026-10-09",
    })
    expect(periodWindow({ period: "weekly", anchor, startsOn: "2026-10-07", endsOn: "2026-10-10", customDays: null })).toEqual({
      from: "2026-10-07",
      to: "2026-10-10",
    })
    expect(periodWindow({ period: "weekly", anchor, startsOn: "2026-10-20", endsOn: null, customDays: null })).toBeNull()
    expect(periodWindow({ period: "custom", anchor, startsOn: "2026-01-01", endsOn: null, customDays: null })).toBeNull()
  })

  it("monta o recorte de 7 dias e o período anterior", () => {
    expect(reportBounds("7", anchor)).toEqual({
      from: "2026-10-03",
      to: "2026-10-09",
      previousFrom: "2026-09-26",
      previousTo: "2026-10-02",
    })
    expect(reportBounds("custom", anchor, "2026-10-09", "2026-10-01")).toBeNull()
  })
})

describe("progresso automático", () => {
  it("soma lançamentos manuais e água e deixa sono sem registro em branco", () => {
    const facts: ActivityFacts = {
      ...emptyFacts(),
      checkins: [
        { goalId: "goal-1", date: "2026-10-06", amount: 2 },
        { goalId: "goal-1", date: "2026-10-08", amount: 1 },
        { goalId: "goal-1", date: "2026-09-01", amount: 9 },
      ],
      water: [
        { date: "2026-10-06", ml: 500 },
        { date: "2026-10-07", ml: 1000 },
      ],
    }

    expect(goalProgress(goal({ measure: "manual", target: 5 }), facts, anchor)).toMatchObject({ amount: 3, ratio: 0.6, samples: 2 })
    expect(goalProgress(goal({ id: "water", measure: "water_ml", target: 2000 }), facts, anchor)).toMatchObject({
      amount: 1500,
      ratio: 0.75,
    })
    expect(goalProgress(goal({ measure: "sleep_hours", target: 8 }), facts, anchor).amount).toBeNull()
  })

  it("mede o peso a partir da referência anterior ao início", () => {
    const facts: ActivityFacts = {
      ...emptyFacts(),
      weightBefore: { date: "2026-09-20", kg: 80 },
      weights: [{ date: "2026-10-09", kg: 78 }],
    }
    const withBaseline = goalProgress(goal({ measure: "body_weight", target: 75, startsOn: "2026-10-01" }), facts, anchor)
    expect(withBaseline.amount).toBe(78)
    expect(withBaseline.ratio).toBe(0.4)
    expect(bodyWeightRatio(80, 78, 75)).toBe(0.4)

    const withoutBaseline = goalProgress(
      goal({ measure: "body_weight", target: 75, startsOn: "2026-10-08" }),
      { ...emptyFacts(), weights: [{ date: "2026-10-09", kg: 78 }] },
      anchor,
    )
    expect(withoutBaseline.amount).toBe(78)
    expect(withoutBaseline.ratio).toBeNull()
  })
})

describe("lembretes", () => {
  const now = new Date("2026-10-09T14:00:00.000Z")

  it("respeita horário, dia e adiamento", () => {
    const base = { enabled: true, weekdays: [5], remindAt: "10:00", snoozedUntil: null, now, timeZone: "America/Sao_Paulo" }
    expect(reminderIsDue(base)).toBe(true)
    expect(reminderIsDue({ ...base, remindAt: "12:00" })).toBe(false)
    expect(reminderIsDue({ ...base, weekdays: [1] })).toBe(false)
    expect(reminderIsDue({ ...base, enabled: false })).toBe(false)
    expect(reminderIsDue({ ...base, snoozedUntil: "2026-10-09T15:00:00.000Z" })).toBe(false)
    expect(reminderIsDue({ ...base, snoozedUntil: "2026-10-09T13:00:00.000Z" })).toBe(true)
  })

  it("adia por duas horas ou para o horário de amanhã", () => {
    expect(snoozeUntil("later", now, "America/Sao_Paulo", "10:00")).toBe("2026-10-09T16:00:00.000Z")
    expect(snoozeUntil("tomorrow", now, "America/Sao_Paulo", "10:00")).toBe("2026-10-10T13:00:00.000Z")
  })
})

describe("relatórios", () => {
  it("separa volume, médias e estimativas sem preencher dias vazios", () => {
    const facts: ActivityFacts = {
      ...emptyFacts(),
      workoutDates: ["2026-10-06", "2026-10-08"],
      sets: [
        { date: "2026-10-06", exerciseName: "Supino", reps: 10, loadKg: 20, completed: true },
        { date: "2026-10-08", exerciseName: "Supino", reps: 8, loadKg: 22.5, completed: true },
      ],
      meals: [
        { date: "2026-10-06", kcal: 1800, protein: 100, carbs: 150, fat: 50 },
        { date: "2026-10-08", kcal: 2200, protein: 120, carbs: 180, fat: 60 },
      ],
      cardio: [
        { date: "2026-10-06", minutes: 30, distanceKm: 3, estimateKcal: 200, informedKcal: null },
        { date: "2026-10-08", minutes: 20, distanceKm: null, estimateKcal: null, informedKcal: 150 },
      ],
      study: [
        { date: "2026-10-06", minutes: 40 },
        { date: "2026-10-07", minutes: null },
      ],
      wellbeing: [
        { date: "2026-10-06", sleep: 7, energy: 4, mood: null },
        { date: "2026-10-08", sleep: 8, energy: null, mood: 3 },
      ],
    }
    const bounds = reportBounds("7", anchor)
    expect(bounds).not.toBeNull()
    if (!bounds) return

    const training = trainingReport(facts, bounds.from, bounds.to, bounds.previousFrom, bounds.previousTo)
    expect(training.sessions).toBe(2)
    expect(training.volume).toBe(380)
    expect(training.loads).toEqual([
      { name: "Supino", firstDate: "2026-10-06", firstLoad: 20, lastDate: "2026-10-08", lastLoad: 22.5 },
    ])

    const nutrition = nutritionReport(facts, bounds.from, bounds.to, bounds.previousFrom, bounds.previousTo)
    expect(nutrition.mealDays).toBe(2)
    expect(nutrition.averages?.kcal).toBe(2000)
    expect(nutrition.totals?.protein).toBe(220)

    const cardio = cardioReport(facts, bounds.from, bounds.to, bounds.previousFrom, bounds.previousTo)
    expect(cardio.minutes).toBe(50)
    expect(cardio.distanceKm).toBe(3)
    expect(cardio.distanceSamples).toBe(1)
    expect(cardio.estimateKcal).toBe(200)
    expect(cardio.informedKcal).toBe(150)

    const study = studyReport(facts, bounds.from, bounds.to)
    expect(study.sessions).toBe(2)
    expect(study.minutes).toBe(40)

    const wellbeing = wellbeingReport(facts, bounds.from, bounds.to)
    expect(wellbeing.sleepAverage).toBe(7.5)
    expect(wellbeing.sleepSamples).toBe(2)
    expect(wellbeing.moodSamples).toBe(1)
    expect(wellbeing.energySamples).toBe(1)
  })

  it("omite o resumo semanal quando não há registros", () => {
    expect(weekPulse(emptyFacts(), [], new Map(), anchor)).toEqual([])
  })
})
