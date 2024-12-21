import type {
  AddedResponse,
  AddRequestParams,
  DeleteAllRequestParams,
  GetAllRequestParams,
  MemoryHistory,
  MemoryItem,
  SearchRequestParams,
  SearchResponse,
} from "../types";

export interface MemoryBase {
  /**
   * Create a new memory.
   * @param params - The parameters for creating a memory.
   */
  add(params: AddRequestParams): Promise<AddedResponse>;

  /**
   * Retrieve a memory by ID.
   * @param memoryId - The ID of the memory to retrieve.
   */
  get(memoryId: string): Promise<MemoryItem | null>;

  /**
   * List all memories.
   */
  getAll(params: GetAllRequestParams): Promise<MemoryItem[]>;

  search(params: SearchRequestParams): Promise<SearchResponse>;

  /**
   * Update a memory by ID.
   * @param memoryId - The ID of the memory to update.
   * @param data - The new data to update the memory with.
   */
  update(memoryId: string, data: string): Promise<void>;

  /**
   * Delete a memory by ID.
   * @param memoryId - The ID of the memory to delete.
   */
  delete(memoryId: string): Promise<void>;

  deleteAll(params: DeleteAllRequestParams): Promise<void>;

  /**
   * Get the history of changes for a memory by ID.
   * @param memoryId - The ID of the memory to get the history of.
   */
  history(memoryId: string): Promise<MemoryHistory[]>;
}
