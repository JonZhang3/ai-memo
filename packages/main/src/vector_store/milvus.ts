import type {
  VectorStoreDataPayload,
  VectorStoreFilter,
  VectorStoreData,
} from "src/types";
import type { VectorStoreBase } from "./base";
import {
  MilvusClient,
  IndexType,
  DataType,
  MetricType,
} from "@zilliz/milvus2-sdk-node";
import type { ClientConfig } from "@zilliz/milvus2-sdk-node";

export interface MilvusDBConfig extends ClientConfig {
  collectionName: string;
  embeddingModelDims?: number;
  metricType?: MetricType;
}

export class MilvusDB implements VectorStoreBase {
  private readonly config: Readonly<MilvusDBConfig>;
  private readonly collectionName: string;
  private readonly client: MilvusClient;

  constructor(config: MilvusDBConfig) {
    this.config = {
      ...config,
      embeddingModelDims: config.embeddingModelDims ?? 1536,
      metricType: config.metricType ?? MetricType.COSINE,
    };
    this.collectionName = config.collectionName;
    this.client = new MilvusClient(this.config);
  }

  async createCollection(): Promise<void> {
    if (
      await this.client.hasCollection({ collection_name: this.collectionName })
    ) {
      return;
    }
    await this.client.createCollection({
      collection_name: this.collectionName,
      enable_dynamic_field: true,
      index_params: [
        {
          index_name: "vector_index",
          index_type: IndexType.AUTOINDEX,
          field_name: "vectors",
          metric_type: this.config.metricType,
        },
      ],
      fields: [
        {
          name: "id",
          data_type: DataType.VarChar,
          is_primary_key: true,
          max_length: 512,
        },
        {
          name: "vectors",
          data_type: DataType.FloatVector,
          dim: this.config.embeddingModelDims,
        },
        {
          name: "metadata",
          data_type: DataType.JSON,
        },
      ],
    });
  }

  async insert(
    vectors: Array<number[]>,
    ids: Array<string>,
    payloads?: Array<VectorStoreDataPayload>,
  ): Promise<void> {
    await this.createCollection();
    const data = vectors.map((vector, index) => ({
      id: ids[index],
      vectors: vector,
      metadata: payloads?.[index],
    }));
    await this.client.upsert({
      collection_name: this.collectionName,
      data,
    });
  }

  async search(
    query: Array<number[]>,
    limit?: number,
    filters?: VectorStoreFilter,
  ): Promise<VectorStoreData[]> {
    const filter = this.createFilter(filters);
    const data = await this.client.search({
      collection_name: this.collectionName,
      data: query,
      limit: limit ?? 5,
      output_fields: ["*"],
      filter,
    });
    return data.results.map(
      (item) =>
        ({
          id: item.id,
          score: item.score,
          payload: item.metadata,
        }) as VectorStoreData,
    );
  }

  async delete(vectorId: string): Promise<void> {
    await this.client.delete({
      collection_name: this.collectionName,
      ids: [vectorId],
    });
  }

  async update(
    vectorId: string,
    vector: number[],
    payload: VectorStoreDataPayload,
  ): Promise<void> {
    const data = {
      id: vectorId,
      vectors: vector,
      metadata: payload,
    };
    await this.client.upsert({
      collection_name: this.collectionName,
      data: [data],
    });
  }

  async get(vectorId: string): Promise<VectorStoreData | null> {
    const res = await this.client.get({
      collection_name: this.collectionName,
      ids: [vectorId],
    });
    return {
      id: res.data[0].id,
      payload: res.data[0].metadata,
    } as VectorStoreData;
  }

  async deleteCollection(): Promise<void> {
    const res = await this.client.dropCollection({
      collection_name: this.collectionName,
    });
    console.log(
      `MilvusDB: Dropped collection ${this.collectionName} with result:`,
      res,
    );
  }

  async list(
    filters: VectorStoreFilter,
    limit?: number,
  ): Promise<VectorStoreData[]> {
    const filter = this.createFilter(filters);
    const data = await this.client.query({
      collection_name: this.collectionName,
      limit: limit ?? 100,
      filter,
      output_fields: ["*"],
    });
    return data.data.map(
      (item) =>
        ({
          id: item.id,
          payload: item.metadata,
        }) as VectorStoreData,
    );
  }

  private createFilter(filters?: VectorStoreFilter): string {
    const result = [];
    for (const [key, value] of Object.entries(filters ?? {})) {
      if (typeof value === "string") {
        result.push(`(metadata["${key}"] == "${value}")`);
      } else {
        result.push(`(metadata["${key}"] == ${value})`);
      }
    }
    return result.length > 0 ? result.join(" and ") : "";
  }
}
