import { useCallback, useState } from "react";
import { assessRecord } from "../api/client";
import { RiskFeaturesPanel } from "../components/RiskFeaturesPanel";
import { randomNarrative } from "../risk/randomFill";
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
  const [narrative, setNarrative] = useState(randomNarrative);
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
      setError("Please fill in at least one of Case Notes or a risk feature.");
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
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const riskLabel =
    data?.risk === "high" ? "High Risk" : data?.risk === "medium" ? "Medium (frozen)" : data?.risk === "low" ? "Low Risk" : "";

  return (
    <>
      <h1>Risk &amp; Similar Records</h1>
      <p className="lead">
        Similarity matches are loaded from <strong>Azure AI Search</strong> (hybrid lexical + vector) using the same feature shape as Ingest.
      </p>

      <div className="card">
        <form onSubmit={onSubmit}>
          <RiskFeaturesPanel onFeaturesJsonChange={onFeaturesJsonChange} />

          <div className="field" style={{ marginTop: "0.5rem" }}>
            <label htmlFor="assess-narrative">Case Notes (optional)</label>
            <textarea
              id="assess-narrative"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Same type of supplementary notes as the Ingest page..."
              rows={5}
            />
          </div>

          <div className="actions">
            <button type="submit" disabled={loading}>
              {loading ? "Analyzing..." : "Submit Analysis"}
            </button>
          </div>
        </form>

        {error && (
          <div className="result err" role="alert">
            Error: {error}
          </div>
        )}

        {data && (
          <div className="result ok" style={{ marginTop: "1.25rem" }}>
            <div style={{ marginBottom: "0.75rem" }}>
              <span className={`risk-pill ${data.risk}`}>{riskLabel}</span>
            </div>
            <div>
              <strong style={{ color: "var(--text)" }}>Search summary</strong>
              <p style={{ margin: "0.35rem 0 0", color: "var(--muted)" }}>{data.reason}</p>
            </div>
            {(data.aiLabel != null && data.aiLabel !== "") || (data.aiReason != null && data.aiReason !== "") ? (
              <div style={{ marginTop: "1rem" }}>
                <strong style={{ color: "var(--text)" }}>AI decision</strong>
                {data.aiLabel != null && data.aiLabel !== "" && (
                  <p style={{ margin: "0.35rem 0 0", color: "var(--muted)" }}>
                    Label:{" "}
                    <code style={{ color: "var(--accent)" }}>{data.aiLabel}</code>
                  </p>
                )}
                {data.aiReason != null && data.aiReason !== "" && (
                  <p style={{ margin: "0.35rem 0 0", color: "var(--muted)", whiteSpace: "pre-wrap" }}>{data.aiReason}</p>
                )}
              </div>
            ) : null}
            {data.similarRecords?.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <strong style={{ color: "var(--text)" }}>Similar Records</strong>
                <ul className="similar-list">
                  {data.similarRecords.map((r, i) => (
                    <li key={r.id ?? r.recordId ?? i}>
                      <div className="meta">
                        {r.id != null && <>ID: {r.id}</>}
                        {r.recordId != null && r.recordId !== r.id && (
                          <>
                            {r.id != null && " · "}
                            recordId: {r.recordId}
                          </>
                        )}
                        {r.reviewOutcome != null && r.reviewOutcome !== "" && (
                          <>
                            {(r.id != null || r.recordId != null) && " · "}
                            Outcome: <code>{r.reviewOutcome}</code>
                          </>
                        )}
                        {r.score != null && (
                          <>
                            {(r.id != null || r.recordId != null || r.reviewOutcome) && " · "}
                            Similarity: {typeof r.score === "number" ? r.score.toFixed(3) : r.score}
                          </>
                        )}
                      </div>
                      {r.readableText != null && r.readableText.trim() !== "" ? (
                        <pre
                          className="similar-readable"
                          style={{
                            margin: "0.5rem 0 0",
                            padding: "0.65rem 0.75rem",
                            fontSize: "0.82rem",
                            lineHeight: 1.45,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            background: "var(--surface-2, rgba(0,0,0,0.2))",
                            borderRadius: "8px",
                            border: "1px solid var(--border, rgba(255,255,255,0.08))",
                            maxHeight: "28rem",
                            overflow: "auto",
                          }}
                        >
                          {r.readableText}
                        </pre>
                      ) : (
                        <p style={{ margin: "0.35rem 0 0", color: "var(--muted)" }}>{r.snippet}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="config-hint">
        Java backend runs hybrid similarity on <code>{`{VITE_API_BASE_URL}`}/rag/assess</code>: Azure OpenAI
        embedding + Azure AI Search, then (if <code>AZURE_OPENAI_CHAT_DEPLOYMENT</code> is set) a chat model returns{" "}
        <code>aiLabel</code> / <code>aiReason</code>. Response shape:{" "}
        <code>{`{ "risk", "reason", "similarRecords" (with readableText, metadataJson, …), "aiLabel"?, "aiReason"? }`}</code>.
      </footer>
    </>
  );
}
