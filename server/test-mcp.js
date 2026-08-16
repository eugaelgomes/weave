const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");
require("events").EventEmitter.defaultMaxListeners = 15;

async function run() {
  console.log("Connecting to MCP...");
  const token = "wn_fa17a82c38a0.5ec7bd07b6eb0c92f00978b77abd4a5e5ab6bd988b063a743d0a40b077347841";
  const url = new URL("http://localhost:8080/api/v1/mcp/sse");
  
  // Create transport with auth headers
  const transport = new SSEClientTransport(url, {
    requestInit: {
      headers: {
        Authorization: "Bearer " + token,
      }
    }
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log("Connected successfully!");

    // 1. List notes to get a note_id
    console.log("\\nCalling manage_notes (list)...");
    const notesResult = await client.callTool({
      name: "manage_notes",
      arguments: {
        action: "list",
        limit: 1
      },
    });
    
    let noteId = null;
    if (notesResult.content && notesResult.content[0] && notesResult.content[0].text) {
      const notes = JSON.parse(notesResult.content[0].text);
      if (notes.items && notes.items.length > 0) {
        noteId = notes.items[0].public_note_id || notes.items[0].id;
        console.log("Found note:", notes.items[0].title, "(ID:", noteId, ")");
      }
    }

    if (!noteId) {
      console.log("No notes found. Creating a new one...");
      const createRes = await client.callTool({
        name: "manage_notes",
        arguments: {
          action: "create",
          title: "Test Note from MCP Script"
        }
      });
      const created = JSON.parse(createRes.content[0].text);
      noteId = created.public_note_id || created.id || created.note_id;
      console.log("Created Note ID:", noteId);
    }

    // 2. Create some markdown
    console.log("\\nCalling manage_note_blocks (create) with markdown...");
    const createMdRes = await client.callTool({
      name: "manage_note_blocks",
      arguments: {
        action: "create",
        note_id: noteId,
        markdown: "# Test Block\\nThis is a block appended via the new markdown tool natively."
      }
    });
    console.log("Create MD Result:", createMdRes.content[0].text);

    // 3. Read the markdown
    console.log("\\nCalling manage_note_blocks (read)...");
    const readMdRes = await client.callTool({
      name: "manage_note_blocks",
      arguments: {
        action: "read",
        note_id: noteId
      }
    });
    console.log("Read MD Result:\\n", readMdRes.content[0].text);

  } catch (error) {
    console.error("Error during MCP test:", error);
  } finally {
    try {
      await transport.close();
    } catch(e) {}
    process.exit(0);
  }
}

run();
