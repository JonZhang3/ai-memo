import type { VectorStoreBase } from "./base";
import type {
  VectorStoreData,
  VectorStoreDataPayload,
  VectorStoreFilter,
} from "../types";
import {
  createClient,
  createCluster,
  SchemaFieldTypes,
  VectorAlgorithms,
} from "redis";
import type {
  RedisClientType,
  RedisClusterType,
  RediSearchSchema,
  RedisClientOptions,
  RedisClusterOptions,
} from "redis";
import { getUTCTimestamp, getUTCTime } from "../utils";

export type RedisVectorStoreConfig = (
  | RedisClientOptions
  | RedisClusterOptions
) & {
  collectionName: string;
  embeddingModelDims?: number;
};

const excludedKeys = new Set([
  "user_id",
  "agent_id",
  "run_id",
  "hash",
  "data",
  "created_at",
  "updated_at",
]);

export class RedisDB implements VectorStoreBase {
  private readonly config: Readonly<RedisVectorStoreConfig>;
  private readonly collectionName: string;
  private readonly prefix: string;
  private readonly client: RedisClientType | RedisClusterType;
  private isCollectionExists: boolean | null = null;

  constructor(config: RedisVectorStoreConfig) {
    this.config = {
      ...config,
      embeddingModelDims: config.embeddingModelDims ?? 1024,
    };
    this.collectionName = config.collectionName;
    this.prefix = `mem0:${this.collectionName}:`;
    if ("rootNodes" in config) {
      this.client = createCluster(config) as RedisClusterType;
    } else {
      this.client = createClient(config) as RedisClientType;
    }
    this.client.on("error", (err) => {
      console.error("RedisDB Error:", err);
    });
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async createCollection(): Promise<void> {
    await this.connect();
    const schema: RediSearchSchema = {
      "$.memory_id": {
        type: SchemaFieldTypes.TAG,
        AS: "memory_id",
      },
      "$.hash": {
        type: SchemaFieldTypes.TAG,
        AS: "hash",
      },
      "$.agent_id": {
        type: SchemaFieldTypes.TAG,
        AS: "agent_id",
      },
      "$.run_id": {
        type: SchemaFieldTypes.TAG,
        AS: "run_id",
      },
      "$.user_id": {
        type: SchemaFieldTypes.TAG,
        AS: "user_id",
      },
      "$.memory": {
        type: SchemaFieldTypes.TEXT,
        AS: "memory",
      },
      "$.metadata": {
        type: SchemaFieldTypes.TEXT,
        AS: "metadata",
      },
      "$.created_at": {
        type: SchemaFieldTypes.NUMERIC,
        AS: "created_at",
      },
      "$.updated_at": {
        type: SchemaFieldTypes.NUMERIC,
        AS: "updated_at",
      },
      "$.embedding": {
        type: SchemaFieldTypes.VECTOR,
        TYPE: "FLOAT32",
        ALGORITHM: VectorAlgorithms.FLAT,
        DIM: this.config.embeddingModelDims!,
        DISTANCE_METRIC: "COSINE",
        AS: "embedding",
      },
    };
    if (this.isCollectionExists === null) {
      const info = await this.client.ft.info(this.collectionName);
      this.isCollectionExists = info !== null;
    }
    if (this.isCollectionExists) {
      return;
    }
    this.client.ft.create(this.collectionName, schema, {
      ON: "JSON",
      PREFIX: this.prefix,
    });
  }

  async insert(
    vectors: Array<number[]>,
    ids: Array<string>,
    payloads?: Array<VectorStoreDataPayload>,
  ): Promise<void> {
    await this.createCollection();
    const docs = vectors.map((vector, index) => {
      const payload = payloads?.[index];
      const entry = {
        key: `${this.prefix}${ids[index]}`,
        path: "$",
        value: {
          memory_id: ids[index],
          hash: payload?.hash || null,
          memory: payload?.data || null,
          created_at: getUTCTimestamp(payload?.created_at as string),
          embedding: vector,
        } as Record<string, any>,
      };
      ["agent_id", "run_id", "user_id"].forEach((field) => {
        if (payload?.[field]) {
          entry.value[field] = payload[field] || null;
        }
      });
      entry.value.metadata = {};
      if (payload) {
        Object.keys(payload).forEach((key) => {
          if (!excludedKeys.has(key)) {
            entry.value.metadata[key] = payload[key] || null;
          }
        });
      }

      return entry;
    });
    await this.client.json.mSet(docs);
  }

  async search(
    query: Array<number[]>,
    limit?: number,
    filters?: VectorStoreFilter,
  ): Promise<VectorStoreData[]> {
    await this.createCollection();
    let queryStr = `[KNN ${limit ?? 5} @embedding $vector]`;
    if (filters) {
      const filterStr = Object.entries(filters)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          return `@${key}==${value}`;
        })
        .join(" ");
      queryStr = `(${filterStr})=>${queryStr}`;
    } else {
      queryStr = `*=>${queryStr}`;
    }
    const data = await this.client.ft.search(this.collectionName, queryStr, {
      PARAMS: {
        vector: Buffer.from(new Float32Array(query[0]).buffer),
      },
      RETURN: [
        "memory_id",
        "hash",
        "agent_id",
        "run_id",
        "user_id",
        "memory",
        "metadata",
        "created_at",
      ],
      DIALECT: 2,
    });
    return this.parseDocuments(data.documents);
  }

  async delete(vectorId: string): Promise<void> {
    await this.createCollection();
    await this.client.json.del(`${this.prefix}${vectorId}`);
  }

  async update(
    vectorId: string,
    vector: number[],
    payload: VectorStoreDataPayload,
  ): Promise<void> {
    await this.createCollection();
    const data = {
      memory_id: vectorId,
      hash: payload?.hash || null,
      memory: payload?.data || null,
      created_at: getUTCTimestamp(payload?.created_at as string),
      updated_at: getUTCTimestamp(payload?.updated_at as string),
      embedding: vector,
    } as Record<string, any>;
    ["agent_id", "run_id", "user_id"].forEach((field) => {
      if (payload?.[field]) {
        data[field] = payload[field] || null;
      }
    });
    data.metadata = {};
    if (payload) {
      Object.keys(payload).forEach((key) => {
        if (!excludedKeys.has(key)) {
          data.metadata[key] = payload[key] || null;
        }
      });
    }
    await this.client.json.set(`${this.prefix}${vectorId}`, "$", data);
  }

  async get(vectorId: string): Promise<VectorStoreData | null> {
    await this.createCollection();
    const data = await this.client.json.get(`${this.prefix}${vectorId}`);
    if (data) {
      return this.parseDocuments([{ id: vectorId, value: data }])[0];
    }
    return null;
  }

  async deleteCollection(): Promise<void> {
    await this.connect();
    await this.client.ft.dropIndex(this.collectionName);
  }

  async list(
    filters: VectorStoreFilter,
    limit?: number,
  ): Promise<VectorStoreData[]> {
    await this.createCollection();
    let queryStr = "*";
    if (filters) {
      const filterStr = Object.entries(filters)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          return `@${key}==${value}`;
        })
        .join(" ");
      queryStr = filterStr;
    }
    const data = await this.client.ft.search(this.collectionName, queryStr, {
      SORTBY: {
        BY: "created_at",
        DIRECTION: "DESC",
      },
      LIMIT: {
        from: 0,
        size: limit ?? 5,
      },
    });
    return this.parseDocuments(data.documents);
  }

  private parseDocuments(
    documents: Array<{ id: string; value: any }>,
  ): VectorStoreData[] {
    return documents.map((doc) => {
      return {
        id: doc.id,
        payload: {
          hash: doc.value.hash,
          data: doc.value.memory,
          created_at: doc.value.created_at
            ? getUTCTime(new Date(doc.value.created_at))
            : null,
          updated_at: doc.value.updated_at
            ? getUTCTime(new Date(doc.value.updated_at))
            : null,
          ...["agent_id", "run_id", "user_id"]
            .filter((field) => field in doc.value)
            .reduce(
              (acc, field) => ({ ...acc, [field]: doc.value[field] }),
              {},
            ),
          ...doc.value.metadata,
        },
      } as VectorStoreData;
    });
  }
}
