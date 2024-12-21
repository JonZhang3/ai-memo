# AI Memo

AI Memo is a JavaScript implementation inspired by [mem0](https://github.com/mem0ai/mem0), providing an intelligent memory layer for AI applications. It enables AI assistants and agents to maintain personalized interactions by remembering user preferences, adapting to individual needs, and improving over time.

## Core Features

- **Adaptive Personalization**: Continuously improves and learns from interactions
- **Developer-Friendly**: Simple and intuitive API
- **Cross-Platform Consistency**: Maintains uniform behavior across different devices

## How It Works

AI Memo uses a vector database approach to manage and retrieve long-term memories for AI agents. Each memory is associated with unique identifiers (like user IDs or agent IDs), allowing the system to organize and access memories specific to individuals or scenarios.

When memories are added using the add() method, the system extracts relevant facts and preferences, storing them across vector database. During retrieval, information is scored based on relevance, importance, and recency to ensure only the most relevant and personalized context is returned.

## TODO

- [ ] Support for more Vector databases, like ChromaDB, Redis, etc.
- [ ] Support for more LLMs, like Groq, Anthropic, etc.
- [ ] Supports memory storage of very long texts, e.g. PDF
