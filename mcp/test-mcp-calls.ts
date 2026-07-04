import registry from "./src/modules/index";

async function testTools() {
  console.log("=== STARTING MCP CRUD TESTS FOR NOTES AND BLOCKS ===");

  let noteId = "";
  let blockId = "";

  // 1. Create a Note
  console.log("\n--- Creating a note ---");
  try {
    const createResult = await registry.tools["create_note"].handler({
      title: "MCP Integration Test Note",
      status: "VISIBLE",
    });
    console.log("Status:", createResult.isError ? "FAILED" : "SUCCESS");
    const resultText = createResult.content[0].text;
    console.log("Response text:", resultText);

    // Extract noteId (UUID)
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = resultText.match(uuidRegex);
    if (match) {
      noteId = match[0];
      console.log(`Extracted Note ID: ${noteId}`);
    } else {
      throw new Error("Could not extract Note ID from response");
    }
  } catch (error: any) {
    console.error("Error creating note:", error);
    return;
  }

  // 2. Add a block to the note
  console.log("\n--- Adding a paragraph block ---");
  try {
    const addBlockResult = await registry.tools["create_note_block"].handler({
      noteId,
      type: "paragraph",
      text: "This is paragraph 1 of the integration test note.",
    });
    console.log("Status:", addBlockResult.isError ? "FAILED" : "SUCCESS");
    const resultText = addBlockResult.content[0].text;
    console.log("Response text:", resultText);

    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = resultText.match(uuidRegex);
    if (match) {
      blockId = match[0];
      console.log(`Extracted Block ID: ${blockId}`);
    } else {
      throw new Error("Could not extract Block ID from response");
    }
  } catch (error: any) {
    console.error("Error adding block:", error);
  }

  // 3. List blocks of the note
  console.log("\n--- Listing blocks for the note ---");
  try {
    const listBlocksResult = await registry.tools["list_note_blocks"].handler({ noteId });
    console.log("Status:", listBlocksResult.isError ? "FAILED" : "SUCCESS");
    console.log("Blocks:", listBlocksResult.content[0].text);
  } catch (error: any) {
    console.error("Error listing note blocks:", error);
  }

  // 4. Update the block (converting to a heading level 2)
  console.log("\n--- Updating block to a heading level 2 ---");
  try {
    const updateBlockResult = await registry.tools["update_note_block"].handler({
      noteId,
      blockId,
      type: "heading",
      text: "Integration Test Heading 2",
      properties: {
        level: 2,
      },
    });
    console.log("Status:", updateBlockResult.isError ? "FAILED" : "SUCCESS");
    console.log("Response text:", updateBlockResult.content[0].text);
  } catch (error: any) {
    console.error("Error updating block:", error);
  }

  // 5. List blocks of the note again to verify update
  console.log("\n--- Listing blocks again (verification) ---");
  try {
    const listBlocksResult = await registry.tools["list_note_blocks"].handler({ noteId });
    console.log("Status:", listBlocksResult.isError ? "FAILED" : "SUCCESS");
    console.log("Blocks:", listBlocksResult.content[0].text);
  } catch (error: any) {
    console.error("Error listing note blocks again:", error);
  }

  // 6. Delete the block
  console.log("\n--- Deleting block ---");
  try {
    const deleteBlockResult = await registry.tools["delete_note_block"].handler({
      noteId,
      blockId,
    });
    console.log("Status:", deleteBlockResult.isError ? "FAILED" : "SUCCESS");
    console.log("Response text:", deleteBlockResult.content[0].text);
  } catch (error: any) {
    console.error("Error deleting block:", error);
  }

  // 7. Delete the note
  console.log("\n--- Deleting note ---");
  try {
    const deleteNoteResult = await registry.tools["delete_note"].handler({ noteId });
    console.log("Status:", deleteNoteResult.isError ? "FAILED" : "SUCCESS");
    console.log("Response text:", deleteNoteResult.content[0].text);
  } catch (error: any) {
    console.error("Error deleting note:", error);
  }
}

testTools();
