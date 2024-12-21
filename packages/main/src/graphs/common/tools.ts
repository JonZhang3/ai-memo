import { z } from "zod";
import type { LLMTool } from "../../types";

export const UPDATE_MEMORY_TOOL_GRAPH: LLMTool = {
  name: "update_graph_memory",
  description:
    "Update the relationship key of an existing graph memory based on new information. This function should be called when there's a need to modify an existing relationship in the knowledge graph. The update should only be performed if the new information is more recent, more accurate, or provides additional context compared to the existing information. The source and destination nodes of the relationship must remain the same as in the existing graph memory; only the relationship itself can be updated.",
  parameters: z.object({
    source: z
      .string()
      .describe(
        "The identifier of the source node in the relationship to be updated. This should match an existing node in the graph.",
      ),
    destination: z
      .string()
      .describe(
        "The identifier of the destination node in the relationship to be updated. This should match an existing node in the graph.",
      ),
    relationship: z
      .string()
      .describe(
        "The new or updated relationship between the source and destination nodes. This should be a concise, clear description of how the two nodes are connected.",
      ),
  }),
};

export const ADD_MEMORY_TOOL_GRAPH: LLMTool = {
  name: "add_graph_memory",
  description:
    "Add a new graph memory to the knowledge graph. This function creates a new relationship between two nodes, potentially creating new nodes if they don't exist.",
  parameters: z.object({
    source: z
      .string()
      .describe(
        "The identifier of the source node in the new relationship. This can be an existing node or a new node to be created.",
      ),
    destination: z
      .string()
      .describe(
        "The identifier of the destination node in the new relationship. This can be an existing node or a new node to be created.",
      ),
    relationship: z
      .string()
      .describe(
        "The type of relationship between the source and destination nodes. This should be a concise, clear description of how the two nodes are connected.",
      ),
    source_type: z
      .string()
      .describe(
        "The type or category of the source node. This helps in classifying and organizing nodes in the graph.",
      ),
    destination_type: z
      .string()
      .describe(
        "The type or category of the destination node. This helps in classifying and organizing nodes in the graph.",
      ),
  }),
};

export const NOOP_TOOL: LLMTool = {
  name: "noop",
  description:
    "No operation should be performed to the graph entities. This function is called when the system determines that no changes or additions are necessary based on the current input or context. It serves as a placeholder action when no other actions are required, ensuring that the system can explicitly acknowledge situations where no modifications to the graph are needed.",
  parameters: z.object({}),
};

export const RELATIONS_TOOL: LLMTool = {
  name: "establish_relations",
  description:
    "Establish relationships among the entities based on the provided text.",
  parameters: z.object({
    entities: z.array(
      z.object({
        source: z.string().describe("The source entity of the relationship."),
        relation: z
          .string()
          .describe(
            "The relationship between the source and destination entities.",
          ),
        destination: z
          .string()
          .describe("The destination entity of the relationship."),
      }),
    ),
  }),
};

export const EXTRACT_ENTITIES_TOOL: LLMTool = {
  name: "extract_entities",
  description: "Extract entities and their types from the text.",
  parameters: z.object({
    entities: z
      .array(
        z.object({
          entity: z.string().describe("The name or identifier of the entity."),
          entity_type: z
            .string()
            .describe("The type or category of the entity."),
        }),
      )
      .describe("An array of entities with their types."),
  }),
};

export const UPDATE_MEMORY_STRUCT_TOOL_GRAPH: LLMTool = {
  name: "update_graph_memory",
  description:
    "Update the relationship key of an existing graph memory based on new information. This function should be called when there's a need to modify an existing relationship in the knowledge graph. The update should only be performed if the new information is more recent, more accurate, or provides additional context compared to the existing information. The source and destination nodes of the relationship must remain the same as in the existing graph memory; only the relationship itself can be updated.",
  parameters: z.object({
    source: z
      .string()
      .describe(
        "The identifier of the source node in the relationship to be updated. This should match an existing node in the graph.",
      ),
    destination: z
      .string()
      .describe(
        "The identifier of the destination node in the relationship to be updated. This should match an existing node in the graph.",
      ),
    relationship: z
      .string()
      .describe(
        "The new or updated relationship between the source and destination nodes. This should be a concise, clear description of how the two nodes are connected.",
      ),
  }),
};

export const ADD_MEMORY_STRUCT_TOOL_GRAPH: LLMTool = {
  name: "add_graph_memory",
  description:
    "Add a new graph memory to the knowledge graph. This function creates a new relationship between two nodes, potentially creating new nodes if they don't exist.",
  parameters: z.object({
    source: z
      .string()
      .describe(
        "The identifier of the source node in the new relationship. This can be an existing node or a new node to be created.",
      ),
    destination: z
      .string()
      .describe(
        "The identifier of the destination node in the new relationship. This can be an existing node or a new node to be created.",
      ),
    relationship: z
      .string()
      .describe(
        "The type of relationship between the source and destination nodes. This should be a concise, clear description of how the two nodes are connected.",
      ),
    source_type: z
      .string()
      .describe(
        "The type or category of the source node. This helps in classifying and organizing nodes in the graph.",
      ),
    destination_type: z
      .string()
      .describe(
        "The type or category of the destination node. This helps in classifying and organizing nodes in the graph.",
      ),
  }),
};

export const NOOP_STRUCT_TOOL: LLMTool = {
  name: "noop",
  description:
    "No operation should be performed to the graph entities. This function is called when the system determines that no changes or additions are necessary based on the current input or context. It serves as a placeholder action when no other actions are required, ensuring that the system can explicitly acknowledge situations where no modifications to the graph are needed.",
  parameters: z.object({}),
};

export const RELATIONS_STRUCT_TOOL: LLMTool = {
  name: "establish_relations",
  description:
    "Establish relationships among the entities based on the provided text.",
  parameters: z.object({
    entities: z.array(
      z.object({
        source_entity: z
          .string()
          .describe("The source entity of the relationship."),
        relation: z
          .string()
          .describe(
            "The relationship between the source and destination entities.",
          ),
        destination_entity: z
          .string()
          .describe("The destination entity of the relationship."),
      }),
    ),
  }),
};

export const EXTRACT_ENTITIES_STRUCT_TOOL: LLMTool = {
  name: "extract_entities",
  description: "Extract entities and their types from the text.",
  parameters: z.object({
    entities: z.array(
      z.object({
        entity: z.string().describe("The name or identifier of the entity."),
        entity_type: z.string().describe("The type or category of the entity."),
      }),
    ),
  }),
};
