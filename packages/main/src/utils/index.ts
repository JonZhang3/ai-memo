import type { MemoryMessages } from "../types";
import { formatInTimeZone } from "date-fns-tz";

export function getPacificTime(date?: Date): string {
  return formatInTimeZone(
    date || new Date(),
    "US/Pacific",
    "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  );
}

export async function ensureOptionalDependency(dependencyName: string) {
  try {
    return await import(dependencyName);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ERR_MODULE_NOT_FOUND"
    ) {
      throw new Error(
        `The "${dependencyName}" library is required. Please install it using:\n\n` +
          `npm install ${dependencyName}\n`,
      );
    } else {
      throw error;
    }
  }
}

export function parseMessages(messages: MemoryMessages): string {
  let result = "";
  if (typeof messages === "string") {
    result += `user: ${messages}\n`;
  } else {
    messages.forEach((message) => {
      switch (message.role) {
        case "system":
          result += `system: ${message.content}\n`;
          break;
        case "user":
          result += `user: ${message.content}\n`;
          break;
        case "assistant":
          result += `assistant: ${message.content}\n`;
          break;
      }
    });
  }
  return result;
}
