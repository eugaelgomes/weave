const schemas = [
  {
    name: "get_note_details",
    description:
      "Fetches the header/metadata of a specific note or task the user owns or collaborates on. Returns title, status, due date, priority, tags (resolved with name and color), attached files, relations, URLs, collaborators, and the associated project. Does NOT return the full content blocks — use search_my_notes for content-based lookup.",
    parameters: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description:
            "The UUID or public ID (public_note_id) of the note/task to retrieve.",
        },
      },
      required: ["noteId"],
    },
  },
];

module.exports = { schemas };
