const { z } = require("zod");

const listUnreadNotificationsSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Limite de notificações a retornar. Padrão: 10."),
});

const markNotificationReadSchema = z.object({
  notificationId: z
    .string()
    .uuid()
    .describe("ID da notificação a ser marcada como lida."),
});

module.exports = {
  notificationSchemas: {
    get_unread_notifications: listUnreadNotificationsSchema,
    mark_notification_read: markNotificationReadSchema,
  },
  notificationTools: [
    {
      function: {
        description:
          "Obtém as notificações não lidas do usuário. Útil para agir proativamente em coisas que o usuário perdeu.",
        name: "get_unread_notifications",
        parameters: {
          properties: {
            limit: { type: "number" },
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
          "Marca uma notificação como lida após tomar ciência ou agir sobre ela.",
        name: "mark_notification_read",
        parameters: {
          properties: {
            notificationId: { type: "string" },
          },
          required: ["notificationId"],
          type: "object",
        },
      },
      type: "function",
    },
  ],
};
