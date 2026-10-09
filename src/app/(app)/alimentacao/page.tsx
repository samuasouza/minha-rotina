import { Suspense } from "react"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { NutritionView } from "@/components/health/nutrition-view"
import { ModuleContext } from "@/components/profile/module-context"
import { StatusNotice } from "@/components/status-notice"
import { loadModuleNotes } from "@/lib/data/anamnesis"
import { loadNutrition } from "@/lib/data/health"

export const metadata = { title: "Alimentação" }

export default function Page({ searchParams }: { searchParams: Promise<{ data?: string | string[] }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando a alimentação...</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  )
}

async function Content({ searchParams }: { searchParams: Promise<{ data?: string | string[] }> }) {
  const params = await searchParams
  await connection()
  const requested = typeof params.data === "string" ? params.data : undefined
  const data = await loadNutrition(requested)
  if (data.status === "unauthenticated") redirect("/entrar")
  if (data.status !== "ready") return <StatusNotice status={data.status} />
  const notes = await loadModuleNotes("nutrition")
  return (
    <div className="grid gap-6">
      <ModuleContext lines={notes} />
      <NutritionView data={data} />
    </div>
  )
}
