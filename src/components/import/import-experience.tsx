"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createFileDraft, createTextDraft } from "@/lib/actions/import"
import { fileByteLimit, importModules, importObjectPath, kindFromMime, providerMissingMessage, type ImportModule } from "@/lib/domain/import"
import type { ImportDraftCard } from "@/lib/data/import"
import { createClient } from "@/lib/supabase/client"
import { ImportPreview } from "@/components/import/import-preview"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const moduleLabels: Record<ImportModule, string> = {
  diet: "Dieta ou plano alimentar",
  workout: "Ficha de treino",
  study: "Material de estudo",
  schedule: "Tarefas e compromissos",
  meal: "Refeição",
  water: "Água",
}

export function ImportExperience({
  userId,
  providerConfigured,
  drafts,
}: {
  userId: string
  providerConfigured: boolean
  drafts: ImportDraftCard[]
}) {
  const router = useRouter()
  const [module, setModule] = useState<ImportModule>("diet")
  const [text, setText] = useState("")
  const [pending, setPending] = useState(false)
  const [recording, setRecording] = useState(false)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])

  async function submitText() {
    setPending(true)
    const result = await createTextDraft({
      module,
      sourceKind: "text",
      sourceName: "Texto colado",
      sourceText: text,
    })
    setPending(false)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    setText("")
    toast.success(result.message)
    router.refresh()
  }

  async function submitFile(file: File) {
    const kind = kindFromMime(file.type)
    if (!kind) {
      toast.error("Use PDF, imagem JPG, PNG ou WebP, ou áudio.")
      return
    }
    if (file.size > fileByteLimit(kind)) {
      toast.error("O arquivo passa do limite deste tipo.")
      return
    }
    setPending(true)
    const path = importObjectPath(userId, file.name, crypto.randomUUID())
    const supabase = createClient()
    const uploaded = await supabase.storage.from("imports").upload(path, file, {
      contentType: file.type.split(";")[0],
      upsert: false,
    })
    if (uploaded.error) {
      setPending(false)
      toast.error("Não foi possível enviar o arquivo.")
      return
    }
    const result = await createFileDraft({
      module,
      sourceKind: kind,
      sourceName: file.name,
      storagePath: path,
    })
    setPending(false)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.message(result.message)
    router.refresh()
  }

  async function toggleRecording() {
    if (recording && recorder.current) {
      recorder.current.stop()
      setRecording(false)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Este navegador não liberou o microfone.")
      return
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const media = new MediaRecorder(stream)
    chunks.current = []
    media.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data)
    }
    media.onstop = () => {
      stream.getTracks().forEach((track) => track.stop())
      const blob = new Blob(chunks.current, { type: "audio/webm" })
      if (blob.size === 0) return
      void submitFile(new File([blob], "gravacao.webm", { type: "audio/webm" }))
    }
    recorder.current = media
    media.start()
    setRecording(true)
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <header>
        <h1 className="text-4xl">Importar</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Escolha o módulo, envie o material e revise a prévia. A confirmação é o que grava dieta, ficha, estudo,
          agenda, refeição ou água.
        </p>
      </header>
      <section className="rounded-2xl border border-border bg-card p-4">
        <Label htmlFor="modulo">Módulo</Label>
        <select
          id="modulo"
          className="mt-2 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
          value={module}
          onChange={(event) => setModule(event.target.value as ImportModule)}
        >
          {importModules.map((item) => (
            <option key={item} value={item}>
              {moduleLabels[item]}
            </option>
          ))}
        </select>
        <Label htmlFor="material" className="mt-4">
          Texto
        </Label>
        <Textarea
          id="material"
          className="mt-2 min-h-28"
          value={text}
          maxLength={20000}
          placeholder="Cole o plano, a ficha ou a anotação."
          onChange={(event) => setText(event.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" disabled={pending || text.trim().length === 0} onClick={() => void submitText()}>
            Guardar texto para revisão
          </Button>
          <label className="inline-flex h-11 cursor-pointer items-center rounded-lg border border-border px-3 text-sm">
            Enviar arquivo
            <input
              className="sr-only"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,audio/webm,audio/mp4,audio/mpeg,audio/wav"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ""
                if (file) void submitFile(file)
              }}
            />
          </label>
          <Button type="button" variant="outline" disabled={pending} onClick={() => void toggleRecording()}>
            {recording ? "Parar gravação" : "Gravar áudio"}
          </Button>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {providerConfigured
            ? "A leitura automática só preenche a prévia quando você pedir. Ela não grava o módulo."
            : providerMissingMessage}{" "}
          O microfone é pedido apenas ao gravar. PDF até 8 MB, imagem até 5 MB e áudio até 10 MB.
        </p>
      </section>
      {drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma prévia aberta.</p>
      ) : (
        <div className="grid gap-4">
          {drafts.map((draft) => (
            <ImportPreview key={draft.id} draft={draft} providerConfigured={providerConfigured} />
          ))}
        </div>
      )}
    </div>
  )
}
