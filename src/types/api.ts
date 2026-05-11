/** 与后端约定：可按你实际 API 改字段名 */
export type IngestPayload = {
  /** 人工可读补充（案件描述、备注等，可选） */
  text?: string;
  /** 风控多特征合并后的 JSON 字符串 */
  metadata?: string;
};

export type IngestResponse = {
  ok: boolean;
  /** 第几条记录（从 1 起或按你后端语义） */
  recordIndex?: number;
  recordId?: string;
  message?: string;
};

export type AssessPayload = {
  text?: string;
  /** 与写入页相同结构的特征 JSON 字符串 */
  metadata?: string;
};

export type SimilarRecord = {
  id?: string;
  snippet: string;
  score?: number;
};

export type AssessResponse = {
  risk: "high" | "low";
  reason: string;
  similarRecords: SimilarRecord[];
};
