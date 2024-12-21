export interface BaseEmbeddingConfig {
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  embeddingDims?: number;
  headers?: Record<string, string>;
}

export type OpenAIEmbeddingConfig = BaseEmbeddingConfig;

export type GeminiEmbeddingConfig = BaseEmbeddingConfig;
