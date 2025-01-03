import { z } from "zod";
import {
  FACT_RETRIEVAL_PROMPT,
  getUpdateMemoryMessages,
} from "../configs/prompts";
import type { EmbeddingBase } from "../embeddings/base";
import type { LLMBase } from "../llms/base";
import type {
  AddRequestParams,
  AddedResponse,
  MemoryItem,
  GetAllRequestParams,
  SearchRequestParams,
  SearchResponse,
  DeleteAllRequestParams,
  MemoryHistory,
  MemoryCoreMessage,
  MemoryMetadata,
  LiteralValue,
  AddedMemoryWithAction,
  VectorStoreData,
  VectorStoreDataPayload,
} from "../types";
import { getUTCTime, parseMessages } from "../utils";
import type { VectorStoreBase } from "../vector_store/base";
import type { MemoryBase } from "./base";
import { SQLiteManager } from "./storage";
import { captureEvent } from "./telemetry";
import { v4 as uuid } from "uuid";
import md5 from "crypto-js/md5";
import type { GraphMemoryBase } from "../graphs/base";

export interface MemoryConfig {
  vectorStore: VectorStoreBase;
  llm: LLMBase;
  embedder: EmbeddingBase;
  graph: GraphMemoryBase;
  historyDBPath?: string;
  customPrompt?: string;
}

export class Memory implements MemoryBase {
  private config: MemoryConfig;
  readonly collectionName: string = ""; // TODO: get from config
  private readonly db: SQLiteManager;

  private vectorStore: VectorStoreBase;
  private llm: LLMBase;
  private embedder: EmbeddingBase;
  private graph: GraphMemoryBase;

  constructor(config: MemoryConfig) {
    this.config = {
      ...config,
    };
    this.vectorStore = config.vectorStore;
    this.llm = config.llm;
    this.embedder = config.embedder;
    this.graph = config.graph;
    this.db = new SQLiteManager(this.config.historyDBPath);
    captureEvent("mem0.init", this);
  }

  private async getVectorStore(): Promise<VectorStoreBase> {
    return this.vectorStore;
  }

  private async getLlm(): Promise<LLMBase> {
    return this.llm;
  }

  private async getEmbedder(): Promise<EmbeddingBase> {
    return this.embedder;
  }

  private async getGraph(): Promise<GraphMemoryBase> {
    return this.graph;
  }

  async add({
    messages,
    userId,
    agentId,
    runId,
    filters = {},
    metadata = {},
  }: AddRequestParams): Promise<AddedResponse> {
    if (userId) {
      filters["user_id"] = metadata["user_id"] = userId;
    }
    if (agentId) {
      filters["agent_id"] = metadata["agent_id"] = agentId;
    }
    if (runId) {
      filters["run_id"] = metadata["run_id"] = runId;
    }
    if (
      !Object.keys(filters).some((key) =>
        ["user_id", "agent_id", "run_id"].includes(key),
      )
    ) {
      throw new Error(
        "One of the filters: user_id, agent_id or run_id is required!",
      );
    }
    if (typeof messages === "string") {
      messages = [{ role: "user", content: messages }];
    }
    const results = await Promise.all([
      this.addToVectorStore(messages, metadata, filters),
      this.addToGraph(messages, filters),
    ]);
    return {
      results: results[0],
    };
  }

