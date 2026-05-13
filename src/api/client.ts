import type {
  AssessPayload,
  AssessResponse,
  IngestPayload,
  IngestResponse,
  IngestReviewOutcome,
} from "../types/api";

function baseUrl(): string {
  const u = import.meta.env.VITE_API_BASE_URL?.trim();
  return u?.replace(/\/$/, "") ?? "";
}

function opsHeaders(): HeadersInit {
  const token = import.meta.env.VITE_OPS_TOKEN?.trim();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function useMock(): boolean {
  return import.meta.env.VITE_USE_MOCK === "true";
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Response is not valid JSON");
  }
}

/** POST /rag/ingest; override `ingestPath` if your backend uses a different route. */
export async function ingestRecord(
  body: IngestPayload,
  ingestPath = "/rag/ingest",
): Promise<IngestResponse> {
  const root = baseUrl();
  if (!root && useMock()) {
    await new Promise((r) => setTimeout(r, 400));
    const label: Record<IngestReviewOutcome, string> = {
      passed: "Passed",
      rejected: "Rejected",
      frozen: "Frozen",
    };
    return {
      ok: true,
      recordIndex: Math.floor(Math.random() * 900) + 100,
      message: `(Mock) Saved · ${label[body.reviewOutcome]}`,
    };
  }
  if (!root) {
    throw new Error("Set VITE_API_BASE_URL or enable VITE_USE_MOCK=true for demo mode");
  }

  const res = await fetch(`${root}${ingestPath}`, {
    method: "POST",
    headers: opsHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parseJson<IngestResponse & { error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
  }
  return { ...data, ok: data.ok !== false };
}

/** POST /rag/assess; override `assessPath` if your backend uses a different route. */
export async function assessRecord(
  body: AssessPayload,
  assessPath = "/rag/assess",
): Promise<AssessResponse> {
  const root = baseUrl();
  if (!root && useMock()) {
    await new Promise((r) => setTimeout(r, 500));
    const len = (body.text?.length ?? 0) + (body.metadata?.length ?? 0);
    return {
      risk: len > 120 ? "high" : "low",
      reason:
        len > 120
          ? "(Mock) Combined text + features JSON is long; demo returns high risk. Real results are model/rule-driven."
          : "(Mock) Input is short; demo returns low risk.",
      similarRecords: [
        { id: "mock-1", snippet: "Semantically similar sample snippet A...", score: 0.91 },
        { id: "mock-2", snippet: "Semantically similar sample snippet B...", score: 0.84 },
      ],
    };
  }
  if (!root) {
    throw new Error("Set VITE_API_BASE_URL or enable VITE_USE_MOCK=true for demo mode");
  }

  const res = await fetch(`${root}${assessPath}`, {
    method: "POST",
    headers: opsHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parseJson<AssessResponse & { error?: string; message?: string }>(res);
  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
  }
  return data;
}
