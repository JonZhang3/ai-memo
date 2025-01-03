import "neo4j-driver";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import type { GraphMemoryBase } from "./base";
import type {
  Neo4jGraphMemoryConfig,
  LiteralValue,
  MemoryCoreMessage,
} from "../types";
import type { LLMBase } from "../llms/base";
import type { EmbeddingBase } from "../embeddings/base";
import {
  EXTRACT_ENTITIES_STRUCT_TOOL,
  EXTRACT_ENTITIES_TOOL,
  RELATIONS_STRUCT_TOOL,
  RELATIONS_TOOL,
} from "./common";
import { EXTRACT_RELATIONS_PROMPT } from "./common/prompts";

export class Neo4jGraphMemory implements GraphMemoryBase {
  private readonly config: Readonly<Neo4jGraphMemoryConfig>;
  private readonly llm: LLMBase;
  private readonly embedder: EmbeddingBase;
  private readonly client: Neo4jGraph;
  private readonly threshold: number = 0.7;

  constructor(
    config: Neo4jGraphMemoryConfig & {
      llm: LLMBase;
      embedder: EmbeddingBase;
    },
  ) {
    this.config = {
      ...config,
    };
    this.llm = config.llm;
    this.embedder = config.embedder;
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
    const [searchResults, entityTypeMap] = await this._search(data, filters);
  }
  search(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  async deleteAll(filters: Record<string, LiteralValue>): Promise<void> {
    const cypher = ``;
  }
  getAll(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  private async _search(
    query: string,
    filters: Record<string, LiteralValue>,
    limit: number = 100,
  ) {
    let tools = [EXTRACT_ENTITIES_TOOL];
    if (this.llm.provider === "openai") {
      tools = [EXTRACT_ENTITIES_STRUCT_TOOL];
    }
    const searchResults = await this.llm.generateTextWithToolCalls(
      [
        {
          role: "system",
          content: `
        You are a smart assistant who understands entities and their types in a given text. If user message contains self reference such as 'I', 'me', 'my' etc. then use ${filters.user_id} as the source entity. Extract all the entities from the text. ***DO NOT*** answer the question itself if the given text is a question.
        `,
        },
      ],
      tools,
    );
    const entityTypeMap: Record<string, string> = {};
    searchResults.toolCalls[0].parameters.entities.forEach((item: any) => {
      entityTypeMap[item.entity] = item.entity_type;
    });
    const resultRelations = [];
    for (const node of Object.keys(entityTypeMap)) {
      const embedding = await this.embedder.embed(node);
      const cypherQuery = `
      MATCH (n)
      WHERE n.embedding IS NOT NULL AND n.user_id = $user_id
      WITH n,
          round(reduce(dot = 0.0, i IN range(0, size(n.embedding)-1) | dot + n.embedding[i] * $n_embedding[i]) /
          (sqrt(reduce(l2 = 0.0, i IN range(0, size(n.embedding)-1) | l2 + n.embedding[i] * n.embedding[i])) *
          sqrt(reduce(l2 = 0.0, i IN range(0, size($n_embedding)-1) | l2 + $n_embedding[i] * $n_embedding[i]))), 4) AS similarity
      WHERE similarity >= $threshold
      MATCH (n)-[r]->(m)
      RETURN n.name AS source, elementId(n) AS source_id, type(r) AS relation, elementId(r) AS relation_id, m.name AS destination, elementId(m) AS destination_id, similarity
      UNION
      MATCH (n)
      WHERE n.embedding IS NOT NULL AND n.user_id = $user_id
      WITH n,
          round(reduce(dot = 0.0, i IN range(0, size(n.embedding)-1) | dot + n.embedding[i] * $n_embedding[i]) /
          (sqrt(reduce(l2 = 0.0, i IN range(0, size(n.embedding)-1) | l2 + n.embedding[i] * n.embedding[i])) *
          sqrt(reduce(l2 = 0.0, i IN range(0, size($n_embedding)-1) | l2 + $n_embedding[i] * $n_embedding[i]))), 4) AS similarity
      WHERE similarity >= $threshold
      MATCH (m)-[r]->(n)
      RETURN m.name AS source, elementId(m) AS source_id, type(r) AS relation, elementId(r) AS relation_id, n.name AS destination, elementId(n) AS destination_id, similarity
      ORDER BY similarity DESC
      LIMIT $limit
      `;
      const params = {
        n_embedding: embedding,
        threshold: this.threshold,
        user_id: filters.user_id,
        limit: limit,
      };
      const ans = await this.client.query(cypherQuery, params);
      resultRelations.push(...ans);
    }
    return [resultRelations, entityTypeMap];
  }

  private async extractRelations(
    data: string,
    filters: Record<string, LiteralValue>,
    entityTypeMap: Record<string, string>,
  ): Promise<
    {
      source_entity: string;
      relation: string;
      destination_entity: string;
    }[]
  > {
    let messages: MemoryCoreMessage[];
    if (this.config.customPrompt) {
      messages = [
        {
          role: "system",
          content: EXTRACT_RELATIONS_PROMPT(
            filters.user_id as string,
            `4. ${this.config.customPrompt}`,
          ),
        },
        { role: "user", content: data },
      ];
    } else {
      messages = [
        {
          role: "system",
          content: EXTRACT_RELATIONS_PROMPT(filters.user_id as string, ""),
        },
        {
          role: "user",
          content: `List of entities: ${Array.from(Object.keys(entityTypeMap))}.\n\n Text: ${data}`,
        },
      ];
    }
    let tools = [RELATIONS_TOOL];
    if (this.llm.provider === "openai") {
      tools = [RELATIONS_STRUCT_TOOL];
    }
    const llmResult = await this.llm.generateTextWithToolCalls(messages, tools);
    const extractedEntities = llmResult.toolCalls[0].parameters.entities;
    console.debug(`Extracted entities: ${extractedEntities}`);
    return extractedEntities;
  }

  private async updateRelationship() {}
}
