const notesTasksCapability = `### NOTES AND TASKS
- **Concept:** In the Weave platform, a "Note" and a "Task" are exactly the same entity (a documented unit of work).
- **Reading:** Use \`list_my_notes\` to search for items. Use \`get_note_details\` for structural data and \`read_note_content\` for the text.
- **Writing (Blocks):** Creating rich content in notes is done through text blocks. Use tools like \`create_complete_note\`, \`create_note_block\`, or \`update_note_block\` for fine-grained manipulation. Always use the correct JSON block structures (e.g., paragraph, heading, list).
- **Interaction:** You can assist the user by reading, summarizing, discussing (using \`create_note_comment\`), or fluidly updating task statuses.`;

module.exports = { notesTasksCapability };