  private async addToVectorStore(
    messages: MemoryCoreMessage[],
    metadata: MemoryMetadata,
    filters: Record<string, LiteralValue>,
  ) {
    const parsedMessages = parseMessages(messages);
    let systemPrompt = "",
      userPrompt = "";
    if (this.config.customPrompt) {
      systemPrompt = this.config.customPrompt;
      userPrompt = `Input: ${parsedMessages}`;
    } else {
      systemPrompt = FACT_RETRIEVAL_PROMPT();
      userPrompt = `Input: ${parsedMessages}`;
    }
    const llm = await this.getLlm();
    const embedder = await this.getEmbedder();
    const vectorStore = await this.getVectorStore();

    // Get the facts from user messages by using the LLM
    let newRetrievedFacts: string[] = [];
    try {
      newRetrievedFacts = (
        await llm.generateObject(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          z.object({
            facts: z.array(z.string()),
          }),
        )
      ).facts;
    } catch (error) {
      console.error(`Error in new_retrieved_facts: ${error}`);
    }

    const retrievedOldMemory: Array<{ id: string; text: string }> = [];
    const newMessageEmbeddings: Record<string, number[]> = {};
    for (const fact of newRetrievedFacts) {
      const embedding = await embedder.embed(fact);
      newMessageEmbeddings[fact] = embedding;
      const existingMemory = await vectorStore.search([embedding], 5, filters);
      for (const mem of existingMemory) {
        retrievedOldMemory.push({ id: mem.id, text: mem.payload.data });
      }
    }

    // mapping UUIDs with integers for handling UUID hallucinations
    // When passing UUIDs to an LLM, the model might:
    //   - Be unable to accurately remember or repeat these complex UUIDs
    //   - Generate fictional UUIDs (this is what we call "hallucination")
    const tempUuidMapping: Record<string, string> = {};
    retrievedOldMemory.forEach((item, index) => {
      tempUuidMapping[index + ""] = item.id;
      retrievedOldMemory[index].id = index.toString();
    });

    const functionCallingPrompt = getUpdateMemoryMessages(
      retrievedOldMemory,
      newRetrievedFacts,
    );
    const newMemoriesWithActions = await llm.generateObject(
      [{ role: "user", content: functionCallingPrompt }],
      z.object({
        memory: z.array(
          z.object({
            id: z.string(),
            text: z.string(),
            old_memory: z.string().optional(),
            event: z.enum(["ADD", "UPDATE", "DELETE", "NONE"]),
          }),
        ),
      }),
    );
    const returnedMemories: AddedMemoryWithAction[] = (
      await Promise.all(
        newMemoriesWithActions.memory.map(async (resp) => {
          if (resp.event === "ADD") {
            const memoryId = await this.createMemory(
              resp.text,
              newMessageEmbeddings,
              metadata,
            );
            return {
              id: memoryId,
              memory: resp.text,
              event: resp.event,
            };
          } else if (resp.event === "UPDATE") {
            await this.updateMemory(
              tempUuidMapping[resp.id],
              resp.text,
              newMessageEmbeddings,
              metadata,
            );
            return {
              id: tempUuidMapping[resp.id],
              memory: resp.text,
              event: resp.event,
              previous_memory: resp.old_memory,
            };
          } else if (resp.event === "DELETE") {
            await this.deleteMemory(tempUuidMapping[resp.id]);
            return {
              id: tempUuidMapping[resp.id],
              memory: resp.text,
              event: resp.event,
            };
          } else if (resp.event === "NONE") {
            console.log(
              `No action needed for memory with id: ${tempUuidMapping[resp.id]}`,
            );
          }
          return null;
        }),
      )
    ).filter((item) => item !== null);

    captureEvent("mem0.add", this, { keys: Object.keys(filters).join(",") });
    return returnedMemories;
  }

  private async addToGraph(
    messages: MemoryCoreMessage[],
    filters: Record<string, LiteralValue>,
  ) {
    const data = messages
      .filter((message) => message.content && message.role !== "system")
      .map((message) => message.content)
      .join("\n");
    const graph = await this.getGraph();
    return await graph.add(data, filters);
  }

  async get(memoryId: string): Promise<MemoryItem | null> {
    captureEvent("mem0.get", this, { memory_id: memoryId });
    const vectorStore = await this.getVectorStore();
    const memory = await vectorStore.get(memoryId);
    if (!memory) {
      return null;
    }
    const filters = ["user_id", "agent_id", "run_id"].reduce(
      (acc, key) => {
        if (memory.payload?.[key]) {
          acc[key] = memory.payload[key];
        }
        return acc;
      },
      {} as Record<string, LiteralValue>,
    );
    const memoryItem: MemoryItem = {
      id: memory.id,
      memory: memory.payload.data,
      hash: memory.payload.hash,
      createdAt: memory.payload["created_at"] as string,
      updatedAt: memory.payload["updated_at"] as string,
    };
    const excludedKeys = new Set([
      "userId",
      "agentId",
      "runId",
      "hash",
      "data",
      "created_at",
      "updated_at",
    ]);

    const additionalMetadata = Object.fromEntries(
      Object.entries(memory.payload).filter(([key]) => !excludedKeys.has(key)),
    );
    memoryItem.metadata = additionalMetadata;

    return {
      ...memoryItem,
      ...filters,
    };
  }

