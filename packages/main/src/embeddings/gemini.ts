import type { EmbeddingBase } from "./base";
import type { GeminiEmbeddingConfig } from "../types";
import { embed } from "ai";
import {
  createGoogleGenerativeAI,
  type GoogleGenerativeAIProvider,
} from "@ai-sdk/google";
import { GEMINI_API_KEY, GEMINI_API_BASE_URL } from "../configs/env.config";

export class GoogleGenAIEmbedding implements EmbeddingBase {
  private readonly config: Readonly<GeminiEmbeddingConfig>;
  private readonly client: GoogleGenerativeAIProvider;

  constructor(config?: GeminiEmbeddingConfig) {
    this.config = {
      ...config,
      model: config?.model ?? "text-embedding-004",
      embeddingDims: config?.embeddingDims ?? 768,
      apiKey: config?.apiKey ?? GEMINI_API_KEY,
      baseUrl: config?.baseUrl ?? GEMINI_API_BASE_URL,
    };
    this.client = createGoogleGenerativeAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      headers: this.config.headers,
    });
  }

  async embed(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.client.textEmbeddingModel(this.config.model!, {
        outputDimensionality: this.config.embeddingDims,
      }),
      value: text.replace(/\n/g, " "),
    });
    return embedding;
  }
}
