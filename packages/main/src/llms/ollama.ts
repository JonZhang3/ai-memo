import type {
  BaseLLMConfig,
  MemoryCoreMessage,
  LLMTool,
  LLMToolChoice,
  LLMToolCall,
} from "../types";
import type { ZodType, ZodTypeDef, TypeOf } from "zod";
import { type LLMBase, createAITools } from "./base";
import { generateObject, generateText } from "ai";
import { createOllama, type OllamaProvider } from "ollama-ai-provider";

export type OllamaLLMConfig = Omit<BaseLLMConfig, "apiKey">;

export class OllamaLLM implements LLMBase {
  private readonly config: Readonly<OllamaLLMConfig>;
  private readonly client: OllamaProvider;

  constructor(config: OllamaLLMConfig) {
    this.config = {
      ...config,
      model: config?.model ?? "llama3.1:70b",
    };
    this.client = createOllama({
      baseURL: config?.baseUrl,
      headers: config?.headers,
    });
  }

  provider: string = "ollama";

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
