import { Suspense } from "react"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { getAuthContext } from "@/lib/auth/session"

export default function Home() {
  return (
    <Suspense fallback={<p className="px-6 py-16 text-center text-sm text-muted-foreground">Abrindo...</p>}>
      <HomeGate />
    </Suspense>
  )
}

async function HomeGate() {
  await connection()
  const auth = await getAuthContext()
  redirect(auth.status === "authenticated" ? "/meu-dia" : "/entrar")
  return null
}
