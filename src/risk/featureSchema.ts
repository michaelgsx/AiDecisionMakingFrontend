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
  scenario: "场景 / 用例编号",
  transaction_id: "交易 ID",
  user_id: "用户 ID",
  device_id: "设备 ID",
  device_type: "设备类型",
  login_time: "登录时间",
  country_code: "国家/地区码",
  withdraw_amount: "提现金额",
  total_amount: "总金额 / 余额相关",
  deposit_amount: "充值金额",
  timestamp: "事件时间戳",
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
] as const;

export type ExtendedFeatureKey = (typeof EXTENDED_FEATURE_KEYS)[number];

export const EXTENDED_LABELS: Record<ExtendedFeatureKey, string> = {
  ip_address: "IP 地址",
  user_agent: "User-Agent",
  merchant_id: "商户 ID",
  payment_method: "支付方式",
  currency: "币种",
  channel: "渠道（web / app / api）",
  mfa_passed: "是否通过 MFA（true/false）",
  is_new_device: "是否新设备（true/false）",
  account_age_days: "账户年龄（天）",
  velocity_24h_txn_count: "近 24h 交易笔数",
  geo_distance_km: "与常用地距离（km）",
  beneficiary_changed: "收款方是否变更（true/false）",
  failed_login_count_24h: "近 24h 登录失败次数",
  device_fingerprint: "设备指纹摘要",
};

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
