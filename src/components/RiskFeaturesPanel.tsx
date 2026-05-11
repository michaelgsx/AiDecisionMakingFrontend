import { useEffect, useId, useMemo, useState } from "react";
import {
  buildFeaturesObject,
  CORE_FEATURE_KEYS,
  CORE_LABELS,
  EXTENDED_FEATURE_KEYS,
  EXTENDED_LABELS,
  type CoreFeatureKey,
  type ExtendedFeatureKey,
} from "../risk/featureSchema";

type ExtraRow = { id: string; key: string; value: string };

function newRow(): ExtraRow {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, key: "", value: "" };
}

type Props = {
  /** 合并后的 JSON 字符串，供提交 metadata */
  onFeaturesJsonChange: (json: string) => void;
};

export function RiskFeaturesPanel({ onFeaturesJsonChange }: Props) {
  const formId = useId();
  const [core, setCore] = useState<Partial<Record<CoreFeatureKey, string>>>({});
  const [extended, setExtended] = useState<Partial<Record<ExtendedFeatureKey, string>>>({});
  const [extras, setExtras] = useState<ExtraRow[]>([]);

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
      <h2 className="risk-features__title">风控多特征（存为 JSON 字符串）</h2>
      <p className="risk-features__hint">
        下方字段会合并为单一 JSON，作为请求的 <code>metadata</code>；空字段不会写入 JSON。
      </p>

      <fieldset className="feature-fieldset">
        <legend>核心字段</legend>
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
        <legend>常用扩展（可选）</legend>
        <div className="feature-grid">
          {EXTENDED_FEATURE_KEYS.map((k) => (
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
      </fieldset>

      <fieldset className="feature-fieldset">
        <legend>自定义键值</legend>
        <p className="risk-features__hint" style={{ marginTop: 0 }}>
          任意业务字段；金额类键名若以 <code>_amount</code> 结尾且为数字，会存为数值类型。
        </p>
        {extras.map((row, idx) => (
          <div className="extra-row" key={row.id}>
            <input
              type="text"
              placeholder="字段名"
              value={row.key}
              onChange={(e) => {
                const v = e.target.value;
                setExtras((prev) => prev.map((r) => (r.id === row.id ? { ...r, key: v } : r)));
              }}
              aria-label={`自定义字段名 ${idx + 1}`}
            />
            <input
              type="text"
              placeholder="值"
              value={row.value}
              onChange={(e) => {
                const v = e.target.value;
                setExtras((prev) => prev.map((r) => (r.id === row.id ? { ...r, value: v } : r)));
              }}
              aria-label={`自定义字段值 ${idx + 1}`}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setExtras((prev) => prev.filter((r) => r.id !== row.id))}
            >
              删除
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={() => setExtras((p) => [...p, newRow()])}>
          添加一行
        </button>
      </fieldset>

      <div className="field" style={{ marginTop: "1rem" }}>
        <label>预览（将提交的 metadata JSON）</label>
        <pre className="json-preview" tabIndex={0}>
          {json === "{}" ? "{}" : JSON.stringify(object, null, 2)}
        </pre>
      </div>
    </div>
  );
}
