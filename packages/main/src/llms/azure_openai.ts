import type {
  MemoryCoreMessage,
  LLMTool,
  LLMToolChoice,
  LLMToolCall,
  BaseLLMConfig,
} from "../types";
import type { ZodType, ZodTypeDef, TypeOf } from "zod";
import { type LLMBase, createAITools } from "./base";
import { generateObject, generateText } from "ai";
import { createAzure, type AzureOpenAIProvider } from "@ai-sdk/azure";

export type AzureOpenAILLMConfig = BaseLLMConfig & {
  deploymentId: string;
  resourceName?: string;
  version?: string;
  embeddingDims?: number;
};

export class AzureOpenAILLM implements LLMBase {
  private readonly config: Readonly<AzureOpenAILLMConfig>;
  private readonly client: AzureOpenAIProvider;

  constructor(config: AzureOpenAILLMConfig) {
    this.config = {
      ...config,
      apiKey: config?.apiKey ?? process.env.LLM_AZURE_OPENAI_API_KEY,
      resourceName: config?.resourceName ?? process.env.LLM_AZURE_RESOURCE_NAME,
      baseUrl: config?.baseUrl ?? process.env.LLM_AZURE_ENDPOINT,
      version: config?.version ?? process.env.LLM_AZURE_API_VERSION,
    };
    this.client = createAzure({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      apiVersion: this.config.version,
      headers: this.config.headers,
    });
  }

  provider: string = "azure-openai";

  async generateObject<OBJECT>(
    messages: MemoryCoreMessage[],
    schema: ZodType<OBJECT, ZodTypeDef, any>,
  ): Promise<OBJECT> {
    const { object } = await generateObject({
      model: this.client(this.config.deploymentId),
      messages,
      schema,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      topP: this.config.topP,
      topK: this.config.topK,
    });
    return object;
  }

  async generateText(messages: MemoryCoreMessage[]): Promise<string> {
    const { text } = await generateText({
      model: this.client(this.config.model!),
      messages,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      topP: this.config.topP,
      topK: this.config.topK,
    });
    return text;
  }

  async generateTextWithToolCalls<TOOL extends LLMTool>(
    messages: MemoryCoreMessage[],
    tools?: TOOL[],
    toolChoice?: LLMToolChoice,
  ): Promise<{
    text: string;
    toolCalls: LLMToolCall<TOOL["name"], TypeOf<TOOL["parameters"]>>[];
  }> {
    const { text, toolCalls } = await generateText({
      model: this.client(this.config.model!),
      messages,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      topP: this.config.topP,
      topK: this.config.topK,
      tools: tools ? createAITools(tools) : undefined,
      toolChoice: tools ? toolChoice || "auto" : undefined,
    });
    return {
      text,
      toolCalls: Object.values(toolCalls).map((tool) => ({
        name: tool.toolName,
        parameters: tool.args,
      })),
    };
  }
}
