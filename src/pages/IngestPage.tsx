import { useCallback, useState } from "react";
import { ingestRecord } from "../api/client";
import { RiskFeaturesPanel } from "../components/RiskFeaturesPanel";
import { randomNarrative } from "../risk/randomFill";
import type { IngestReviewOutcome } from "../types/api";

function parseFeatureKeys(metadata: string): string[] {
  try {
    const o = JSON.parse(metadata) as Record<string, unknown>;
    return Object.keys(o ?? {});
  } catch {
    return [];
  }
}

export function IngestPage() {
  const [narrative, setNarrative] = useState(randomNarrative);
  const [featuresJson, setFeaturesJson] = useState("{}");
  const [submitting, setSubmitting] = useState<IngestReviewOutcome | null>(null);
  const [result, setResult] = useState<{ ok: true; msg: string } | { ok: false; msg: string } | null>(
    null,
  );

  const onFeaturesJsonChange = useCallback((json: string) => {
    setFeaturesJson(json);
  }, []);

  const outcomeLabel: Record<IngestReviewOutcome, string> = {
    passed: "Passed",
    rejected: "Rejected",
    frozen: "Frozen",
  };

  async function submitWithOutcome(outcome: IngestReviewOutcome) {
    setResult(null);
    const keys = parseFeatureKeys(featuresJson);
    if (!narrative.trim() && keys.length === 0) {
      setResult({ ok: false, msg: "Please fill in at least one of Case Notes or a risk feature." });
      return;
    }
    setSubmitting(outcome);
    try {
      const res = await ingestRecord({
        text: narrative.trim() || undefined,
        metadata: featuresJson === "{}" ? undefined : featuresJson,
        reviewOutcome: outcome,
      });
      if (res.ok) {
        const idx =
          res.recordIndex != null
            ? `Record #${res.recordIndex}`
            : res.recordId
              ? `Record ID: ${res.recordId}`
              : "Saved";
        setResult({
          ok: true,
          msg: [`${outcomeLabel[outcome]}`, res.message, idx].filter(Boolean).join(" · "),
        });
        setNarrative(randomNarrative());
      } else {
        setResult({ ok: false, msg: res.message ?? "Save failed" });
      }
    } catch (err) {
      setResult({
        ok: false,
        msg: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <>
      <h1>Ingest to Cloud Store (Ops)</h1>
      <p className="lead">
        Structured risk features are merged into a single JSON string for <code>metadata</code>;
        optional Case Notes go into <code>text</code>. Choose <strong>Pass</strong>,{" "}
        <strong>Reject</strong>, or <strong>Freeze</strong> to save the record; the server writes{" "}
        <code>reviewOutcome</code> and a timestamp into <code>metadata</code>. Ops auth header required.
      </p>

      <div className="card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <RiskFeaturesPanel onFeaturesJsonChange={onFeaturesJsonChange} />

          <div className="field" style={{ marginTop: "0.5rem" }}>
            <label htmlFor="ingest-narrative">Case Notes (optional)</label>
            <textarea
              id="ingest-narrative"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Manual notes: anomaly description, customer communication summary, etc. for retrieval & RAG..."
              rows={5}
            />
          </div>

          <div className="actions actions--review">
            <button
              type="button"
              className="btn-review btn-review--pass"
              disabled={submitting !== null}
              onClick={() => void submitWithOutcome("passed")}
            >
              {submitting === "passed" ? "Saving..." : "Pass"}
            </button>
            <button
              type="button"
              className="btn-review btn-review--reject"
              disabled={submitting !== null}
              onClick={() => void submitWithOutcome("rejected")}
            >
              {submitting === "rejected" ? "Saving..." : "Reject"}
            </button>
            <button
              type="button"
              className="btn-review btn-review--freeze"
              disabled={submitting !== null}
              onClick={() => void submitWithOutcome("frozen")}
            >
              {submitting === "frozen" ? "Saving..." : "Freeze"}
            </button>
          </div>
        </form>

        {result && (
          <div className={`result ${result.ok ? "ok" : "err"}`} role="status">
            {result.ok ? "Success" : "Error"}: {result.msg}
          </div>
        )}
      </div>

      <footer className="config-hint">
        Java backend (Spring Boot) at{" "}
        <code>{`{VITE_API_BASE_URL}`}/rag/ingest</code>.
        Request body: <code>{`{ "text?", "metadata?", "reviewOutcome": "passed"|"rejected"|"frozen" }`}</code>.
        Auth: <code>Authorization: Bearer &lt;VITE_OPS_TOKEN&gt;</code>.
      </footer>
    </>
  );
}
