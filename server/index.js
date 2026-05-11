/**
 * 本地 / EC2 / 容器 上运行的 API：接收前端 Submit，写入 DynamoDB。
 *
 * 环境变量见 .env.example。AWS 凭证使用默认凭证链（环境变量、~/.aws/credentials、IAM Role 等）。
 */
import "dotenv/config";
import cors from "cors";
import express from "express";
import { createStore } from "./lib/dynamoStore.js";

const PORT = Number(process.env.PORT ?? 8787);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME ?? "";
const AWS_REGION = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1";
const OPS_TOKEN = process.env.OPS_TOKEN?.trim() ?? "";
const CORS_ORIGIN = process.env.CORS_ORIGIN?.trim();

if (!TABLE_NAME) {
  console.error("缺少环境变量 DYNAMODB_TABLE_NAME");
  process.exit(1);
}

const store = createStore({ region: AWS_REGION, tableName: TABLE_NAME });
const app = express();
app.use(express.json({ limit: "2mb" }));

app.use(
  cors({
    origin: CORS_ORIGIN ? CORS_ORIGIN.split(",").map((s) => s.trim()) : true,
  }),
);

function requireOps(req, res, next) {
  if (!OPS_TOKEN) {
    next();
    return;
  }
  const auth = req.headers.authorization ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const token = m?.[1];
  if (token !== OPS_TOKEN) {
    res.status(401).json({ ok: false, message: "未授权：Ops Token 不匹配" });
    return;
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/rag/ingest", requireOps, async (req, res) => {
  try {
    const { text, metadata } = req.body ?? {};
    const hasText = typeof text === "string" && text.trim().length > 0;
    const hasMeta = typeof metadata === "string" && metadata.trim().length > 0;
    if (!hasText && !hasMeta) {
      res.status(400).json({ ok: false, message: "text 与 metadata 至少填一项" });
      return;
    }

    const { recordIndex, recordId } = await store.saveIngest({
      text: hasText ? String(text).trim() : undefined,
      metadata: hasMeta ? String(metadata).trim() : undefined,
    });

    res.json({
      ok: true,
      recordIndex,
      recordId,
      message: "已写入 DynamoDB",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      message: err instanceof Error ? err.message : "服务器错误",
    });
  }
});

/** 占位：接好模型与向量库后在此替换 */
app.post("/rag/assess", requireOps, (_req, res) => {
  res.json({
    risk: "low",
    reason: "（占位）服务端尚未接 RAG/模型，请替换 /rag/assess 实现。",
    similarRecords: [],
  });
});

app.listen(PORT, () => {
  console.log(`Risk ingest API 监听 http://localhost:${PORT}`);
  console.log(`DynamoDB 表: ${TABLE_NAME} 区域: ${AWS_REGION}`);
});
