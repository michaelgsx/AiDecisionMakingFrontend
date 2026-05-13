/** Core fields (snake_case to align with logs / DB). */
export const CORE_FEATURE_KEYS = [
  "scenario",
  "transaction_id",
  "user_id",
  "device_id",
  "device_type",
  "login_time",
  "country_code",
  "withdraw_amount",
  "total_amount",
  "deposit_amount",
  "timestamp",
] as const;

export type CoreFeatureKey = (typeof CORE_FEATURE_KEYS)[number];

export const CORE_LABELS: Record<CoreFeatureKey, string> = {
  scenario: "Scenario / Use-Case ID",
  transaction_id: "Transaction ID",
  user_id: "User ID",
  device_id: "Device ID",
  device_type: "Device Type",
  login_time: "Login Time",
  country_code: "Country / Region Code",
  withdraw_amount: "Withdrawal Amount",
  total_amount: "Total Amount / Balance",
  deposit_amount: "Deposit Amount",
  timestamp: "Event Timestamp",
};

/** Optional extended fields; empty values are omitted from the JSON payload. */
export const EXTENDED_FEATURE_KEYS = [
  "ip_address",
  "user_agent",
  "merchant_id",
  "payment_method",
  "currency",
  "channel",
  "mfa_passed",
  "is_new_device",
  "account_age_days",
  "velocity_24h_txn_count",
  "geo_distance_km",
  "beneficiary_changed",
  "failed_login_count_24h",
  "device_fingerprint",
  "email_trace",
  "conversation_trace",
] as const;

export type ExtendedFeatureKey = (typeof EXTENDED_FEATURE_KEYS)[number];

export const EXTENDED_LABELS: Record<ExtendedFeatureKey, string> = {
  ip_address: "IP Address",
  user_agent: "User-Agent",
  merchant_id: "Merchant ID",
  payment_method: "Payment Method",
  currency: "Currency",
  channel: "Channel (web / app / api)",
  mfa_passed: "MFA Passed (true/false)",
  is_new_device: "New Device (true/false)",
  account_age_days: "Account Age (days)",
  velocity_24h_txn_count: "Txn Count in Last 24h",
  geo_distance_km: "Distance from Usual Location (km)",
  beneficiary_changed: "Beneficiary Changed (true/false)",
  failed_login_count_24h: "Failed Logins in Last 24h",
  device_fingerprint: "Device Fingerprint Hash",
  email_trace: "Email Trace",
  conversation_trace: "Online Conversation Trace",
};

/** Extended keys that should render as multiline textareas instead of single-line inputs. */
export const MULTILINE_EXTENDED_KEYS: ReadonlySet<ExtendedFeatureKey> = new Set([
  "email_trace",
  "conversation_trace",
]);

/** Keys matching these suffixes (or listed names) coerce numeric strings to JSON numbers. */
const NUMERIC_KEY =
  /(_amount|_count|_km|_days|_24h)$|^(withdraw_amount|total_amount|deposit_amount)$/;

function parseCell(key: string, raw: string): unknown {
  const t = raw.trim();
  if (t === "") return undefined;
  const tl = t.toLowerCase();
  if (tl === "true") return true;
  if (tl === "false") return false;
  if (NUMERIC_KEY.test(key)) {
    const n = Number(t.replace(/,/g, ""));
    if (!Number.isNaN(n) && t !== "") return n;
  }
  return t;
}

export function buildFeaturesObject(
  core: Partial<Record<CoreFeatureKey, string>>,
  extended: Partial<Record<ExtendedFeatureKey, string>>,
  extras: { key: string; value: string }[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of CORE_FEATURE_KEYS) {
    const v = core[k];
    if (v == null || v.trim() === "") continue;
    const p = parseCell(k, v);
    if (p !== undefined) out[k] = p;
  }
  for (const k of EXTENDED_FEATURE_KEYS) {
    const v = extended[k];
    if (v == null || v.trim() === "") continue;
    const p = parseCell(k, v);
    if (p !== undefined) out[k] = p;
  }
  for (const row of extras) {
    const key = row.key.trim();
    if (!key) continue;
    out[key] = parseCell(key, row.value);
  }
  return out;
}
