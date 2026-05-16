/** Ops decision when persisting a case row (stored inside merged `metadata` JSON on the server). */
export type IngestReviewOutcome = "passed" | "rejected" | "frozen";

/** API contract with your backend; rename fields if your API differs. */
export type IngestPayload = {
  /** Optional human-readable narrative (case notes, etc.). */
  text?: string;
  /** Merged risk features as a JSON string. */
  metadata?: string;
  /** Required for ingest: Pass / Reject / Freeze → passed | rejected | frozen. */
  reviewOutcome: IngestReviewOutcome;
};

export type IngestResponse = {
  ok: boolean;
  /** Record ordinal (1-based or per your backend semantics). */
  recordIndex?: number;
  recordId?: string;
  message?: string;
};

export type AssessPayload = {
  text?: string;
  /** Same feature JSON shape as the ingest page. */
  metadata?: string;
};

export type SimilarRecord = {
  id?: string;
  snippet: string;
  score?: number;
  /** Same as id when indexed with business UUID. */
  recordId?: string | null;
  reviewOutcome?: string | null;
  caseNotes?: string | null;
  metadataJson?: string | null;
  /** Full indexed blob (case + metadata shape used for embedding). */
  content?: string | null;
  userId?: string | null;
  scenario?: string | null;
  transactionId?: string | null;
  /** Fixed-layout multi-line summary from the API. */
  readableText?: string | null;
};

/** Outcome label from the assess chat model (same vocabulary as ingest `reviewOutcome`). */
export type AiAssessLabel = "passed" | "rejected" | "frozen";

export type AssessResponse = {
  /** Heuristic from search scores, or driven by `aiLabel` when the chat step runs. */
  risk: "high" | "low" | "medium";
  reason: string;
  similarRecords: SimilarRecord[];
  /** Set when `AZURE_OPENAI_CHAT_DEPLOYMENT` is configured and the chat call succeeds. */
  aiLabel?: AiAssessLabel | string | null;
  aiReason?: string | null;
};
