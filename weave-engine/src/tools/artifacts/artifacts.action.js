const { pool } = require("../../services/database/postgres.client");
const { logger } = require("../../services/logger");

/**
 * Creates a new artifact for the Sandbox UI.
 */
async function createArtifact(args) {
  const { title, type = "document", blocks, userId, organizationId } = args;

  if (!userId) {
    return { error: "User ID is required to create an artifact." };
  }

  try {
    const query = `
      INSERT INTO ai_artifacts (
        user_id,
        organization_id,
        title,
        type,
        content,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, title, type, created_at
    `;
    const result = await pool.query(query, [
      userId,
      organizationId || null,
      title,
      type,
      JSON.stringify(blocks),
    ]);

    return {
      _ui_action: {
        artifactId: result.rows[0].id,
        type: "OPEN_ARTIFACT",
      },
      artifact: result.rows[0],
      message: "Artifact created successfully.",
      success: true,
    };
  } catch (error) {
    logger.error("Failed to create artifact", { error: error.message, userId });
    return { error: "Database error while creating artifact." };
  }
}

/**
 * Updates an existing artifact.
 */
async function updateArtifact(args) {
  const { artifactId, title, blocks, userId } = args;

  if (!userId) {
    return { error: "User ID is required to update an artifact." };
  }

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(title);
    }

    if (blocks !== undefined) {
      fields.push(`content = $${idx++}`);
      values.push(JSON.stringify(blocks));
    }

    if (fields.length === 0) {
      return { error: "No fields provided to update." };
    }

    fields.push(`updated_at = NOW()`);
    values.push(artifactId, userId);

    const query = `
      UPDATE ai_artifacts
      SET ${fields.join(", ")}
      WHERE id = $${idx} AND user_id = $${idx + 1}
      RETURNING id, title, type, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return {
        error: "Artifact not found or you do not have permission to update it.",
      };
    }

    return {
      _ui_action: {
        artifactId: result.rows[0].id,
        type: "UPDATE_ARTIFACT",
      },
      artifact: result.rows[0],
      message: "Artifact updated successfully.",
      success: true,
    };
  } catch (error) {
    logger.error("Failed to update artifact", {
      artifactId,
      error: error.message,
      userId,
    });
    return { error: "Database error while updating artifact." };
  }
}

module.exports = {
  createArtifact,
  updateArtifact,
};
