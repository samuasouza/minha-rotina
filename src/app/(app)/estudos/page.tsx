import { Suspense } from "react"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { StudyView } from "@/components/study/study-view"
import { StatusNotice } from "@/components/status-notice"
import { loadStudies } from "@/lib/data/records"

export const metadata = { title: "Estudos" }

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando os estudos...</p>}>
      <Content />
    </Suspense>
  )
}

async function Content() {
  await connection()
  const data = await loadStudies()
  if (data.status === "unauthenticated") redirect("/entrar")
  if (data.status !== "ready") return <StatusNotice status={data.status} />
  return <StudyView data={data} />
}
