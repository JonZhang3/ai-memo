import type { MemoryMetadata, MemoryFilter } from "./memory";

export type VectorStoreDataPayload = MemoryMetadata & {
  data: string;
  hash: string;
};

export interface VectorStoreData {
  id: string;
  score?: number;
  payload: VectorStoreDataPayload;
}

export type VectorStoreFilter = MemoryFilter;

export interface QdrantVectorStoreConfig {
  collectionName: string;
  url?: string;
  host?: string;
  port?: number;
  apiKey?: string;
  onDisk?: boolean;
  embeddingModelDims?: number;
}
