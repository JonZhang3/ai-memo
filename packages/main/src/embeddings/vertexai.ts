import type { EmbeddingBase } from "./base";
import { embed } from "ai";
import {
  createVertex,
  type GoogleVertexProvider,
  type GoogleVertexProviderSettings,
} from "@ai-sdk/google-vertex";

export interface VertexAIEmbedderConfig extends GoogleVertexProviderSettings {
  model?: string;
  embeddingDims?: number;
  baseUrl?: string;
}

export class VertexAIEmbedding implements EmbeddingBase {
  private readonly config: Readonly<VertexAIEmbedderConfig>;
  private readonly client: GoogleVertexProvider;

  constructor(config?: VertexAIEmbedderConfig) {
    this.config = {
      ...config,
      model: config?.model ?? "text-embedding-004",
      embeddingDims: config?.embeddingDims ?? 256,
    };
    this.client = createVertex({
      project: this.config.project,
      location: this.config.location,
      baseURL: this.config.baseUrl ?? this.config.baseURL,
      headers: this.config.headers,
      googleAuthOptions: this.config.googleAuthOptions,
    });
  }

  async embed(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.client.textEmbeddingModel(this.config.model!),
      value: text.replace(/\n/g, " "),
    });
    return embedding;
  }
}
