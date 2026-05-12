import { randomUUID } from "node:crypto";
import sql from "mssql";

const DEFAULT_TABLE = "dbo.risk_ingest_records";

/**
 * @param {{
 *   server: string;
 *   port: number;
 *   database: string;
 *   user: string;
 *   password: string;
 *   encrypt: boolean;
 *   trustServerCertificate: boolean;
 *   tableName?: string;
 * }} config
 */
function resolveTableName(raw) {
  const name = raw?.trim() || DEFAULT_TABLE;
  if (!/^[a-zA-Z0-9_.]+$/.test(name)) {
    throw new Error("Invalid AZURE_SQL_TABLE: use identifiers like dbo.risk_ingest_records only");
  }
  return name;
}

export function createAzureSqlStore(config) {
  const tableName = resolveTableName(config.tableName);

  const poolPromise = new sql.ConnectionPool({
    server: config.server,
    port: config.port ?? 1433,
    database: config.database,
    user: config.user,
    password: config.password,
    options: {
      encrypt: config.encrypt,
      trustServerCertificate: config.trustServerCertificate,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  }).connect();

  async function getPool() {
    return poolPromise;
  }

  /**
   * @param {{ text?: string; metadata?: string }} payload
   * @returns {Promise<{ recordIndex: number; recordId: string }>}
   */
  async function saveIngest(payload) {
    const pool = await getPool();
    const recordUuid = randomUUID();
    const result = await pool
      .request()
      .input("record_uuid", sql.VarChar(36), recordUuid)
      .input("text", sql.NVarChar(sql.MAX), payload.text ?? null)
      .input("metadata", sql.NVarChar(sql.MAX), payload.metadata ?? null)
      .query(
        `INSERT INTO ${tableName} (record_uuid, [text], metadata)
         OUTPUT INSERTED.id
         VALUES (@record_uuid, @text, @metadata)`,
      );

    const row = result.recordset?.[0];
    const insertId = row?.id;
    if (typeof insertId !== "number" && typeof insertId !== "bigint") {
      throw new Error("INSERT did not return id; ensure table matches schema-azure-sql.sql");
    }
    const recordIndex = Number(insertId);
    return { recordIndex, recordId: recordUuid };
  }

  return { saveIngest, getPool };
}
