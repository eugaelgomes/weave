const { z } = require("zod");

const getArtifactSchema = z.object({
  id: z
    .string()
    .uuid("Invalid artifact ID")
    .describe("O identificador único do artefato (UUID) que deseja recuperar."),
});

const createArtifactSchema = z.object({
  content: z
    .union([z.record(z.any()), z.array(z.any())])
    .describe("O conteúdo real do artefato, que pode ser um objeto JSON ou uma lista/array."),
  organizationId: z
    .string()
    .uuid("Invalid organization ID")
    .optional()
    .nullable()
    .describe(
      "Opcional: o identificador único da organização (UUID) à qual este artefato pertence."
    ),
  sessionId: z
    .string()
    .uuid("Invalid session ID")
    .optional()
    .nullable()
    .describe("Opcional: o identificador único da sessão (UUID) relacionada a este artefato."),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title must be 255 characters or less")
    .describe("O título ou nome descritivo do artefato a ser criado."),
  type: z
    .string()
    .min(1)
    .describe("O tipo ou categoria do artefato (por exemplo, document, code, text)."),
});

const updateArtifactSchema = z.object({
  content: z
    .union([z.record(z.any()), z.array(z.any())])
    .optional()
    .describe("O novo conteúdo do artefato. Deixe em branco para manter o conteúdo atual."),
  id: z
    .string()
    .uuid("Invalid artifact ID")
    .describe("O identificador único do artefato (UUID) que deseja atualizar."),
  title: z
    .string()
    .trim()
    .max(255)
    .optional()
    .describe("O novo título do artefato. Deixe em branco caso não deseje alterar."),
});

const listArtifactsSchema = z.object({
  limit: z
    .union([z.number(), z.string()])
    .optional()
    .describe("Maximum number of artifacts to return (default 20)."),
  offset: z
    .union([z.number(), z.string()])
    .optional()
    .describe("Offset for pagination (default 0)."),
});

const deleteArtifactSchema = z.object({
  id: z
    .string()
    .uuid("Invalid artifact ID")
    .describe("O identificador único do artefato (UUID) que deseja deletar."),
});

module.exports = {
  createArtifactSchema,
  deleteArtifactSchema,
  getArtifactSchema,
  listArtifactsSchema,
  updateArtifactSchema,
};
