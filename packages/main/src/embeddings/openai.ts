import type { EmbeddingBase } from "./base";
import type { OpenAIEmbeddingConfig } from "../types";
import { embed } from "ai";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { OPENAI_API_KEY, OPENAI_API_BASE_URL } from "../configs/env.config";

export class OpenAIEmbedding implements EmbeddingBase {
  private readonly config: Readonly<OpenAIEmbeddingConfig>;
  private readonly client: OpenAIProvider;

  constructor(config?: OpenAIEmbeddingConfig) {
    this.config = {
      ...config,
      model: config?.model ?? "text-embedding-3-small",
      embeddingDims: config?.embeddingDims ?? 1536,
      apiKey: config?.apiKey ?? OPENAI_API_KEY,
      baseUrl:
        config?.baseUrl ?? OPENAI_API_BASE_URL ?? "https://api.openai.com/v1",
    };
    this.client = createOpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      headers: this.config.headers,
    });
  }

  async embed(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.client.embedding(this.config.model!, {
        dimensions: this.config.embeddingDims,
      }),
      value: text.replace(/\n/g, " "),
    });
    return embedding;
  }
}
