const { pool } = require("@/database/connection");

async function updateMessageFeedback(messageId, userId, rating, comment) {
    const query = `
      UPDATE ai_chat_messages
      SET
        user_feedback_rating = $1,
        user_feedback_comment = $2
      WHERE id = $3
        AND user_id = $4
      RETURNING id
    `;
    const result = await pool.query(query, [
      rating,
      comment,
      messageId,
      userId,
    ]);
    return result.rowCount > 0;
  }

module.exports = { updateMessageFeedback };
