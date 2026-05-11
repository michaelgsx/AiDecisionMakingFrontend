import type {
  AssessPayload,
  AssessResponse,
  IngestPayload,
  IngestResponse,
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
    throw new Error("响应不是合法 JSON");
  }
}

/** POST /rag/ingest — 可按你后端路径改 `ingestPath` */
export async function ingestRecord(
  body: IngestPayload,
  ingestPath = "/rag/ingest",
): Promise<IngestResponse> {
  const root = baseUrl();
  if (!root && useMock()) {
    await new Promise((r) => setTimeout(r, 400));
    return {
      ok: true,
      recordIndex: Math.floor(Math.random() * 900) + 100,
      message: "（Mock）已写入",
    };
  }
  if (!root) {
    throw new Error("请配置 VITE_API_BASE_URL，或设置 VITE_USE_MOCK=true 演示");
  }

  const res = await fetch(`${root}${ingestPath}`, {
    method: "POST",
    headers: opsHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parseJson<IngestResponse>(res);
  if (!res.ok) {
    throw new Error(data.message ?? `HTTP ${res.status}`);
  }
  /** 若后端只返回 recordIndex 而无 ok 字段，仍视为成功 */
  return { ok: data.ok !== false, ...data };
}

/** POST /rag/assess — 可按你后端路径改 */
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
          ? "（Mock）综合文本+特征 JSON 较长，演示为高风险；真实环境由模型与规则决定。"
          : "（Mock）输入较短，演示为低风险。",
      similarRecords: [
        { id: "mock-1", snippet: "与当前文本语义相近的示例片段 A…", score: 0.91 },
        { id: "mock-2", snippet: "与当前文本语义相近的示例片段 B…", score: 0.84 },
      ],
    };
  }
  if (!root) {
    throw new Error("请配置 VITE_API_BASE_URL，或设置 VITE_USE_MOCK=true 演示");
  }

  const res = await fetch(`${root}${assessPath}`, {
    method: "POST",
    headers: opsHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parseJson<AssessResponse>(res);
  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return data;
}
