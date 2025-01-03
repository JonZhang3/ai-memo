import { defineConfig } from "@rslib/core";

export default defineConfig({
  lib: [
    {
      format: "esm",
      syntax: "es2021",
      dts: true,
    },
    {
      format: "cjs",
      syntax: "es2021",
    },
  ],
  mode: "production",
  source: {
    tsconfigPath: "tsconfig.build.json",
    entry: {
      index: "./src/index.ts",
      "embeddings/azure_openai": "./src/embeddings/azure_openai.ts",
      "embeddings/ollama": "./src/embeddings/ollama.ts",
      "embeddings/together": "./src/embeddings/together.ts",
      "embeddings/vertexai": "./src/embeddings/vertexai.ts",
      "llms/anthropic": "./src/llms/anthropic.ts",
      "llms/together": "./src/llms/together.ts",
      "llms/groq": "./src/llms/groq.ts",
      "llms/azure_openai": "./src/llms/azure_openai.ts",
      "vector_store/chroma": "./src/vector_store/chroma.ts",
      "vector_store/redis": "./src/vector_store/redis.ts",
      "vector_store/milvus": "./src/vector_store/milvus.ts",
    },
  },
  output: {
    externals: [
      "chromadb",
      "@ai-sdk/azure",
      "@ai-sdk/google-vertex",
      "@ai-sdk/togetherai",
      "ollama-ai-provider",
      "@ai-sdk/groq",
      "@ai-sdk/anthropic",
      "redis",
      "@zilliz/milvus2-sdk-node",
    ],
  },
});
