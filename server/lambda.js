/**
 * AWS Lambda 入口（与 template.yaml 一起 `sam build && sam deploy`）。
 * 事件：API Gateway HTTP API（payload format 2.0）。
 */
import { createStore } from "./lib/dynamoStore.js";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME ?? "";
const AWS_REGION = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1";
const OPS_TOKEN = process.env.OPS_TOKEN?.trim() ?? "";

const store = TABLE_NAME ? createStore({ region: AWS_REGION, tableName: TABLE_NAME }) : null;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": process.env.CORS_ORIGIN?.trim() || "*",
    },
    body: JSON.stringify(body),
  };
}

function checkOps(headers) {
  if (!OPS_TOKEN) return true;
  const auth = headers?.authorization ?? headers?.Authorization ?? "";
  const m = String(auth).match(/^Bearer\s+(.+)$/i);
  return m?.[1] === OPS_TOKEN;
}

export const handler = async (event) => {
  if (!store) {
    return json(500, { ok: false, message: "缺少 DYNAMODB_TABLE_NAME" });
  }

  const path = event.rawPath ?? event.path ?? "";
  const method = event.requestContext?.http?.method ?? event.httpMethod ?? "GET";

  if (method === "GET" && (path === "/health" || path.endsWith("/health"))) {
    return json(200, { ok: true });
  }

  const headers = event.headers ?? {};
  if (!checkOps(headers)) {
    return json(401, { ok: false, message: "未授权：Ops Token 不匹配" });
  }

  if (method === "POST" && path.endsWith("/rag/assess")) {
    return json(200, {
      risk: "low",
      reason: "（占位）Lambda 尚未接 RAG/模型，请替换实现。",
      similarRecords: [],
    });
  }

  if (method !== "POST" || !path.endsWith("/rag/ingest")) {
    return json(404, { ok: false, message: "Not Found" });
  }

  let body = {};
  try {
    body = event.body
      ? JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body)
      : {};
  } catch {
    return json(400, { ok: false, message: "JSON 无效" });
  }

  const { text, metadata } = body;
  const hasText = typeof text === "string" && text.trim().length > 0;
  const hasMeta = typeof metadata === "string" && metadata.trim().length > 0;
  if (!hasText && !hasMeta) {
    return json(400, { ok: false, message: "text 与 metadata 至少填一项" });
  }

  try {
    const saved = await store.saveIngest({
      text: hasText ? String(text).trim() : undefined,
      metadata: hasMeta ? String(metadata).trim() : undefined,
    });
    return json(200, {
      ok: true,
      recordIndex: saved.recordIndex,
      recordId: saved.recordId,
      message: "已写入 DynamoDB",
    });
  } catch (err) {
    console.error(err);
    return json(500, {
      ok: false,
      message: err instanceof Error ? err.message : "服务器错误",
    });
  }
};
