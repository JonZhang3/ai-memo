import type {
  VectorStoreData,
  VectorStoreDataPayload,
  VectorStoreFilter,
} from "../types";

export interface VectorStoreBase {
  /**
   * Create a new collection.
   */
  createCollection(): Promise<void>;

  /**
   * Insert vectors into a collection.
   */
  insert(
    vectors: Array<number[]>,
    ids: Array<string>,
    payloads?: Array<VectorStoreDataPayload>,
  ): Promise<void>;

  search(
    query: Array<number[]>,
    limit?: number,
    filters?: VectorStoreFilter,
  ): Promise<VectorStoreData[]>;

  delete(vectorId: string): Promise<void>;

  update(
    vectorId: string,
    vector: number[],
    payload: VectorStoreDataPayload,
  ): Promise<void>;

  get(vectorId: string): Promise<VectorStoreData | null>;

  deleteCollection(): Promise<void>;

  list(filters: VectorStoreFilter, limit?: number): Promise<VectorStoreData[]>;
}
