import type { EmbeddingBase } from "./base";
import type { BaseEmbeddingConfig } from "../types";
import { embed } from "ai";
import { createTogetherAI, type TogetherAIProvider } from "@ai-sdk/togetherai";

export type TogetherEmbedderConfig = BaseEmbeddingConfig;

export class TogetherEmbedding implements EmbeddingBase {
  private readonly config: Readonly<TogetherEmbedderConfig>;
  private readonly client: TogetherAIProvider;

  constructor(config?: TogetherEmbedderConfig) {
    this.config = {
      ...config,
      model: config?.model ?? "togethercomputer/m2-bert-80M-8k-retrieval",
      apiKey: config?.apiKey ?? process.env.TOGETHER_API_KEY,
      embeddingDims: config?.embeddingDims ?? 768,
    };
    this.client = createTogetherAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      headers: this.config.headers,
    });
  }

  async embed(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.client.textEmbeddingModel(this.config.model!, {
        dimensions: this.config.embeddingDims,
      }),
      value: text.replace(/\n/g, " "),
    });
    return embedding;
  }
}
