export interface EmbeddingBase {
  embed(text: string): Promise<number[]>;
}
