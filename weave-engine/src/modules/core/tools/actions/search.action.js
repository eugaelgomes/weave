const { pool } = require("../../../../services/postgres.client");

/**
 * Searches the user's notes using text similarity/keywords.
 * In the future, this will be upgraded to use pgvector.
 *
 * @param {object} args
 * @param {string} args.query
 * @param {string} args.userId
 * @returns {Promise<object>}
 */
async function searchMyNotes({ query, userId }) {
  if (!query) {
    return { error: "Query is required" };
  }
  if (!userId) {
    return { error: "userId is required to search notes" };
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured in engine");
    }

    // Gerar o vetor da pergunta usando OpenAI
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const queryEmbedding = data.data[0].embedding;

    // Buscar no pgvector
    const sql = `
      SELECT
        n.id,
        n.title,
        n.description,
        n.tags,
        n.status,
        n.updated_at,
        1 - (n.embedding <=> $2::vector) AS similarity
      FROM notes n
      WHERE n.deleted = false
        AND n.user_id = $1::uuid
        AND n.embedding IS NOT NULL
      ORDER BY n.embedding <=> $2::vector
      LIMIT 10;
    `;

    const { rows } = await pool.query(sql, [
      userId,
      JSON.stringify(queryEmbedding),
    ]);

    if (rows.length === 0) {
      return { message: "No semantically similar notes found." };
    }

    return { results: rows };
  } catch (error) {
    return { error: `Failed to search notes: ${error.message}` };
  }
}

module.exports = {
  searchMyNotes,
};
