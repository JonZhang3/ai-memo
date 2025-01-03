import type { Memory } from "../memory/main";

export class Chat {
  private readonly client: Memory;

  constructor(client: Memory) {
    this.client = client;
  }
}
