import { Suspense } from "react"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { ImportExperience } from "@/components/import/import-experience"
import { StatusNotice } from "@/components/status-notice"
import { loadImports } from "@/lib/data/import"

export const metadata = { title: "Importar" }

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando a importação...</p>}>
      <Content />
    </Suspense>
  )
}

async function Content() {
  await connection()
  const data = await loadImports()
  if (data.status === "unauthenticated") redirect("/entrar")
  if (data.status !== "ready") return <StatusNotice status={data.status} />
  return <ImportExperience userId={data.userId} providerConfigured={data.providerConfigured} drafts={data.drafts} />
}
