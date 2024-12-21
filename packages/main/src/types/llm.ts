import type { z } from "zod";

export interface LLMTool {
  name: string;
  description: string;
  parameters: z.Schema<any, z.ZodTypeDef, any>;
}

export type LLMToolChoice = "auto" | "none" | "required";

export interface BaseLLMConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topK?: number;
  topP?: number;
  headers?: Record<string, string>;
}

export type OpenAILLMConfig = BaseLLMConfig;

export type GeminiLLMConfig = BaseLLMConfig;
