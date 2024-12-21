import os from "node:os";
import path from "node:path";
import { version } from "../../package.json";

export const VERSION = version;

export const MEM0_TELEMETRY = false;

export const MEM0_DIR =
  process.env.MEM0_DIR || path.join(os.homedir(), ".mem0");

export const USER_ID = process.env.USER_ID || "anonymous_user";

export const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || "";
export const POSTHOG_HOST = process.env.POSTHOG_HOST || "";

// LLM
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL;
