/**
 * HTTP API (local / container / Azure App Service): ingests records into Azure SQL Database.
 *
 * See server/.env.example; run server/schema-azure-sql.sql once on the target database.
 */
import "dotenv/config";
import cors from "cors";
import express from "express";
import { loadAzureSqlConfigFromEnv } from "./lib/azureSqlConfig.js";
import { createAzureSqlStore } from "./lib/azureSqlStore.js";

const PORT = Number(process.env.PORT ?? 8787);
const OPS_TOKEN = process.env.OPS_TOKEN?.trim() ?? "";
const CORS_ORIGIN = process.env.CORS_ORIGIN?.trim();

const sqlConfig = loadAzureSqlConfigFromEnv();
if (!sqlConfig) {
  console.error(
    "Missing Azure SQL config: set AZURE_SQL_SERVER, AZURE_SQL_DATABASE, AZURE_SQL_USER, AZURE_SQL_PASSWORD",
  );
  process.exit(1);
}

const store = createAzureSqlStore(sqlConfig);
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
    res.status(401).json({ ok: false, message: "Unauthorized: invalid ops token" });
    return;
  }
  next();
}

app.get("/health", async (_req, res) => {
  try {
    const pool = await store.getPool();
    await pool.request().query("SELECT 1 AS ok");
    res.json({ ok: true, db: "azure-sql" });
  } catch (err) {
    console.error(err);
    res.status(503).json({
      ok: false,
      message: err instanceof Error ? err.message : "Database unavailable",
    });
  }
});

app.post("/rag/ingest", requireOps, async (req, res) => {
  try {
    const { text, metadata } = req.body ?? {};
    const hasText = typeof text === "string" && text.trim().length > 0;
    const hasMeta = typeof metadata === "string" && metadata.trim().length > 0;
    if (!hasText && !hasMeta) {
      res.status(400).json({ ok: false, message: "Provide at least one of text or metadata" });
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
      message: "Saved to Azure SQL",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      message: err instanceof Error ? err.message : "Server error",
    });
  }
});

/** Placeholder: replace with model + vector retrieval when ready. */
app.post("/rag/assess", requireOps, (_req, res) => {
  res.json({
    risk: "low",
    reason: "Placeholder: replace /rag/assess with your RAG / model pipeline.",
    similarRecords: [],
  });
});

app.listen(PORT, () => {
  console.log(`Risk ingest API listening on http://localhost:${PORT}`);
  console.log(`Azure SQL: ${sqlConfig.server} / ${sqlConfig.database}`);
});
