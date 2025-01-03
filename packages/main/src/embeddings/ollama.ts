import type { EmbeddingBase } from "./base";
import type { BaseEmbeddingConfig } from "../types";
import { embed } from "ai";
import { createOllama, type OllamaProvider } from "ollama-ai-provider";

export type OllamaEmbedderConfig = Omit<
  BaseEmbeddingConfig,
  "apiKey" | "embeddingDims"
>;

export class OllamaEmbedding implements EmbeddingBase {
  private readonly config: Readonly<OllamaEmbedderConfig>;
  private readonly client: OllamaProvider;

  constructor(config?: OllamaEmbedderConfig) {
    this.config = {
      ...config,
      model: config?.model ?? "nomic-embed-text",
    };
    this.client = createOllama({
      baseURL: config?.baseUrl,
      headers: config?.headers,
    });
  }

  async embed(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.client.embedding(this.config.model!, {}),
      value: text.replace(/\n/g, " "),
    });
    return embedding;
  }
}
