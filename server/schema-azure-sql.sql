-- Run once in your Azure SQL logical database (create the DB in Portal if needed).
-- Logical server example: ai-rag-sql-server.database.windows.net

--------------------------------------------------------------------------------
-- 1. Legacy ingest blob table (kept for backward compatibility)
--------------------------------------------------------------------------------
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

--------------------------------------------------------------------------------
-- 2. Risk features — one row per request (ingest or risk-similarity)
--------------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.risk_features', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.risk_features (
    id            BIGINT        IDENTITY(1, 1) NOT NULL PRIMARY KEY,
    request_id    CHAR(36)      NOT NULL,
    source        VARCHAR(20)   NOT NULL,   -- 'ingest' | 'risk-similarity'
    scenario      NVARCHAR(200) NULL,
    transaction_id NVARCHAR(200) NULL,
    user_id       NVARCHAR(200) NULL,
    device_id     NVARCHAR(200) NULL,
    country_code  NVARCHAR(10)  NULL,
    withdraw_amount  DECIMAL(18, 2) NULL,
    deposit_amount   DECIMAL(18, 2) NULL,
    total_amount     DECIMAL(18, 2) NULL,
    features_json NVARCHAR(MAX) NOT NULL,   -- full feature set as JSON
    created_at    DATETIME2     NOT NULL
      CONSTRAINT DF_risk_features_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UK_risk_features_request_id UNIQUE (request_id),
    CONSTRAINT CK_risk_features_source
      CHECK (source IN ('ingest', 'risk-similarity'))
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_risk_features_created_at'       AND object_id = OBJECT_ID(N'dbo.risk_features'))
  CREATE INDEX IX_risk_features_created_at       ON dbo.risk_features (created_at);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_risk_features_source'            AND object_id = OBJECT_ID(N'dbo.risk_features'))
  CREATE INDEX IX_risk_features_source            ON dbo.risk_features (source);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_risk_features_user_id'           AND object_id = OBJECT_ID(N'dbo.risk_features'))
  CREATE INDEX IX_risk_features_user_id           ON dbo.risk_features (user_id) WHERE user_id IS NOT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_risk_features_transaction_id'    AND object_id = OBJECT_ID(N'dbo.risk_features'))
  CREATE INDEX IX_risk_features_transaction_id    ON dbo.risk_features (transaction_id) WHERE transaction_id IS NOT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_risk_features_scenario'          AND object_id = OBJECT_ID(N'dbo.risk_features'))
  CREATE INDEX IX_risk_features_scenario          ON dbo.risk_features (scenario) WHERE scenario IS NOT NULL;
GO

--------------------------------------------------------------------------------
-- 3. Risk decisions — audit log; freeze is non-final, pass / reject are final
--    One request may have multiple rows (e.g. freeze → pass).
--------------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.risk_decisions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.risk_decisions (
    id          BIGINT        IDENTITY(1, 1) NOT NULL PRIMARY KEY,
    request_id  CHAR(36)      NOT NULL,
    decision    VARCHAR(10)   NOT NULL,     -- 'pass' | 'reject' | 'freeze'
    is_final    AS CAST(
                  CASE WHEN decision IN ('pass', 'reject') THEN 1 ELSE 0 END
                AS BIT) PERSISTED,          -- computed: 1 when terminal
    reason      NVARCHAR(MAX) NULL,         -- optional operator notes
    decided_by  NVARCHAR(200) NULL,         -- operator / system identity
    created_at  DATETIME2     NOT NULL
      CONSTRAINT DF_risk_decisions_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_risk_decisions_decision
      CHECK (decision IN ('pass', 'reject', 'freeze')),
    CONSTRAINT FK_risk_decisions_request
      FOREIGN KEY (request_id) REFERENCES dbo.risk_features (request_id)
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_risk_decisions_request_created'  AND object_id = OBJECT_ID(N'dbo.risk_decisions'))
  CREATE INDEX IX_risk_decisions_request_created  ON dbo.risk_decisions (request_id, created_at DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_risk_decisions_decision'         AND object_id = OBJECT_ID(N'dbo.risk_decisions'))
  CREATE INDEX IX_risk_decisions_decision         ON dbo.risk_decisions (decision);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_risk_decisions_is_final'         AND object_id = OBJECT_ID(N'dbo.risk_decisions'))
  CREATE INDEX IX_risk_decisions_is_final         ON dbo.risk_decisions (is_final) WHERE is_final = 0;
GO
