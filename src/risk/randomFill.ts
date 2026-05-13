import type { CoreFeatureKey, ExtendedFeatureKey } from "./featureSchema";

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

function randomIpv4(): string {
  return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;
}

/** Fills all core risk fields with plausible random strings for local testing. */
export function randomRiskCoreValues(): Record<CoreFeatureKey, string> {
  const now = new Date();
  const iso = now.toISOString();
  const scenarios = ["login_anomaly", "high_velocity_withdrawal", "new_device_large_txn", "geo_mismatch", "scenario_1"];
  return {
    scenario: pick(scenarios),
    transaction_id: randId("txn"),
    user_id: randId("usr"),
    device_id: randId("dev"),
    device_type: pick(["ios", "android", "web", "desktop", "tablet"]),
    login_time: iso,
    country_code: pick(["US", "CN", "JP", "DE", "GB", "SG"]),
    withdraw_amount: (Math.round((Math.random() * 50_000 + 50) * 100) / 100).toFixed(2),
    total_amount: (Math.round((Math.random() * 200_000 + 500) * 100) / 100).toFixed(2),
    deposit_amount: (Math.round(Math.random() * 100_000 * 100) / 100).toFixed(2),
    timestamp: iso,
  };
}

/** Fills extended fields with random values (booleans as "true"/"false"). */
export function randomRiskExtendedValues(): Record<ExtendedFeatureKey, string> {
  const tf = () => (Math.random() > 0.5 ? "true" : "false");
  return {
    ip_address: randomIpv4(),
    user_agent: pick([
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    ]),
    merchant_id: randId("mch"),
    payment_method: pick(["card", "bank_transfer", "wallet", "ach"]),
    currency: pick(["USD", "CNY", "EUR", "JPY"]),
    channel: pick(["web", "app", "api"]),
    mfa_passed: tf(),
    is_new_device: tf(),
    account_age_days: String(Math.floor(Math.random() * 900)),
    velocity_24h_txn_count: String(Math.floor(Math.random() * 25)),
    geo_distance_km: (Math.round(Math.random() * 8000) / 10).toFixed(1),
    beneficiary_changed: tf(),
    failed_login_count_24h: String(Math.floor(Math.random() * 8)),
    device_fingerprint: randId("fp"),
    email_trace: pick([
      "From: support@bank.com To: user@example.com\nSubject: Unusual activity on your account\nWe noticed a login from a new device. If this wasn't you, please reset your password.",
      "From: user@example.com To: cs@payments.com\nSubject: Where is my refund?\nI requested a refund 5 days ago but haven't received it. Order #38291.",
      "From: alerts@finserv.com To: user@example.com\nSubject: Wire transfer confirmation\nA wire of $12,500 was initiated from your account to IBAN DE89... Please confirm.",
      "From: compliance@finserv.com To: user@example.com\nSubject: Document verification required\nYour recent large transaction requires additional KYC documentation. Please upload a government ID within 48 hours.",
    ]),
    conversation_trace: pick([
      "Agent: How can I help you today?\nUser: I need to increase my withdrawal limit.\nAgent: I can help with that. Can you verify your identity?\nUser: Sure, my DOB is 1990-03-15.\nAgent: Limit increased to $50,000.",
      "User: I didn't authorize the $8,000 transfer.\nAgent: Let me check. The transfer was initiated from IP 203.0.113.42 at 02:14 UTC.\nUser: That's not my IP. Please freeze my account.\nAgent: Account frozen. A dispute case has been opened.",
      "Agent: Your account shows 3 failed login attempts in the last hour.\nUser: That wasn't me. Someone might have my credentials.\nAgent: I've enabled a temporary lock. Please change your password via the secure link sent to your email.",
      "User: Why was my card declined?\nAgent: There was a fraud flag on a $3,200 purchase at electronics-store.com from an IP in a different country.\nUser: That was actually me, I'm traveling.\nAgent: Got it. I've whitelisted the merchant and lifted the hold.",
    ]),
  };
}

export type RandomExtraRow = { id: string; key: string; value: string };

export function randomExtraRows(): RandomExtraRow[] {
  const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return [
    { id: id(), key: "risk_score", value: String(Math.floor(Math.random() * 100)) },
    { id: id(), key: "session_depth", value: String(Math.floor(Math.random() * 15)) },
  ];
}

const NARRATIVE_SNIPPETS = [
  "Cross-border withdrawal shortly after device change; velocity elevated vs 30d baseline.",
  "Multiple failed logins from new ASN, then successful MFA and large outbound transfer.",
  "First-time beneficiary; amount exceeds typical P2P pattern for this user segment.",
  "Login from uncommon geo vs last 90d home region; session completed without step-up.",
  "Rapid in-out funds; deposit and withdrawal within same hour from different IPs.",
];

/** Short random case note for the narrative textarea. */
export function randomNarrative(): string {
  const ref = Math.random().toString(36).slice(2, 10);
  return `${pick(NARRATIVE_SNIPPETS)} [case:${ref}]`;
}
