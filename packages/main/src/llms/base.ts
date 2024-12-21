import type { z } from "zod";
import type { LLMTool, LLMToolChoice, MemoryCoreMessage } from "../types";
import type { CoreTool } from "ai";

export interface LLMBase {
  readonly provider: string;

  generateObject<OBJECT>(
    messages: MemoryCoreMessage[],
    schema: z.Schema<OBJECT, z.ZodTypeDef, any>,
  ): Promise<OBJECT>;

  generateText(
    messages: MemoryCoreMessage[],
    tools?: LLMTool[],
    toolChoice?: LLMToolChoice,
  ): Promise<string>;
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
