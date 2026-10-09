import { Suspense } from "react"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { DevotionalView } from "@/components/devotional/devotional-view"
import { StatusNotice } from "@/components/status-notice"
import { loadDevotional } from "@/lib/data/records"

export const metadata = { title: "Devocional" }

export default function Page({ searchParams }: { searchParams: Promise<{ data?: string | string[] }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando o devocional...</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  )
}

async function Content({ searchParams }: { searchParams: Promise<{ data?: string | string[] }> }) {
  const params = await searchParams
  await connection()
  const requested = typeof params.data === "string" ? params.data : undefined
  const data = await loadDevotional(requested)
  if (data.status === "unauthenticated") redirect("/entrar")
  if (data.status !== "ready") return <StatusNotice status={data.status} />
  return <DevotionalView data={data} />
}
