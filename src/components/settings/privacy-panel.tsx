"use client"

import { useState } from "react"
import { toast } from "sonner"
import { exportPersonalData, requestAccountDeletion } from "@/lib/actions/privacy"
import { deletionRequestMessage } from "@/lib/domain/privacy"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function PrivacyPanel({ email }: { email: string | null }) {
  const [pending, setPending] = useState(false)
  const [typedEmail, setTypedEmail] = useState("")

  async function download() {
    setPending(true)
    const result = await exportPersonalData()
    setPending(false)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    const blob = new Blob([result.json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = result.filename
    link.click()
    URL.revokeObjectURL(url)
    toast.success("O arquivo com os seus registros foi gerado.")
  }

  async function requestDeletion() {
    setPending(true)
    const result = await requestAccountDeletion({ email: typedEmail })
    setPending(false)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
  }

  return (
    <div className="grid gap-6">
      <div>
        <h3 className="text-lg">Exportar</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          O arquivo JSON reúne perfil, anamnese, metas, tarefas, agenda, devocional, treinos, estudos, alimentação,
          cardio, corpo, bem-estar e prévias de importação. Fotos e arquivos ficam só com o caminho privado.
        </p>
        <Button type="button" className="mt-3" disabled={pending} onClick={() => void download()}>
          Baixar meus dados
        </Button>
      </div>
      <div>
        <h3 className="text-lg">Excluir a conta</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{deletionRequestMessage}</p>
        <Label htmlFor="confirmar-email" className="mt-3">
          Digite {email ?? "o e-mail da conta"} para registrar o pedido
        </Label>
        <Input
          id="confirmar-email"
          className="mt-2"
          type="email"
          autoComplete="off"
          value={typedEmail}
          onChange={(event) => setTypedEmail(event.target.value)}
        />
        <Button
          type="button"
          variant="destructive"
          className="mt-3"
          disabled={pending || typedEmail.trim().length === 0}
          onClick={() => void requestDeletion()}
        >
          Registrar pedido de exclusão
        </Button>
      </div>
    </div>
  )
}
