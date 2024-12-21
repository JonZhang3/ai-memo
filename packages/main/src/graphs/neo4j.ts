import "neo4j-driver";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import type { GraphMemoryBase } from "./base";
import type { Neo4jGraphMemoryConfig, LiteralValue } from "../types";
import type { LLMBase } from "../llms/base";
import type { EmbeddingBase } from "../embeddings/base";

export class Neo4jGraphMemory implements GraphMemoryBase {
  private readonly config: Readonly<Neo4jGraphMemoryConfig>;
  private readonly llm?: LLMBase;
  private readonly embedding?: EmbeddingBase;
  private readonly client: Neo4jGraph;

  constructor(
    config: Neo4jGraphMemoryConfig & {
      llm?: LLMBase;
      embedding?: EmbeddingBase;
    },
  ) {
    this.config = {
      ...config,
    };
    this.llm = config.llm;
    this.embedding = config.embedding;
    this.client = new Neo4jGraph({
      url: config.url,
      username: config.username,
      password: config.password,
      database: config.database,
    });
  }

  async add(
    data: string,
    filters: Record<string, LiteralValue>,
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
  search(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  deleteAll(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  getAll(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  private async _search(
    query: string,
    filters: Record<string, LiteralValue>,
    limit: number = 100,
  ) {}
}
