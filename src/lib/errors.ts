import type { ZodError } from "zod"

const databaseMessages: Record<string, string> = {
  task_not_found: "Não encontrei essa atividade.",
  appointment_not_found: "Não encontrei esse compromisso.",
  same_date: "Escolha um dia diferente.",
  already_scheduled: "Essa atividade já está nesse dia.",
  not_reschedulable: "Este registro não pode ser reagendado agora.",
  module_record_required: "Este item só é concluído com o registro do módulo correspondente.",
  invalid_date: "Informe uma data válida.",
  not_authenticated: "Entre novamente para continuar.",
  invalid_category: "A categoria escolhida não pertence a esta conta.",
  invalid_routine: "A repetição escolhida não pertence a esta conta.",
  invalid_owner: "Esse registro não pertence a esta conta.",
  invalid_task: "A atividade ligada não pertence a este módulo.",
  "não aceita lançamento manual": "Esta meta é calculada pelos registros do módulo e não aceita outro lançamento.",
  "não pertence a este usuário": "Esse registro não pertence a esta conta.",
}

export const configurationMessage =
  "O Minha Rotina ainda não está ligado a um projeto Supabase. As variáveis estão em .env.example."

export const schemaMessage =
  "A estrutura do banco ainda não está disponível neste projeto. As migrations locais precisam ser aplicadas de novo."

export function firstIssue(error: ZodError): string {
  return error.issues[0]?.message ?? "Revise os campos e tente de novo."
}

export function isSchemaMissing(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? ""
  return (
    error.code === "42P01" ||
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    message.includes("schema cache") ||
    message.includes("could not find the function") ||
    message.includes("could not find the table")
  )
}

export function messageFromDatabase(error: { message?: string }) {
  const message = error.message ?? ""
  for (const [code, text] of Object.entries(databaseMessages)) {
    if (message.includes(code)) {
      return text
    }
  }
  return "Não foi possível salvar agora. Tente de novo em instantes."
}

export function mapAuthError(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes("invalid login")) {
    return "E-mail ou senha incorretos."
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirme o e-mail antes de entrar. O link foi enviado quando a conta foi criada."
  }
  if (normalized.includes("already registered") || normalized.includes("already been registered")) {
    return "Esse e-mail já possui uma conta. Entre com a senha."
  }
  if (normalized.includes("password")) {
    return "A senha não atende às regras da conta."
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Muitas tentativas seguidas. Espere um pouco e tente de novo."
  }
  return "Não foi possível concluir o acesso agora. Tente de novo em instantes."
}

export function logOperationFailure(operation: string, error: { code?: string }) {
  console.error(operation, { code: error.code ?? "unknown" })
}
