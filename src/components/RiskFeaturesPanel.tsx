import { useEffect, useId, useMemo, useState } from "react";
import {
  buildFeaturesObject,
  CORE_FEATURE_KEYS,
  CORE_LABELS,
  EXTENDED_FEATURE_KEYS,
  EXTENDED_LABELS,
  MULTILINE_EXTENDED_KEYS,
  type CoreFeatureKey,
  type ExtendedFeatureKey,
} from "../risk/featureSchema";
import { randomExtraRows, randomRiskCoreValues, randomRiskExtendedValues } from "../risk/randomFill";

type ExtraRow = { id: string; key: string; value: string };

function newRow(): ExtraRow {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, key: "", value: "" };
}

type Props = {
  /** Merged JSON string emitted for the request `metadata` field. */
  onFeaturesJsonChange: (json: string) => void;
};

export function RiskFeaturesPanel({ onFeaturesJsonChange }: Props) {
  const formId = useId();
  const [core, setCore] = useState<Partial<Record<CoreFeatureKey, string>>>({});
  const [extended, setExtended] = useState<Partial<Record<ExtendedFeatureKey, string>>>({});
  const [extras, setExtras] = useState<ExtraRow[]>([]);

  useEffect(() => {
    setCore(randomRiskCoreValues());
    setExtended(randomRiskExtendedValues());
    setExtras(randomExtraRows());
  }, []);

  const object = useMemo(
    () => buildFeaturesObject(core, extended, extras),
    [core, extended, extras],
  );

  const json = useMemo(() => JSON.stringify(object), [object]);

  useEffect(() => {
    onFeaturesJsonChange(json);
  }, [json, onFeaturesJsonChange]);

  function setCoreField(k: CoreFeatureKey, v: string) {
    setCore((prev) => ({ ...prev, [k]: v }));
  }

  function setExtField(k: ExtendedFeatureKey, v: string) {
    setExtended((prev) => ({ ...prev, [k]: v }));
  }

  return (
    <div className="risk-features">
      <h2 className="risk-features__title">Risk Features (stored as JSON)</h2>
      <p className="risk-features__hint">
        Fields below are merged into a single JSON object for the request <code>metadata</code>;
        empty fields are omitted.
      </p>

      <fieldset className="feature-fieldset">
        <legend>Core Fields</legend>
        <div className="feature-grid">
          {CORE_FEATURE_KEYS.map((k) => (
            <div className="field field--compact" key={k}>
              <label htmlFor={`${formId}-${k}`}>{CORE_LABELS[k]}</label>
              <input
                id={`${formId}-${k}`}
                type="text"
                value={core[k] ?? ""}
                onChange={(e) => setCoreField(k, e.target.value)}
                autoComplete="off"
              />
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="feature-fieldset">
        <legend>Extended Fields (optional)</legend>
        <div className="feature-grid">
          {EXTENDED_FEATURE_KEYS.filter((k) => !MULTILINE_EXTENDED_KEYS.has(k)).map((k) => (
            <div className="field field--compact" key={k}>
              <label htmlFor={`${formId}-ex-${k}`}>{EXTENDED_LABELS[k]}</label>
              <input
                id={`${formId}-ex-${k}`}
                type="text"
                value={extended[k] ?? ""}
                onChange={(e) => setExtField(k, e.target.value)}
                autoComplete="off"
              />
            </div>
          ))}
        </div>
        {EXTENDED_FEATURE_KEYS.filter((k) => MULTILINE_EXTENDED_KEYS.has(k)).map((k) => (
          <div className="field field--compact" key={k} style={{ marginTop: "0.75rem" }}>
            <label htmlFor={`${formId}-ex-${k}`}>{EXTENDED_LABELS[k]}</label>
            <textarea
              id={`${formId}-ex-${k}`}
              value={extended[k] ?? ""}
              onChange={(e) => setExtField(k, e.target.value)}
              rows={4}
              style={{ minHeight: "80px" }}
            />
          </div>
        ))}
      </fieldset>

      <fieldset className="feature-fieldset">
        <legend>Custom Key-Value Pairs</legend>
        <p className="risk-features__hint" style={{ marginTop: 0 }}>
          Arbitrary business fields. Keys ending with <code>_amount</code> that contain a number
          are stored as numeric values.
        </p>
        {extras.map((row, idx) => (
          <div className="extra-row" key={row.id}>
            <input
              type="text"
              placeholder="Field name"
              value={row.key}
              onChange={(e) => {
                const v = e.target.value;
                setExtras((prev) => prev.map((r) => (r.id === row.id ? { ...r, key: v } : r)));
              }}
              aria-label={`Custom field name ${idx + 1}`}
            />
            <input
              type="text"
              placeholder="Value"
              value={row.value}
              onChange={(e) => {
                const v = e.target.value;
                setExtras((prev) => prev.map((r) => (r.id === row.id ? { ...r, value: v } : r)));
              }}
              aria-label={`Custom field value ${idx + 1}`}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setExtras((prev) => prev.filter((r) => r.id !== row.id))}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={() => setExtras((p) => [...p, newRow()])}>
          Add Row
        </button>
      </fieldset>

      <div className="field" style={{ marginTop: "1rem" }}>
        <label>Preview (metadata JSON to be submitted)</label>
        <pre className="json-preview" tabIndex={0}>
          {json === "{}" ? "{}" : JSON.stringify(object, null, 2)}
        </pre>
      </div>
    </div>
  );
}
