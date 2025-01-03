import { createAITools, type LLMBase } from "./base";
import type {
  GeminiLLMConfig,
  LLMTool,
  LLMToolCall,
  LLMToolChoice,
  MemoryCoreMessage,
} from "../types";
import { generateObject, generateText } from "ai";
import {
  createGoogleGenerativeAI,
  type GoogleGenerativeAIProvider,
} from "@ai-sdk/google";
import type { z, ZodType, ZodTypeDef } from "zod";
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
    toolCalls: LLMToolCall<TOOL["name"], z.infer<TOOL["parameters"]>>[];
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
      toolCalls: toolCalls.map((tool) => ({
        name: tool.toolName,
        parameters: tool.args,
      })),
    };
  }
}
