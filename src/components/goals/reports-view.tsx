import type { ReactNode } from "react"
import Link from "next/link"
import { formatQuantity } from "@/lib/domain/goals"
import { formatShortDate } from "@/lib/domain/dates"
import { bodyReport, cardioReport, devotionalReport, nutritionReport, studyReport, trainingReport, wellbeingReport } from "@/lib/domain/reports"
import type { GoalCenter } from "@/lib/data/goals"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TrendChart } from "@/components/goals/trend-chart"

const presets = [
  ["7", "7 dias"],
  ["30", "30 dias"],
  ["90", "90 dias"],
] as const

export function ReportsView({ data, customFrom, customTo }: { data: GoalCenter; customFrom?: string; customTo?: string }) {
  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Período</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {presets.map(([preset, label]) => (
            <Link key={preset} href={`/metas?secao=relatorios&periodo=${preset}`} className={cn(buttonVariants({ variant: data.preset === preset ? "default" : "outline" }))}>
              {label}
            </Link>
          ))}
        </div>
        <form className="mt-4 flex flex-wrap items-end gap-3" action="/metas">
          <input type="hidden" name="secao" value="relatorios" />
          <input type="hidden" name="periodo" value="custom" />
          <div className="grid gap-1.5">
            <Label htmlFor="relatorio-de">De</Label>
            <Input id="relatorio-de" name="de" type="date" defaultValue={customFrom} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="relatorio-ate">Até</Label>
            <Input id="relatorio-ate" name="ate" type="date" defaultValue={customTo} required />
          </div>
          <Button type="submit" variant="secondary">Aplicar intervalo</Button>
        </form>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">O intervalo personalizado aceita até 366 dias. Dias sem registro não são preenchidos com zero.</p>
      </section>

      {!data.bounds ? (
        <p className="text-sm text-muted-foreground">Informe um intervalo válido de até 366 dias.</p>
      ) : (
        <ReportBody data={data} />
      )}
    </div>
  )
}

