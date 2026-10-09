import "server-only"

import { importLimits, providerFromEnv, providerMissingMessage } from "@/lib/domain/import"

export function importProviderConfigured() {
  return providerFromEnv(process.env) !== null
}

export async function requestStructuredExtraction(input: {
  module: string
  text: string | null
  bytes: Uint8Array | null
  mime: string | null
}): Promise<
  | { configured: false; message: string }
  | { configured: true; ok: false; message: string }
  | { configured: true; ok: true; confidence: number | null; proposal: unknown }
> {
  const provider = providerFromEnv(process.env)
  const key = process.env.IMPORT_AI_API_KEY?.trim()
  if (!provider || !key) {
    return { configured: false, message: providerMissingMessage }
  }
  if (input.bytes && input.bytes.byteLength > importLimits.providerBytes) {
    return {
      configured: true,
      ok: false,
      message:
        "Este arquivo passa do limite enviado à leitura automática. Ele continua guardado. Cole o trecho relevante ou preencha a prévia.",
    }
  }
  if ((input.text?.length ?? 0) > importLimits.textChars) {
    return { configured: true, ok: false, message: "O texto passa do limite enviado à leitura automática." }
  }

  const content: Record<string, unknown>[] = [
    {
      type: "text",
      text: [
        "Leia o material e responda somente com JSON.",
        "Não invente refeições, exercícios, horários, quantidades, calorias ou duração.",
        "Use null quando o dado não estiver no material.",
        "Se não houver dados suficientes, use proposal null.",
        `Módulo: ${input.module}.`,
        'Formato: {"confidence": number|null, "proposal": object|null}.',
      ].join(" "),
    },
  ]
  if (input.text) content.push({ type: "text", text: input.text })
  if (input.bytes && input.mime?.startsWith("image/")) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${input.mime};base64,${Buffer.from(input.bytes).toString("base64")}` },
    })
  }
  if (input.bytes && input.mime === "application/pdf") {
    content.push({
      type: "file",
      file: {
        filename: "material.pdf",
        file_data: `data:application/pdf;base64,${Buffer.from(input.bytes).toString("base64")}`,
      },
    })
  }
  if (input.bytes && input.mime?.startsWith("audio/")) {
    content.push({
      type: "input_audio",
      input_audio: {
        data: Buffer.from(input.bytes).toString("base64"),
        format: input.mime.includes("wav") ? "wav" : "mp3",
      },
    })
  }

  try {
    const response = await fetch(`${provider.base}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content }],
      }),
      signal: AbortSignal.timeout(25_000),
    })
    if (!response.ok) {
      return { configured: true, ok: false, message: "A leitura automática não respondeu. A prévia continua manual." }
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[]
    }
    const raw = payload.choices?.[0]?.message?.content
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== "object") {
      return { configured: true, ok: false, message: "A leitura não devolveu uma estrutura válida. Preencha a prévia." }
    }
    const envelope = parsed as { confidence?: unknown; proposal?: unknown }
    const confidence = typeof envelope.confidence === "number" ? envelope.confidence : null
    return { configured: true, ok: true, confidence, proposal: envelope.proposal ?? null }
  } catch {
    return { configured: true, ok: false, message: "A leitura automática não pôde ser concluída. Preencha a prévia." }
  }
}
