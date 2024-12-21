import { PostHog } from "posthog-node";
import os from "node:os";
import {
  VERSION,
  MEM0_TELEMETRY,
  USER_ID,
  POSTHOG_API_KEY,
  POSTHOG_HOST,
} from "../configs/env.config";
import type { Memory } from "./main";

export class AnonymousTelemetry {
  private client: PostHog | null = null;
  private userId: string;

  constructor(apiKey: string, host?: string) {
    if (MEM0_TELEMETRY) {
      this.client = new PostHog(apiKey, {
        host,
      });
    }

    this.userId = USER_ID;
  }

  captureEvent(eventName: string, properties: Record<string, string> = {}) {
    if (!this.client) return;
    const props = {
      client_source: "node",
      client_version: VERSION,
      node_version: process.version,
      os: os.platform(),
      os_version: os.version(),
      os_release: os.release(),
      processor: os.arch(),
      machine: os.machine(),
      ...properties,
    };
    this.client.capture({
      distinctId: this.userId,
      event: eventName,
      properties: props,
    });
  }

  close() {
    if (!this.client) return;
    this.client.shutdown();
  }
}

const telemetry = new AnonymousTelemetry(POSTHOG_API_KEY, POSTHOG_HOST);

export function captureEvent(
  eventName: string,
  memoryInstance: Memory,
  additionalData: Record<string, string | number> = {},
) {
  const eventData = {
    collection: memoryInstance.collectionName,
    history_store: "sqlite",
    ...additionalData,
  };
  telemetry.captureEvent(eventName, eventData);
}

export function captureClientEvent(
  eventName: string,
  additionalData: Record<string, string> = {},
) {
  const eventData = {
    function: "",
    ...additionalData,
  };
  telemetry.captureEvent(eventName, eventData);
}