  async getAll({
    userId,
    agentId,
    runId,
    limit = 100,
  }: GetAllRequestParams): Promise<MemoryItem[]> {
    const filters: Record<string, LiteralValue> = {};
    if (userId) {
      filters["user_id"] = userId;
    }
    if (agentId) {
      filters["agent_id"] = agentId;
    }
    if (runId) {
      filters["run_id"] = runId;
    }
    captureEvent("mem0.get_all", this, {
      keys: Object.keys(filters).join(","),
    });
    return (await Promise.all([this.getAllFromVectorStore(filters, limit)]))[0];
  }

  async search(params: SearchRequestParams): Promise<SearchResponse> {
    const defaultLimit = 100;
    const filters = params.filters || {};
    if (params.userId) {
      filters["user_id"] = params.userId;
    }
    if (params.agentId) {
      filters["agent_id"] = params.agentId;
    }
    if (params.runId) {
      filters["run_id"] = params.runId;
    }
    if (
      !Object.keys(filters).some((key) =>
        ["user_id", "agent_id", "run_id"].includes(key),
      )
    ) {
      throw new Error(
        "One of the filters: user_id, agent_id or run_id is required!",
      );
    }
    captureEvent("mem0.search", this, {
      limit: params.limit ?? defaultLimit,
      keys: Object.keys(filters).join(","),
    });

    const results = await Promise.all([
      this.searchVectorStore(
        params.query,
        filters,
        params.limit ?? defaultLimit,
      ),
    ]);
    return {
      results: results[0],
    };
  }

  async update(memoryId: string, data: string): Promise<void> {
    captureEvent("mem0.update", this, { memory_id: memoryId });
    const embedder = await this.getEmbedder();
    const existingEmbeddings = { [data]: await embedder.embed(data) };
    await this.updateMemory(memoryId, data, existingEmbeddings);
  }

  async delete(memoryId: string): Promise<void> {
    captureEvent("mem0.delete", this, { memory_id: memoryId });
    await this.deleteMemory(memoryId);
  }

  async deleteAll({
    userId,
    agentId,
    runId,
  }: DeleteAllRequestParams): Promise<void> {
    const filters: Record<string, LiteralValue> = {};
    if (userId) {
      filters["user_id"] = userId;
    }
    if (agentId) {
      filters["agent_id"] = agentId;
    }
    if (runId) {
      filters["run_id"] = runId;
    }
    if (!Object.keys(filters).length) {
      throw new Error(
        "At least one filter is required to delete all memories. If you want to delete all memories, use the `reset()` method.",
      );
    }
    captureEvent("mem0.delete_all", this, {
      keys: Object.keys(filters).join(","),
    });
    const vectorStore = await this.getVectorStore();
    const memories = await vectorStore.list(filters);
    await Promise.all(memories.map((mem) => this.deleteMemory(mem.id)));
    console.log(`Deleted ${memories.length} memories.`);
  }

  async history(memoryId: string): Promise<MemoryHistory[]> {
    captureEvent("mem.history", this, { memory_id: memoryId });
    return this.db.getHistory(memoryId);
  }

  async reset(): Promise<void> {
    console.log("Resetting all memories");
    const vectorStore = await this.getVectorStore();
    await vectorStore.deleteCollection();
    this.db.reset();
    captureEvent("mem0.reset", this);
  }

  private createMemoryItem(memory: VectorStoreData): MemoryItem {
    const excludedKeys = new Set([
      "user_id",
      "agent_id",
      "run_id",
      "hash",
      "data",
      "created_at",
      "updated_at",
    ]);
    const additionalMetadata = Object.fromEntries(
      Object.entries(memory.payload).filter(([key]) => !excludedKeys.has(key)),
    );
    const ids = ["user_id", "agent_id", "run_id"].reduce(
      (acc, key) => {
        if (memory.payload?.[key]) {
          acc[key] = memory.payload[key];
        }
        return acc;
      },
      {} as Record<string, LiteralValue>,
    );
    return {
      id: memory.id,
      memory: memory.payload.data,
      hash: memory.payload.hash,
      createdAt: memory.payload.created_at as string,
      updatedAt: memory.payload.updated_at as string,
      metadata: additionalMetadata,
      ...ids,
    };
  }

