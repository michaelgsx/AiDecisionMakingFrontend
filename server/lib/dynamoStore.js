import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";

/** @param {{ region: string; tableName: string }} opts */
export function createStore(opts) {
  const { region, tableName } = opts;
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
    marshallOptions: { removeUndefinedValues: true },
  });

  /**
   * 原子自增序号，作为「第几条」返回给前端。
   * 使用复合主键 pk=COUNTER / sk=INGEST 的单行计数器。
   */
  async function allocateRecordIndex() {
    const out = await doc.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk: "COUNTER", sk: "INGEST" },
        UpdateExpression: "ADD #s :one",
        ExpressionAttributeNames: { "#s": "seq" },
        ExpressionAttributeValues: { ":one": 1 },
        ReturnValues: "UPDATED_NEW",
      }),
    );
    const seq = out.Attributes?.seq;
    if (typeof seq !== "number") {
      throw new Error("DynamoDB 计数器未返回 seq，请检查表名与权限");
    }
    return seq;
  }

  /**
   * @param {{ text?: string; metadata?: string }} payload
   * @returns {Promise<{ recordIndex: number; recordId: string }>}
   */
  async function saveIngest(payload) {
    const recordId = randomUUID();
    const recordIndex = await allocateRecordIndex();
    const now = new Date().toISOString();

    const item = {
      pk: `RECORD#${recordId}`,
      sk: "DATA",
      recordId,
      recordIndex,
      createdAt: now,
      type: "RAG_INGEST",
    };
    if (payload.text != null && payload.text !== "") {
      item.text = payload.text;
    }
    if (payload.metadata != null && payload.metadata !== "") {
      item.metadata = payload.metadata;
    }

    await doc.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
      }),
    );

    return { recordIndex, recordId };
  }

  return { saveIngest };
}
