require("module-alias/register");
const { executeQuery } = require("./src/database/connection");
const { NoteBlocksService } = require("./src/modules/notes/services/note-blocks.service");
const { blocksToMarkdown } = require("./src/services/reasoning/notes-to-markdown");
const fs = require("fs");
const path = require("path");

async function run() {
  try {
    console.log("Finding the note with the most blocks...");
    
    // Find note_id with most blocks
    const rows = await executeQuery(`
      SELECT note_id, COUNT(*) as block_count 
      FROM note_blocks 
      GROUP BY note_id 
      ORDER BY block_count DESC 
      LIMIT 1
    `);
    
    if (rows.length === 0) {
      console.log("No notes found with blocks in the database.");
      process.exit(0);
    }
    
    const noteId = rows[0].note_id;
    console.log("Found note ID " + noteId + " with " + rows[0].block_count + " blocks.");
    
    // Get the owner userId to bypass permissions naturally
    const noteRows = await executeQuery("SELECT user_id, title FROM notes WHERE id = $1", [noteId]);
    if (noteRows.length === 0) {
      console.log("Note not found in notes table.");
      process.exit(0);
    }
    
    const userId = noteRows[0].user_id;
    const title = noteRows[0].title || 'Untitled';
    console.log("Note belongs to user " + userId + ". Title: " + title);
    
    // Fetch the tree
    const tree = await NoteBlocksService.listBlocks(userId, noteId);
    
    // Convert to markdown
    const md = blocksToMarkdown(tree);
    
    // Add title
    const finalMd = "# " + title + "\n\n" + md;
    
    // Write to file
    const destPath = path.join(__dirname, "amostra-nota-longa.md");
    fs.writeFileSync(destPath, finalMd, "utf8");
    
    console.log("\nSuccess! Saved to " + destPath);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

run();
