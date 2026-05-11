import { useCallback, useState } from "react";
import { assessRecord } from "../api/client";
import { RiskFeaturesPanel } from "../components/RiskFeaturesPanel";
import type { AssessResponse } from "../types/api";

function parseFeatureKeys(metadata: string): string[] {
  try {
    const o = JSON.parse(metadata) as Record<string, unknown>;
    return Object.keys(o ?? {});
  } catch {
    return [];
  }
}

export function AssessPage() {
  const [narrative, setNarrative] = useState("");
  const [featuresJson, setFeaturesJson] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AssessResponse | null>(null);

  const onFeaturesJsonChange = useCallback((json: string) => {
    setFeaturesJson(json);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setData(null);
    const keys = parseFeatureKeys(featuresJson);
    if (!narrative.trim() && keys.length === 0) {
      setError("请至少填写「案件备注」或一条风控特征。");
      return;
    }
    setLoading(true);
    try {
      const res = await assessRecord({
        text: narrative.trim() || undefined,
        metadata: featuresJson === "{}" ? undefined : featuresJson,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setLoading(false);
    }
  }

  const riskLabel = data?.risk === "high" ? "高风险" : data?.risk === "low" ? "低风险" : "";

  return (
    <>
      <h1>风险与相似记录</h1>
      <p className="lead">与写入页使用同一套特征表单，便于与向量库中的记录对齐比较。</p>

      <div className="card">
        <form onSubmit={onSubmit}>
          <RiskFeaturesPanel onFeaturesJsonChange={onFeaturesJsonChange} />

          <div className="field" style={{ marginTop: "0.5rem" }}>
            <label htmlFor="assess-narrative">案件备注（可选）</label>
            <textarea
              id="assess-narrative"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="与写入时相同类型的补充说明…"
              rows={5}
            />
          </div>

          <div className="actions">
            <button type="submit" disabled={loading}>
              {loading ? "分析中…" : "提交分析"}
            </button>
          </div>
        </form>

        {error && (
          <div className="result err" role="alert">
            错误：{error}
          </div>
        )}

        {data && (
          <div className="result ok" style={{ marginTop: "1.25rem" }}>
            <div style={{ marginBottom: "0.75rem" }}>
              <span className={`risk-pill ${data.risk}`}>{riskLabel}</span>
            </div>
            <div>
              <strong style={{ color: "var(--text)" }}>理由</strong>
              <p style={{ margin: "0.35rem 0 0", color: "var(--muted)" }}>{data.reason}</p>
            </div>
            {data.similarRecords?.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <strong style={{ color: "var(--text)" }}>相似记录举例</strong>
                <ul className="similar-list">
                  {data.similarRecords.map((r, i) => (
                    <li key={r.id ?? i}>
                      <div className="meta">
                        {r.id != null && <>ID: {r.id}</>}
                        {r.score != null && (
                          <>
                            {r.id != null && " · "}
                            相似度: {r.score.toFixed?.(3) ?? r.score}
                          </>
                        )}
                      </div>
                      {r.snippet}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="config-hint">
        后端需返回 JSON，例如{" "}
        <code>
          {`{ "risk": "high"|"low", "reason": "...", "similarRecords": [{ "id":"", "snippet":"", "score":0.9 }] }`}
        </code>
        。默认请求 <code>POST {`{VITE_API_BASE_URL}/rag/assess`}</code>。
      </footer>
    </>
  );
}
