"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function PwaControls() {
  const [install, setInstall] = useState<InstallEvent | null>(null)
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    let registration: ServiceWorkerRegistration | null = null
    const onInstall = (event: Event) => {
      event.preventDefault()
      setInstall(event as InstallEvent)
    }
    window.addEventListener("beforeinstallprompt", onInstall)
    void navigator.serviceWorker.register("/sw.js").then((worker) => {
      registration = worker
      if (worker.waiting) setUpdateReady(true)
      worker.addEventListener("updatefound", () => {
        const next = worker.installing
        next?.addEventListener("statechange", () => {
          if (next.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true)
        })
      })
    })
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstall)
      void registration?.update()
    }
  }, [])

  if (!install && !updateReady) return null

  return (
    <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 md:bottom-4">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 text-sm shadow-sm">
        {updateReady ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" })
              window.location.reload()
            }}
          >
            Atualizar
          </Button>
        ) : null}
        {install ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              void install.prompt()
              setInstall(null)
            }}
          >
            Instalar
          </Button>
        ) : null}
      </div>
    </div>
  )
}
