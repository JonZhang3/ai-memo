import type { LiteralValue } from "./base";

export interface MemoryItem {
  id: string;
  memory: string;
  hash?: string;
  metadata?: Record<string, LiteralValue | undefined>;
  score?: number;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  agentId?: string;
  runId?: string;
  [key: string]:
    | LiteralValue
    | undefined
    | Record<string, LiteralValue | undefined>;
}

export type MemoryCoreMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type MemoryMessages = string | MemoryCoreMessage[];

export type MemoryMetadata = Record<string, LiteralValue>;

export type MemoryFilter = Record<string, unknown>;

export interface AddRequestParams {
  messages: MemoryMessages;
  userId?: string;
  agentId?: string;
  runId?: string;
  metadata?: MemoryMetadata;
  filters?: Record<string, LiteralValue>;
}

export interface GetAllRequestParams {
  userId?: string;
  agentId?: string;
  runId?: string;
  limit?: number;
}

export interface SearchRequestParams {
  query: string;
  userId?: string;
  agentId?: string;
  runId?: string;
  limit?: number;
  filters?: Record<string, LiteralValue>;
}

export interface DeleteAllRequestParams {
  userId: string;
  agentId: string;
  runId: string;
}

// Response types

export interface AddedMemoryWithAction {
  id: string;
  memory: string;
  event: "ADD" | "UPDATE" | "DELETE";
  previous_memory?: string;
}

export interface AddedResponse {
  results: AddedMemoryWithAction[];
}

export interface GetAllResponse {
  results: MemoryItem[];
}

export interface SearchResponse {
  results: MemoryItem[];
}

export interface MemoryHistory {
  id: string;
  memoryId: string;
  oldMemory: string;
  newMemory: string;
  event: "ADD" | "DELETE" | "UPDATE";
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}
