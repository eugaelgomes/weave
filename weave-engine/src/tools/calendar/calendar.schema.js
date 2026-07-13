const { z } = require("zod");

const listCalendarEventsSchema = z.object({
  endDate: z.string().optional().describe("Data final em formato ISO 8601."),
  projectId: z
    .string()
    .uuid()
    .optional()
    .describe("Filtrar eventos por ID de projeto."),
  startDate: z
    .string()
    .optional()
    .describe("Data inicial em formato ISO 8601."),
});

const createCalendarEventSchema = z.object({
  description: z.string().optional().describe("Descrição do evento."),
  endTime: z.string().describe("Data e hora de término em formato ISO 8601."),
  isAllDay: z.boolean().optional().describe("Se é um evento de dia inteiro."),
  location: z
    .string()
    .optional()
    .describe("Local do evento (físico ou link de reunião)."),
  noteId: z
    .string()
    .uuid()
    .optional()
    .describe("Note ID relacionada ao evento, se houver."),
  projectId: z
    .string()
    .uuid()
    .optional()
    .describe("Project ID relacionado ao evento, se houver."),
  startTime: z.string().describe("Data e hora de início em formato ISO 8601."),
  title: z.string().min(1).max(255).describe("Título do evento."),
});

const updateCalendarEventSchema = z.object({
  description: z.string().optional().describe("Nova descrição."),
  endTime: z
    .string()
    .optional()
    .describe("Nova data e hora de término em formato ISO 8601."),
  eventId: z.string().uuid().describe("ID do evento a ser updated."),
  isAllDay: z.boolean().optional().describe("Novo status de dia inteiro."),
  location: z.string().optional().describe("Novo local."),
  startTime: z
    .string()
    .optional()
    .describe("Nova data e hora de início em formato ISO 8601."),
  title: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe("Novo título do evento."),
});

const deleteCalendarEventSchema = z.object({
  eventId: z.string().uuid().describe("ID do evento a ser cancelado/deleted."),
});

module.exports = {
  calendarSchemas: {
    create_calendar_event: createCalendarEventSchema,
    delete_calendar_event: deleteCalendarEventSchema,
    list_calendar_events: listCalendarEventsSchema,
    update_calendar_event: updateCalendarEventSchema,
  },
  calendarTools: [
    {
      function: {
        description:
          "Lista os eventos de calendário do usuário. Útil para consultar a agenda antes de marcar novos compromissos.",
        name: "list_calendar_events",
        parameters: {
          properties: {
            endDate: { description: "ISO 8601 date string", type: "string" },
            projectId: {
              description: "UUProject ID, se aplicável",
              type: "string",
            },
            startDate: { description: "ISO 8601 date string", type: "string" },
          },
          required: [],
          type: "object",
        },
      },
      type: "function",
    },
    {
      function: {
        description:
          "Cria um novo evento no calendário. Sempre consulte a agenda do usuário antes para evitar conflitos se possível.",
        name: "create_calendar_event",
        parameters: {
          properties: {
            description: { type: "string" },
            endTime: { description: "ISO 8601 date string", type: "string" },
            isAllDay: { type: "boolean" },
            location: { type: "string" },
            noteId: { type: "string" },
            projectId: { type: "string" },
            startTime: { description: "ISO 8601 date string", type: "string" },
            title: { type: "string" },
          },
          required: ["title", "startTime", "endTime"],
          type: "object",
        },
      },
      type: "function",
    },
    {
      function: {
        description: "Modifica um evento de calendário existente.",
        name: "update_calendar_event",
        parameters: {
          properties: {
            description: { type: "string" },
            endTime: { type: "string" },
            eventId: { type: "string" },
            isAllDay: { type: "boolean" },
            location: { type: "string" },
            startTime: { type: "string" },
            title: { type: "string" },
          },
          required: ["eventId"],
          type: "object",
        },
      },
      type: "function",
    },
    {
      function: {
        description: "Cancela/exclui um evento de calendário.",
        name: "delete_calendar_event",
        parameters: {
          properties: {
            eventId: { type: "string" },
          },
          required: ["eventId"],
          type: "object",
        },
      },
      type: "function",
    },
  ],
};
