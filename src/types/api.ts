/** API contract with your backend; rename fields if your API differs. */
export type IngestPayload = {
  /** Optional human-readable narrative (case notes, etc.). */
  text?: string;
  /** Merged risk features as a JSON string. */
  metadata?: string;
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
};

export type AssessResponse = {
  risk: "high" | "low";
  reason: string;
  similarRecords: SimilarRecord[];
};
