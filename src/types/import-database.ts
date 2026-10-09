import type { Json } from "@/types/database"

type Table<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

type ImportModule = "diet" | "workout" | "study" | "schedule" | "water" | "meal"
type ImportSource = "pdf" | "image" | "text" | "audio"
type ImportStatus = "awaiting_provider" | "ready_for_review" | "confirmed" | "discarded"

export type ImportTables = {
  import_drafts: Table<
    {
      id: string
      user_id: string
      module: ImportModule
      source_kind: ImportSource
      source_name: string | null
      storage_path: string | null
      source_text: string | null
      status: ImportStatus
      proposal: Json | null
      review_note: string | null
      extraction_attempts: number
      created_at: string
      updated_at: string
      confirmed_at: string | null
    },
    {
      id?: string
      user_id: string
      module: ImportModule
      source_kind: ImportSource
      source_name?: string | null
      storage_path?: string | null
      source_text?: string | null
      status?: ImportStatus
      proposal?: Json | null
      review_note?: string | null
      extraction_attempts?: number
      confirmed_at?: string | null
    },
    {
      status?: ImportStatus
      proposal?: Json | null
      review_note?: string | null
      extraction_attempts?: number
      confirmed_at?: string | null
      source_name?: string | null
    }
  >
  account_deletion_requests: Table<
    {
      id: string
      user_id: string
      confirmed_email: string
      status: "pending_identity"
      created_at: string
    },
    {
      id?: string
      user_id: string
      confirmed_email: string
      status?: "pending_identity"
    },
    Record<string, never>
  >
}
