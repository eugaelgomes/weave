const { z } = require("zod");

const artifactSchemas = [
  {
    function: {
      description:
        "Creates a new artifact (Sandbox document or code) for the user to view and edit side-by-side with the chat. Use this for ANY long-form text, markdown, report, or code snippet instead of sending it in the chat.",
      name: "create_artifact",
      parameters: {
        properties: {
          blocks: {
            description:
              "An array of structured blocks (e.g., paragraph, heading, code) that make up the content. This is required.",
            items: {
              properties: {
                children: { type: "array" },
                properties: { type: "object" },
                type: { type: "string" },
              },
              type: "object",
            },
            type: "array",
          },
          title: {
            description: "A short, descriptive title for the artifact.",
            type: "string",
          },
          type: {
            default: "document",
            description:
              "The type of the artifact, e.g., 'document', 'code', 'markdown'. Default is 'document'.",
            type: "string",
          },
        },
        required: ["title", "blocks"],
        type: "object",
      },
    },
    type: "function",
  },
  {
    function: {
      description:
        "Updates an existing artifact. Use this when the user asks to modify an artifact you created previously.",
      name: "update_artifact",
      parameters: {
        properties: {
          artifactId: {
            description: "The UUID of the artifact to update.",
            type: "string",
          },
          blocks: {
            description:
              "The new content blocks for the artifact. If provided, this replaces the entire content.",
            items: {
              properties: {
                children: { type: "array" },
                properties: { type: "object" },
                type: { type: "string" },
              },
              type: "object",
            },
            type: "array",
          },
          title: {
            description: "The new title of the artifact.",
            type: "string",
          },
        },
        required: ["artifactId"],
        type: "object",
      },
    },
    type: "function",
  },
];

const artifactZodSchemas = {
  create_artifact: z.object({
    blocks: z.array(z.any()),
    title: z.string(),
    type: z.string().optional().default("document"), // Array of blocks
  }),
  update_artifact: z.object({
    artifactId: z.string().uuid(),
    blocks: z.array(z.any()).optional(),
    title: z.string().optional(),
  }),
};

module.exports = {
  artifactSchemas,
  artifactZodSchemas,
};
