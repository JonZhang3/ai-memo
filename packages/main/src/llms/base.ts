import type { z } from "zod";
import type {
  LLMTool,
  LLMToolChoice,
  MemoryCoreMessage,
  LLMToolCall,
} from "../types";
import type { CoreTool } from "ai";

export interface LLMBase {
  readonly provider: string;

  generateObject<OBJECT>(
    messages: MemoryCoreMessage[],
    schema: z.Schema<OBJECT, z.ZodTypeDef, any>,
  ): Promise<OBJECT>;

  generateText(messages: MemoryCoreMessage[]): Promise<string>;

  generateTextWithToolCalls<TOOL extends LLMTool>(
    messages: MemoryCoreMessage[],
    tools?: TOOL[],
    toolChoice?: LLMToolChoice,
  ): Promise<{
    text: string;
    toolCalls: LLMToolCall<TOOL["name"], z.infer<TOOL["parameters"]>>[];
  }>;
}

export function createAITools(tools: LLMTool[]): Record<string, CoreTool> {
  const result: Record<string, CoreTool> = {};
  tools.forEach((tool) => {
    result[tool.name] = {
      description: tool.description,
      parameters: tool.parameters,
    };
  });
  return result;
}
