import { Suspense } from "react"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { TrainingView } from "@/components/training/training-view"
import { ModuleContext } from "@/components/profile/module-context"
import { StatusNotice } from "@/components/status-notice"
import { todayInTimeZone } from "@/lib/domain/dates"
import { loadModuleNotes } from "@/lib/data/anamnesis"
import { loadTraining } from "@/lib/data/records"
import { requireReadyAccount } from "@/lib/data/account"

export const metadata = { title: "Treinos" }

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando os treinos...</p>}>
      <Content />
    </Suspense>
  )
}

async function Content() {
  await connection()
  const data = await loadTraining()
  if (data.status === "unauthenticated") redirect("/entrar")
  if (data.status !== "ready") return <StatusNotice status={data.status} />
  const account = await requireReadyAccount()
  const today = account.status === "ready" ? todayInTimeZone(account.profile.timezone) : todayInTimeZone("America/Sao_Paulo")
  const notes = await loadModuleNotes("training")
  return (
    <div className="grid gap-6">
      <ModuleContext lines={notes} />
      <TrainingView data={data} today={today} />
    </div>
  )
}
