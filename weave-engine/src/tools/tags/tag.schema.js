const { z } = require("zod");

const listTagsSchema = z.object({
  projectId: z
    .string()
    .uuid()
    .optional()
    .describe(
      "Filtrar tags por ID de projeto. Se omitido, retorna as tags da organização."
    ),
});

const createTagSchema = z.object({
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .describe("Cor da tag em formato HEX (ex: #FF5733)."),
  name: z.string().min(1).max(30).describe("Nome da tag."),
  projectId: z
    .string()
    .uuid()
    .optional()
    .describe(
      "Project ID ao qual a tag pertence. Se omitido, a tag é criada para a organização."
    ),
});

const updateTagSchema = z.object({
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .describe("Nova cor da tag em formato HEX."),
  name: z.string().min(1).max(30).optional().describe("Novo nome da tag."),
  tagId: z.string().uuid().describe("ID da tag a ser atualizada."),
});

const deleteTagSchema = z.object({
  tagId: z.string().uuid().describe("ID da tag a ser excluída."),
});

const assignTagSchema = z.object({
  noteId: z.string().uuid().describe("Note ID à qual a tag será vinculada."),
  tagId: z.string().uuid().describe("ID da tag a ser vinculada."),
});

const removeTagSchema = z.object({
  noteId: z.string().uuid().describe("Note ID da qual a tag será removida."),
  tagId: z.string().uuid().describe("ID da tag a ser removida."),
});

module.exports = {
  tagSchemas: {
    assign_tag: assignTagSchema,
    create_tag: createTagSchema,
    delete_tag: deleteTagSchema,
    list_tags: listTagsSchema,
    remove_tag: removeTagSchema,
    update_tag: updateTagSchema,
  },
  tagTools: [
    {
      function: {
        description:
          "Lista as tags disponíveis no workspace do usuário. Útil para descobrir quais tags podem ser usadas antes de classificar notas ou projetos.",
        name: "list_tags",
        parameters: {
          properties: {
            projectId: {
              description:
                "Project ID para filtrar tags específicas dele. Opcional.",
              type: "string",
            },
          },
          required: [],
          type: "object",
        },
      },
      type: "function",
    },
    {
      function: {
        description: "Cria uma nova tag para classificar itens no Weave.",
        name: "create_tag",
        parameters: {
          properties: {
            colorHex: {
              description: "A cor da tag em Hex (ex: #FF0000). Opcional.",
              type: "string",
            },
            name: {
              description: "O nome da tag. Deve ser curto e claro.",
              type: "string",
            },
            projectId: {
              description:
                "O Project ID, se a tag for específica dele. Opcional.",
              type: "string",
            },
          },
          required: ["name"],
          type: "object",
        },
      },
      type: "function",
    },
    {
      function: {
        description: "Atualiza o nome ou a cor de uma tag existente.",
        name: "update_tag",
        parameters: {
          properties: {
            colorHex: { type: "string" },
            name: { type: "string" },
            tagId: { type: "string" },
          },
          required: ["tagId"],
          type: "object",
        },
      },
      type: "function",
    },
    {
      function: {
        description:
          "Exclui uma tag permanentemente. Não exclui os itens vinculados, apenas remove a tag deles.",
        name: "delete_tag",
        parameters: {
          properties: {
            tagId: { type: "string" },
          },
          required: ["tagId"],
          type: "object",
        },
      },
      type: "function",
    },
    {
      function: {
        description: "Vincula uma tag a uma nota.",
        name: "assign_tag",
        parameters: {
          properties: {
            noteId: { type: "string" },
            tagId: { type: "string" },
          },
          required: ["noteId", "tagId"],
          type: "object",
        },
      },
      type: "function",
    },
    {
      function: {
        description: "Desvincula uma tag de uma nota.",
        name: "remove_tag",
        parameters: {
          properties: {
            noteId: { type: "string" },
            tagId: { type: "string" },
          },
          required: ["noteId", "tagId"],
          type: "object",
        },
      },
      type: "function",
    },
  ],
};
