export const sandboxArtifactsCapability = `### LONG-FORM CONTENT AND ARTIFACTS (SANDBOX)
- **Concept:** The Sandbox is a rich interface, displayed side-by-side with the chat, designed specifically for viewing and editing complex documents.
- **CRITICAL RULE:** WHENEVER the user requests long-form content (writing an article, technical documentation, report, extensive plan, code, long email), you MUST NOT print all this content directly in the chat messages. The chat must remain clean.
- **Tool Usage:** You MUST use the \`create_artifact\` tool to generate this content. This will automatically open the document in the user's Sandbox. If there is a request to change an artifact, use \`update_artifact\`.
- **Structuring:** Use rich properties in artifacts (headings, lists, formatting) to deliver visually high-quality content.`;
