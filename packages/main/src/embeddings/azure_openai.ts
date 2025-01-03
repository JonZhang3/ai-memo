import type { EmbeddingBase } from "./base";
import { embed } from "ai";
import { createAzure, type AzureOpenAIProvider } from "@ai-sdk/azure";

export interface AzureOpenAIEmbedderConfig {
  deploymentId: string;
  apiKey?: string;
  resourceName?: string;
  baseURL?: string;
  version?: string;
  embeddingDims?: number;
  headers?: Record<string, string>;
}

export class AzureOpenAIEmbedding implements EmbeddingBase {
  private readonly config: Readonly<AzureOpenAIEmbedderConfig>;
  private readonly client: AzureOpenAIProvider;

  constructor(config: AzureOpenAIEmbedderConfig) {
    this.config = {
      ...config,
      apiKey: config?.apiKey ?? process.env.EMBEDDING_AZURE_OPENAI_API_KEY,
      resourceName:
        config?.resourceName ?? process.env.EMBEDDING_AZURE_RESOURCE_NAME,
      baseURL: config?.baseURL ?? process.env.EMBEDDING_AZURE_ENDPOINT,
      version: config?.version ?? process.env.EMBEDDING_AZURE_API_VERSION,
    };
    this.client = createAzure({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      apiVersion: this.config.version,
      headers: this.config.headers,
    });
  }

  async embed(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.client.textEmbeddingModel(this.config.deploymentId, {
        dimensions: this.config.embeddingDims,
      }),
      value: text.replace(/\n/g, " "),
    });
    return embedding;
  }
}
