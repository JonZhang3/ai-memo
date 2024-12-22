import type { GetResponse, QueryResponse } from "chromadb";
import { ChromaClient } from "chromadb";
import type {
  VectorStoreDataPayload,
  VectorStoreFilter,
  VectorStoreData,
} from "../types";
import type { VectorStoreBase } from "./base";

export interface ChromaVectorStoreConfig {
  collectionName: string;
  path?: string;
  database?: string;
  auth?: {
    provider: "basic" | "token";
    credentials?: string;
    tokenHeaderType: "AUTHORIZATION" | "X_CHROMA_TOKEN";
  };
}

export class ChromaDB implements VectorStoreBase {
  private readonly client: ChromaClient;
  private readonly collectionName: string;

  constructor(config: ChromaVectorStoreConfig) {
    this.collectionName = config.collectionName;
    this.client = new ChromaClient({
      path: config.path,
      database: config.database,
      auth: config.auth,
    });
  }

  async createCollection(): Promise<void> {
    await this.client.getOrCreateCollection({
      name: this.collectionName,
    });
  }

  async insert(
    vectors: Array<number[]>,
    ids: Array<string>,
    payloads?: Array<VectorStoreDataPayload>,
  ): Promise<void> {
    const collection = await this.client.getOrCreateCollection({
      name: this.collectionName,
    });
    await collection.add({
      embeddings: vectors,
      ids,
      metadatas: payloads,
    });
  }

  async search(
    query: Array<number[]>,
    limit?: number,
    filters?: VectorStoreFilter,
  ): Promise<VectorStoreData[]> {
    const collection = await this.client.getOrCreateCollection({
      name: this.collectionName,
    });
    const results = await collection.query({
      queryEmbeddings: query,
      nResults: limit ?? 5,
      where: filters,
    });
    return this.parseOutput(results);
  }

  async delete(vectorId: string): Promise<void> {
    const collection = await this.client.getOrCreateCollection({
      name: this.collectionName,
    });
    await collection.delete({ ids: vectorId });
  }

  async update(
    vectorId: string,
    vector: number[],
    payload: VectorStoreDataPayload,
  ): Promise<void> {
    const collection = await this.client.getOrCreateCollection({
      name: this.collectionName,
    });
    await collection.update({
      ids: vectorId,
      embeddings: vector,
      metadatas: payload,
    });
  }

  async get(vectorId: string): Promise<VectorStoreData | null> {
    const collection = await this.client.getOrCreateCollection({
      name: this.collectionName,
    });
    const result = await collection.get({
      ids: vectorId,
      limit: 1,
    });
    const data = this.parseOutput(result);
    return data.length > 0 ? data[0] : null;
  }

  deleteCollection(): Promise<void> {
    return this.client.deleteCollection({ name: this.collectionName });
  }

  async list(
    filters: VectorStoreFilter,
    limit?: number,
  ): Promise<VectorStoreData[]> {
    const collection = await this.client.getOrCreateCollection({
      name: this.collectionName,
    });
    const results = await collection.get({
      where: filters,
      limit: limit ?? 100,
    });
    return this.parseOutput(results);
  }

  private parseOutput(
    data: QueryResponse | GetResponse,
  ): Array<VectorStoreData> {
    const results: Array<VectorStoreData> = [];
    const keys = ["ids", "distances", "metadatas"];
    const values: any[] = [];
    for (const key of keys) {
      let value: any[] = data[key as keyof typeof data] || [];
      if (Array.isArray(value) && value.length && Array.isArray(value[0])) {
        value = value[0];
      }
      values.push(value);
    }

    const [ids, distances, metadatas] = values;
    const maxLength = Math.max(
      ...values
        .filter((v): v is any[] => Array.isArray(v) && v !== null)
        .map((v) => v.length),
    );
    for (let i = 0; i < maxLength; i++) {
      const entry: VectorStoreData = {
        id:
          Array.isArray(ids) && ids.length && i < ids.length
            ? ids[i]
            : undefined,
        score:
          Array.isArray(distances) && distances.length && i < distances.length
            ? distances[i]
            : undefined,
        payload:
          Array.isArray(metadatas) && metadatas.length && i < metadatas.length
            ? metadatas[i]
            : undefined,
      };
      results.push(entry);
    }
    return results;
  }
}
