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
      "vector_store/chroma": "./src/vector_store/chroma.ts",
    },
  },
  output: {
    externals: ["chromadb"],
  },
});
