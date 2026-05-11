import { useCallback, useState } from "react";
import { ingestRecord } from "../api/client";
import { RiskFeaturesPanel } from "../components/RiskFeaturesPanel";

function parseFeatureKeys(metadata: string): string[] {
  try {
    const o = JSON.parse(metadata) as Record<string, unknown>;
    return Object.keys(o ?? {});
  } catch {
    return [];
  }
}

export function IngestPage() {
  const [narrative, setNarrative] = useState("");
  const [featuresJson, setFeaturesJson] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: true; msg: string } | { ok: false; msg: string } | null>(
    null,
  );

  const onFeaturesJsonChange = useCallback((json: string) => {
    setFeaturesJson(json);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const keys = parseFeatureKeys(featuresJson);
    if (!narrative.trim() && keys.length === 0) {
      setResult({ ok: false, msg: "请至少填写「案件备注」或一条风控特征。" });
      return;
    }
    setLoading(true);
    try {
      const res = await ingestRecord({
        text: narrative.trim() || undefined,
        metadata: featuresJson === "{}" ? undefined : featuresJson,
      });
      if (res.ok) {
        const idx =
          res.recordIndex != null
            ? `第 ${res.recordIndex} 条记录`
            : res.recordId
              ? `记录 ID：${res.recordId}`
              : "写入成功";
        setResult({
          ok: true,
          msg: [res.message, idx].filter(Boolean).join(" · "),
        });
        setNarrative("");
      } else {
        setResult({ ok: false, msg: res.message ?? "写入失败" });
      }
    } catch (err) {
      setResult({
        ok: false,
        msg: err instanceof Error ? err.message : "请求失败",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1>写入云端库（Ops）</h1>
      <p className="lead">
        结构化风控特征会合并为一条 JSON 字符串写入 <code>metadata</code>；可选「案件备注」写入{" "}
        <code>text</code>。请求头携带 Ops 鉴权。
      </p>

      <div className="card">
        <form onSubmit={onSubmit}>
          <RiskFeaturesPanel onFeaturesJsonChange={onFeaturesJsonChange} />

          <div className="field" style={{ marginTop: "0.5rem" }}>
            <label htmlFor="ingest-narrative">案件备注（可选）</label>
            <textarea
              id="ingest-narrative"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="人工补充：异常说明、客户沟通摘要等，便于检索与 RAG…"
              rows={5}
            />
          </div>

          <div className="actions">
            <button type="submit" disabled={loading}>
              {loading ? "提交中…" : "提交写入"}
            </button>
          </div>
        </form>

        {result && (
          <div className={`result ${result.ok ? "ok" : "err"}`} role="status">
            {result.ok ? "成功" : "错误"}：{result.msg}
          </div>
        )}
      </div>

      <footer className="config-hint">
        后端需返回 JSON，例如{" "}
        <code>{`{ "ok": true, "recordIndex": 42, "message": "..." }`}</code>
        。默认请求 <code>POST {`{VITE_API_BASE_URL}/rag/ingest`}</code>，Header{" "}
        <code>Authorization: Bearer &lt;VITE_OPS_TOKEN&gt;</code>。
      </footer>
    </>
  );
}
