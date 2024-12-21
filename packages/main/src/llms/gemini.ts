import { createAITools, type LLMBase } from "./base";
import type {
  GeminiLLMConfig,
  LLMTool,
  LLMToolChoice,
  MemoryCoreMessage,
} from "../types";
import { generateObject, generateText } from "ai";
import {
  createGoogleGenerativeAI,
  type GoogleGenerativeAIProvider,
} from "@ai-sdk/google";
import type { ZodType, ZodTypeDef } from "zod";
import { GEMINI_API_KEY, GEMINI_API_BASE_URL } from "../configs/env.config";

export class GeminiLLM implements LLMBase {
  private readonly config: Readonly<GeminiLLMConfig>;
  private readonly client: GoogleGenerativeAIProvider;

  constructor(config?: GeminiLLMConfig) {
    this.config = {
      ...config,
      model: config?.model ?? "gemini-1.5-flash-latest",
      apiKey: config?.apiKey ?? GEMINI_API_KEY,
      baseUrl: config?.baseUrl ?? GEMINI_API_BASE_URL,
    };
    this.client = createGoogleGenerativeAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      headers: this.config.headers,
    });
  }
  readonly provider: string = "gemini";

  async generateObject<OBJECT>(
    messages: MemoryCoreMessage[],
    schema: ZodType<OBJECT, ZodTypeDef, any>,
  ): Promise<OBJECT> {
    const { object } = await generateObject({
      model: this.client(this.config.model!),
      messages,
      schema,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      topP: this.config.topP,
      topK: this.config.topK,
    });
    return object;
  }

  async generateText(
    messages: MemoryCoreMessage[],
    tools?: LLMTool[],
    toolChoice?: LLMToolChoice,
  ): Promise<string> {
    const { text } = await generateText({
      model: this.client(this.config.model!),
      messages,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      topP: this.config.topP,
      topK: this.config.topK,
      tools: tools ? createAITools(tools) : undefined,
      toolChoice: tools ? toolChoice || "auto" : undefined,
    });
    return text;
  }
}
