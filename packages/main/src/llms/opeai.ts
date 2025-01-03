import { type LLMBase, createAITools } from "./base";
import type { z, ZodType, ZodTypeDef } from "zod";
import type {
  MemoryCoreMessage,
  LLMTool,
  LLMToolChoice,
  LLMToolCall,
} from "../types";
import { generateObject, generateText } from "ai";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import type { OpenAILLMConfig } from "../types";
import { OPENAI_API_KEY, OPENAI_API_BASE_URL } from "../configs/env.config";

export class OpenAILLM implements LLMBase {
  private readonly config: Readonly<OpenAILLMConfig>;
  private readonly client: OpenAIProvider;

  constructor(config?: OpenAILLMConfig) {
    this.config = {
      ...config,
      model: config?.model ?? "gpt-4o",
      baseUrl:
        config?.baseUrl ?? OPENAI_API_BASE_URL ?? "https://api.openai.com/v1",
      apiKey: config?.apiKey ?? OPENAI_API_KEY,
    };
    this.client = createOpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      headers: this.config.headers,
    });
  }

  readonly provider: string = "openai";

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
      toolCalls: Object.values(toolCalls).map((tool) => ({
        name: tool.toolName,
        parameters: tool.args,
      })),
    };
  }
}