  private async searchVectorStore(
    query: string,
    filters: Record<string, LiteralValue>,
    limit: number,
  ): Promise<MemoryItem[]> {
    const embedder = await this.getEmbedder();
    const vectorStore = await this.getVectorStore();
    const embeddings = await embedder.embed(query);
    const memories = await vectorStore.search([embeddings], limit, filters);
    return memories.map((mem) => this.createMemoryItem(mem));
  }

  private async getAllFromVectorStore(
    filters: Record<string, LiteralValue>,
    limit: number,
  ): Promise<MemoryItem[]> {
    const vectorStore = await this.getVectorStore();
    const memories = await vectorStore.list(filters, limit);
    return memories.map((mem) => this.createMemoryItem(mem));
  }

  private async createMemory(
    data: string,
    existingEmbeddings: Record<string, number[]>,
    metadata?: MemoryMetadata,
  ): Promise<string> {
    const memoryId = uuid();
    console.log(`Creating memory ID: ${memoryId} with data: ${data}`);
    let embeddings: number[];
    if (existingEmbeddings[data]) {
      embeddings = existingEmbeddings[data];
    } else {
      const embedder = await this.getEmbedder();
      embeddings = await embedder.embed(data);
    }
    const newMetadata: VectorStoreDataPayload = {
      ...metadata,
      data,
      hash: md5(data).toString(),
      created_at: getUTCTime(),
    };

    const vectorStore = await this.getVectorStore();
    await vectorStore.insert([embeddings], [memoryId], [newMetadata]);
    this.db.addHistory({
      memoryId,
      oldMemory: "",
      newMemory: data,
      event: "ADD",
      createdAt: newMetadata.created_at as string,
    });
    captureEvent("mem0._create_memory", this, { memory_id: memoryId });
    return memoryId;
  }

  private async updateMemory(
    memoryId: string,
    data: string,
    existingEmbeddings: Record<string, number[]>,
    metadata?: MemoryMetadata,
  ): Promise<string> {
    console.log(`Updating memory with id: ${memoryId} and data: ${data}`);

    const vectorStore = await this.getVectorStore();
    const existingMemory = await vectorStore.get(memoryId);
    if (!existingMemory) {
      throw new Error(
        `Error getting memory with ID ${memoryId} not found. Please provide a valid 'memoryId'`,
      );
    }
    const prevValue = existingMemory.payload.data;
    const newMetadata: VectorStoreDataPayload = {
      ...metadata,
      data: data,
      hash: md5(data).toString(),
      created_at: existingMemory.payload.created_at as string,
      updated_at: new Date().toISOString(),
    };
    if (existingMemory.payload["user_id"]) {
      newMetadata.user_id = existingMemory.payload["user_id"] as string;
    }
    if (existingMemory.payload["agent_id"]) {
      newMetadata.agent_id = existingMemory.payload["agent_id"] as string;
    }
    if (existingMemory.payload["run_id"]) {
      newMetadata.run_id = existingMemory.payload["run_id"] as string;
    }
    const embedder = await this.getEmbedder();
    let embeddings: number[];
    if (existingEmbeddings[data]) {
      embeddings = existingEmbeddings[data];
    } else {
      embeddings = await embedder.embed(data);
    }
    await vectorStore.update(memoryId, embeddings, newMetadata);
    console.log(`Updating memory with ID ${memoryId} with ${data}`);
    this.db.addHistory({
      memoryId,
      oldMemory: prevValue,
      newMemory: data,
      event: "UPDATE",
      createdAt: newMetadata.created_at as string,
      updatedAt: newMetadata.updated_at as string,
    });
    captureEvent("mem0._update_memory", this, { memory_id: memoryId });
    return memoryId;
  }

  private async deleteMemory(memoryId: string): Promise<void> {
    console.log(`Deleting memory with ID ${memoryId}`);
    const vectorStore = await this.getVectorStore();
    const existingMemory = await vectorStore.get(memoryId);
    if (existingMemory) {
      const prevValue = existingMemory.payload.data;
      await vectorStore.delete(memoryId);
      this.db.addHistory({
        memoryId,
        oldMemory: prevValue,
        newMemory: "",
        event: "DELETE",
        isDeleted: true,
      });
      captureEvent("mem0._delete_memory", this, { memory_id: memoryId });
    }
  }
}
