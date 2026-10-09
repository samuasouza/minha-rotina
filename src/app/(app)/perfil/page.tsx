import { Suspense } from "react"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { ProfileExperience } from "@/components/profile/profile-experience"
import { StatusNotice } from "@/components/status-notice"
import { loadProfile } from "@/lib/data/anamnesis"

export const metadata = { title: "Meu Perfil" }

export default function Page({ searchParams }: { searchParams: Promise<{ etapa?: string | string[] }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando o perfil...</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  )
}

async function Content({ searchParams }: { searchParams: Promise<{ etapa?: string | string[] }> }) {
  const params = await searchParams
  await connection()
  const data = await loadProfile()
  if (data.status === "unauthenticated") redirect("/entrar")
  if (data.status !== "ready") return <StatusNotice status={data.status} />
  const requested = typeof params.etapa === "string" ? Number(params.etapa) : 0
  const initialStep = requested >= 1 && requested <= 5 ? requested : data.currentStep
  return (
    <ProfileExperience
      data={data}
      initialStep={initialStep}
      startWithSummary={data.completed && requested === 0}
    />
  )
}
