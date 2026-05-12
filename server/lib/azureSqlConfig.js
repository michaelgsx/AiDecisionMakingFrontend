/**
 * Load Azure SQL Database connection settings from environment variables.
 * @returns {null | {
 *   server: string;
 *   port: number;
 *   database: string;
 *   user: string;
 *   password: string;
 *   encrypt: boolean;
 *   trustServerCertificate: boolean;
 *   tableName?: string;
 * }}
 */
export function loadAzureSqlConfigFromEnv() {
  const server = process.env.AZURE_SQL_SERVER?.trim();
  const database = process.env.AZURE_SQL_DATABASE?.trim();
  if (!server || !database) return null;

  const port = Number(process.env.AZURE_SQL_PORT ?? "1433");
  const user = process.env.AZURE_SQL_USER?.trim() ?? "";
  const password = process.env.AZURE_SQL_PASSWORD ?? "";
  const encrypt =
    process.env.AZURE_SQL_ENCRYPT !== "false" && process.env.AZURE_SQL_ENCRYPT !== "0";
  const trustServerCertificate =
    process.env.AZURE_SQL_TRUST_CERTIFICATE === "true" ||
    process.env.AZURE_SQL_TRUST_CERTIFICATE === "1";
  const tableName = process.env.AZURE_SQL_TABLE?.trim() || undefined;

  return {
    server,
    port,
    database,
    user,
    password,
    encrypt,
    trustServerCertificate,
    tableName,
  };
}
