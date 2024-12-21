import { test } from "vitest";
import { Memory, QdrantDB, OpenAILLM, OpenAIEmbedding } from "../src";

test(
  "test",
  async () => {
    const memory = new Memory({
      vectorStore: new QdrantDB({
        collectionName: "test",
        url: "XXXXXXXXXX",
        apiKey: "XXXXXXXXXX",
      }),
      llm: new OpenAILLM({
        apiKey: "XXXXXXXXXX",
      }),
      embedder: new OpenAIEmbedding({
        apiKey: "XXXXXXXXXX",
      }),
    });
    // await memory.add({
    //   messages: [
    //     {
    //       role: "user",
    //       content: "Hi, I'm Alex. I'm a vegetarian and I'm allergic to nuts.",
    //     },
    //     {
    //       role: "assistant",
    //       content:
    //         "Hello Alex! I've noted that you're a vegetarian and have a nut allergy. I'll keep this in mind for any food-related recommendations or discussions.",
    //     },
    //   ],
    //   userId: "alex",
    // });

    const result = await memory.search({
      query: "What can I cook for dinner tonight?",
      userId: "alex",
    });
    console.log(result);
  },
  {
    timeout: 300000,
  },
);
