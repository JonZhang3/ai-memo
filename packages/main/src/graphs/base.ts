import type { LiteralValue } from "../types/base";

export interface GraphMemoryBase {
  add(data: string, filters: Record<string, LiteralValue>): Promise<void>;
  search(): Promise<void>;
  deleteAll(): Promise<void>;
  getAll(): Promise<void>;
}