function ReportBody({ data }: { data: GoalCenter }) {
  const bounds = data.bounds
  if (!bounds) return null
  const training = trainingReport(data.facts, bounds.from, bounds.to, bounds.previousFrom, bounds.previousTo)
  const nutrition = nutritionReport(data.facts, bounds.from, bounds.to, bounds.previousFrom, bounds.previousTo)
  const cardio = cardioReport(data.facts, bounds.from, bounds.to, bounds.previousFrom, bounds.previousTo)
  const body = bodyReport(data.facts, bounds.from, bounds.to)
  const study = studyReport(data.facts, bounds.from, bounds.to)
  const devotional = devotionalReport(data.facts, bounds.from, bounds.to)
  const wellbeing = wellbeingReport(data.facts, bounds.from, bounds.to)
  const range = `${formatShortDate(bounds.from)} a ${formatShortDate(bounds.to)}`

  return (
    <div className="grid gap-6">
      <p className="text-sm text-muted-foreground">{range}</p>
      {data.facts.truncated ? (
        <p className="text-sm text-muted-foreground">Este período tem registros demais para um único total. O resumo pode estar incompleto.</p>
      ) : null}

      <Section title="Treinos">
        {training.sessions === 0 ? <Empty /> : (
          <>
            <Line label="Sessões" value={String(training.sessions)} />
            <Line label="Dias com treino" value={String(training.days)} />
            {training.volume !== null ? <Line label="Volume" value={`${formatQuantity(training.volume)} kg`} /> : null}
            {training.exercises.length > 0 ? <Line label="Exercícios" value={training.exercises.join(", ")} /> : null}
            {training.previousSessions !== null ? <Line label="Sessões no período anterior" value={String(training.previousSessions)} /> : null}
            {training.previousVolume !== null ? <Line label="Volume no período anterior" value={`${formatQuantity(training.previousVolume)} kg`} /> : null}
            <ul className="mt-2 grid gap-1">
              {training.loads.map((load) => (
                <li key={load.name} className="text-sm text-muted-foreground">
                  {load.name}: {formatQuantity(load.firstLoad)} kg em {formatShortDate(load.firstDate)} e {formatQuantity(load.lastLoad)} kg em {formatShortDate(load.lastDate)}
                </li>
              ))}
            </ul>
            <TrendChart points={training.chart} label="Volume de treino no período" />
          </>
        )}
      </Section>

      <Section title="Alimentação e hidratação">
        {nutrition.totals === null && nutrition.waterTotal === null ? <Empty /> : (
          <>
            {nutrition.averages ? (
              <>
                <Line label="Média dos dias com refeição" value={`${formatQuantity(nutrition.averages.kcal)} kcal · ${formatQuantity(nutrition.averages.protein)} g de proteína · ${formatQuantity(nutrition.averages.carbs)} g de carboidrato · ${formatQuantity(nutrition.averages.fat)} g de gordura`} />
                <Line label="Dias com refeição" value={String(nutrition.mealDays)} />
              </>
            ) : null}
            {nutrition.waterAverage !== null ? <Line label="Média dos dias com água" value={`${formatQuantity(nutrition.waterAverage)} ml`} /> : null}
            {nutrition.target?.kcal !== null && nutrition.target?.kcal !== undefined && nutrition.averages ? <Line label="Meta informada de calorias" value={`${formatQuantity(nutrition.target.kcal)} kcal`} /> : null}
            {nutrition.target?.protein !== null && nutrition.target?.protein !== undefined && nutrition.averages ? <Line label="Meta informada de proteína" value={`${formatQuantity(nutrition.target.protein)} g`} /> : null}
            {nutrition.target?.waterMl !== null && nutrition.target?.waterMl !== undefined && nutrition.waterAverage !== null ? <Line label="Meta informada de água" value={`${formatQuantity(nutrition.target.waterMl)} ml`} /> : null}
            {nutrition.previousAverages ? <Line label="Média de calorias no período anterior" value={`${formatQuantity(nutrition.previousAverages.kcal)} kcal`} /> : null}
            <p className="mt-2 text-xs leading-5 text-muted-foreground">As médias usam só os dias com registro. Dias sem registro não entram como zero e a meta alimentar não é alterada por este relatório.</p>
            <TrendChart points={nutrition.chart} label="Calorias registradas no período" />
          </>
        )}
      </Section>

      <Section title="Cardio">
        {cardio.sessions === 0 ? <Empty /> : (
          <>
            <Line label="Sessões" value={String(cardio.sessions)} />
            <Line label="Minutos" value={formatQuantity(cardio.minutes)} />
            {cardio.distanceKm !== null ? <Line label="Distância informada" value={`${formatQuantity(cardio.distanceKm)} km em ${cardio.distanceSamples} de ${cardio.sessions} sessões`} /> : null}
            {cardio.weeklyFrequency !== null ? <Line label="Média de sessões por semana" value={formatQuantity(cardio.weeklyFrequency)} /> : null}
            {cardio.estimateKcal !== null ? <Line label="Estimativa de gasto" value={`${formatQuantity(cardio.estimateKcal)} kcal em ${cardio.estimateSamples} sessões. É uma estimativa, não uma medição.`} /> : null}
            {cardio.informedKcal !== null ? <Line label="Gasto informado por você" value={`${formatQuantity(cardio.informedKcal)} kcal em ${cardio.informedSamples} sessões`} /> : null}
            {cardio.previousSessions !== null ? <Line label="Sessões no período anterior" value={String(cardio.previousSessions)} /> : null}
            {data.facts.cardioWeekGoals.map((goal) => (
              <p key={goal.weekStartsOn} className="text-sm text-muted-foreground">
                Meta semanal já registrada em {formatShortDate(goal.weekStartsOn)}: {goal.targetSessions} sessões
                {goal.targetMinutes ? ` e ${goal.targetMinutes} min` : ""}.
              </p>
            ))}
            <TrendChart points={cardio.chart} label="Minutos de cardio no período" />
          </>
        )}
      </Section>

      <Section title="Evolução corporal">
        {body.weights.length === 0 && body.measures.length === 0 ? <Empty /> : (
          <>
            {body.weights.length >= 2 ? (
              <Line label="Peso" value={`${formatQuantity(body.weights[0].kg)} kg em ${formatShortDate(body.weights[0].date)} e ${formatQuantity(body.weights[body.weights.length - 1].kg)} kg em ${formatShortDate(body.weights[body.weights.length - 1].date)}`} />
            ) : body.weights.length === 1 ? (
              <Line label="Peso" value={`${formatQuantity(body.weights[0].kg)} kg em ${formatShortDate(body.weights[0].date)}`} />
            ) : null}
            <ul className="mt-2 grid gap-1">
              {body.measures.map((measure) => (
                <li key={measure.name} className="text-sm text-muted-foreground">
                  {measure.name}: {formatQuantity(measure.firstValue)} {measure.unit} em {formatShortDate(measure.firstDate)} e {formatQuantity(measure.lastValue)} {measure.unit} em {formatShortDate(measure.lastDate)}
                </li>
              ))}
            </ul>
            <TrendChart points={body.chart} label="Evolução do peso no período" />
          </>
        )}
      </Section>

      <Section title="Estudos">
        {study.sessions === 0 ? <Empty /> : (
          <>
            <Line label="Sessões concluídas" value={String(study.sessions)} />
            <Line label="Dias com estudo" value={String(study.days)} />
            {study.minutes !== null ? <Line label="Tempo com duração registrada" value={`${formatQuantity(study.minutes)} min em ${study.timedSessions} sessões`} /> : null}
            {study.goals.map((goal) => (
              <p key={`${goal.weekStartsOn}-${goal.title}`} className="text-sm text-muted-foreground">Meta da semana já registrada: {goal.title}{goal.isDone ? ", marcada como feita por você" : ""}.</p>
            ))}
            <TrendChart points={study.chart} label="Minutos de estudo no período" />
          </>
        )}
      </Section>

      <Section title="Devocional">
        {devotional.days === 0 && devotional.logs === 0 && devotional.reflections.length === 0 ? <Empty /> : (
          <>
            <Line label="Dias com registro" value={String(devotional.days)} />
            {devotional.logs > 0 ? <Line label="Leituras registradas" value={String(devotional.logs)} /> : null}
            {devotional.plans.map((plan) => (
              <p key={plan.title} className="text-sm text-muted-foreground">
                {plan.title}: {plan.logged} {plan.logged === 1 ? "leitura registrada" : "leituras registradas"}
                {plan.items > 0 ? ` entre ${plan.items} itens do plano` : ""}.
              </p>
            ))}
            {devotional.goals.map((goal) => (
              <p key={`${goal.weekStartsOn}-${goal.title}`} className="text-sm text-muted-foreground">Intenção da semana: {goal.title}{goal.isDone ? ", marcada como feita por você" : ""}.</p>
            ))}
            {devotional.reflections.length > 0 ? (
              <ul className="mt-2 grid gap-2">
                {devotional.reflections.map((entry) => (
                  <li key={`${entry.date}-${entry.text}`} className="text-sm leading-6 text-muted-foreground">
                    {formatShortDate(entry.date)}: {entry.text}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Estes registros descrevem os dias em que houve uma anotação. Eles não formam um ranking.</p>
          </>
        )}
      </Section>

      <Section title="Bem-estar">
        {wellbeing.sleepSamples === 0 && wellbeing.energySamples === 0 && wellbeing.moodSamples === 0 ? <Empty /> : (
          <>
            {wellbeing.sleepAverage !== null ? <Line label="Sono médio" value={`${formatQuantity(wellbeing.sleepAverage)} h em ${wellbeing.sleepSamples} dias anotados`} /> : null}
            {wellbeing.energyAverage !== null ? <Line label="Energia média" value={`${formatQuantity(wellbeing.energyAverage)} em ${wellbeing.energySamples} dias anotados`} /> : null}
            {wellbeing.moodAverage !== null ? <Line label="Humor médio" value={`${formatQuantity(wellbeing.moodAverage)} em ${wellbeing.moodSamples} dias anotados`} /> : null}
            <p className="mt-2 text-xs leading-5 text-muted-foreground">As linhas mostram o que foi anotado. Elas não indicam diagnóstico nem relação de causa.</p>
            <TrendChart points={wellbeing.sleepChart} label="Sono anotado no período" />
            <TrendChart points={wellbeing.energyChart} label="Energia anotada no período" />
          </>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card px-5 py-4">
      <h2 className="text-xl">{title}</h2>
      <div className="mt-3 grid gap-1">{children}</div>
    </section>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm leading-6">
      <span className="text-foreground">{label}: </span>
      <span className="text-muted-foreground">{value}</span>
    </p>
  )
}

function Empty() {
  return <p className="text-sm text-muted-foreground">Não há registros neste período.</p>
}
