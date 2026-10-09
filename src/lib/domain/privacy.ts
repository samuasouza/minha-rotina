export const deletionRequestMessage =
  "O pedido foi registrado. A conta e os registros continuam até a identidade ser removida no painel do Supabase, porque este aplicativo não guarda a chave que apaga o acesso. Cópias de backup da plataforma seguem a retenção do Supabase."

export const exportNote =
  "Fotos e arquivos importados permanecem no armazenamento privado. Este arquivo lista os registros e os caminhos, não os bytes e nem um link público."

export function personalExport(input: {
  exportedOn: string
  tables: Record<string, unknown[]>
  truncated: string[]
}) {
  return {
    app: "Minha Rotina",
    exportedOn: input.exportedOn,
    note: exportNote,
    truncated: input.truncated,
    tables: input.tables,
  }
}
