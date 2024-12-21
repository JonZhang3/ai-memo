import type { VectorStoreBase } from "./base";
import { QdrantClient } from "@qdrant/js-client-rest";
import type {
  QdrantVectorStoreConfig,
  VectorStoreData,
  VectorStoreDataPayload,
  VectorStoreFilter,
} from "../types";

export class QdrantDB implements VectorStoreBase {
  private readonly config: Readonly<QdrantVectorStoreConfig>;
  private readonly collectionName: string;
  private readonly client: QdrantClient;

  constructor(config: QdrantVectorStoreConfig) {
    this.config = {
      ...config,
      embeddingModelDims: config.embeddingModelDims ?? 1536,
    };
    this.collectionName = config.collectionName;
    this.client = new QdrantClient({
      url: this.config.url,
      apiKey: this.config.apiKey,
      host: this.config.host,
      port: this.config.port,
    });
  }

  async createCollection(): Promise<void> {
    if ((await this.client.collectionExists(this.collectionName)).exists) {
      return;
    }
    await this.client.createCollection(this.collectionName, {
      vectors: {
        size: this.config.embeddingModelDims!,
        distance: "Cosine",
        on_disk: this.config.onDisk ?? false,
      },
    });
  }

  async insert(
    vectors: Array<number[]>,
    ids: Array<string>,
    payloads?: Array<VectorStoreDataPayload>,
  ): Promise<void> {
    await this.createCollection();
    const points = vectors.map((vector, index) => ({
      id: ids[index],
      vector,
      payload: payloads?.[index],
    }));
    await this.client.upsert(this.collectionName, {
      wait: true,
      points,
    });
  }

  async search(
    query: Array<number[]>,
    limit?: number,
    filters?: VectorStoreFilter,
  ): Promise<VectorStoreData[]> {
    await this.createCollection();
    const hits = await this.client.search(this.collectionName, {
      with_payload: true,
      with_vector: false,
      vector: query[0],
      limit: limit ?? 5,
      filter: this.createFilter(filters),
    });

    return hits.map((hit) => ({
      id: hit.id.toString(),
      score: hit.score,
      payload: hit.payload as VectorStoreDataPayload,
    }));
  }

  async delete(vectorId: string): Promise<void> {
    await this.client.delete(this.collectionName, {
      wait: true,
      points: [vectorId],
    });
  }

  async update(
    vectorId: string,
    vector: number[],
    payload: VectorStoreDataPayload,
  ): Promise<void> {
    await this.client.upsert(this.collectionName, {
      wait: true,
      points: [
        {
          id: vectorId,
          vector,
          payload,
        },
      ],
    });
  }

  async get(vectorId: string): Promise<VectorStoreData | null> {
    const result = await this.client.retrieve(this.collectionName, {
      ids: [vectorId],
      with_payload: true,
      with_vector: false,
    });
    if (result && result.length > 0) {
      return {
        id: result[0].id.toString(),
        payload: result[0].payload as VectorStoreDataPayload,
      };
    }
    return null;
  }

  async deleteCollection(): Promise<void> {
    await this.client.deleteCollection(this.collectionName);
  }

  async list(
    filters: VectorStoreFilter,
    limit?: number,
  ): Promise<VectorStoreData[]> {
    const hits = await this.client.scroll(this.collectionName, {
      with_payload: true,
      with_vector: false,
      limit: limit ?? 100,
      filter: this.createFilter(filters),
    });
    return hits.points.map((hit) => ({
      id: hit.id.toString(),
      payload: hit.payload as VectorStoreDataPayload,
    }));
  }

  private createFilter(filters?: VectorStoreFilter) {
    if (!filters) {
      return undefined;
    }
    const filter: Record<string, any> = {};
    if (filters.user_id) {
      filter.must = {
        key: "user_id",
        match: {
          value: filters.user_id,
        },
      };
    }
    return filter;
  }
}
