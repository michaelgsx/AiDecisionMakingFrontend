-- Run once in your Azure SQL logical database (create the DB in Portal if needed).
-- Logical server example: ai-rag-sql-server.database.windows.net

IF OBJECT_ID(N'dbo.risk_ingest_records', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.risk_ingest_records (
    id BIGINT IDENTITY(1, 1) NOT NULL PRIMARY KEY,
    record_uuid CHAR(36) NOT NULL,
    [text] NVARCHAR(MAX) NULL,
    metadata NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_risk_ingest_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UK_risk_ingest_record_uuid UNIQUE (record_uuid)
  );
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes WHERE name = N'IX_risk_ingest_created_at' AND object_id = OBJECT_ID(N'dbo.risk_ingest_records')
)
BEGIN
  CREATE INDEX IX_risk_ingest_created_at ON dbo.risk_ingest_records (created_at);
END;
GO
