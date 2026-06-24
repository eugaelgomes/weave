/**
 * @module weave-engine/modules/core/tools/actions/search.action
 * @description Implementation logic for the search.action AI tool.
 */
const { pool } = require("../../../../services/postgres.client");
const { URL } = require("url");

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
    const apiKey = process.env.FOUNDRY_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "FOUNDRY_API_KEY or OPENAI_API_KEY is not configured in engine"
      );
    }

    let baseUrl =
      process.env.FOUNDRY_PROJECT_URL ||
      process.env.OPENAI_BASE_URL ||
      "https://api.openai.com/v1";
    if (baseUrl && baseUrl.includes("/api/projects/")) {
      try {
        const parsed = new URL(baseUrl);
        baseUrl = `${parsed.origin}/models`;
      } catch {
        // ignore
      }
    }

    const isAzureOpenAI = baseUrl.includes(".openai.azure.com");
    const isAzureFoundry = baseUrl.includes("services.ai.azure.com");
    const isAzure = isAzureOpenAI || isAzureFoundry;

    let endpointUrl = `${baseUrl}/embeddings`;
    if (isAzureOpenAI) {
      endpointUrl = `${baseUrl}/embeddings?api-version=2024-05-01-preview`;
    }

    const headers = {
      "Content-Type": "application/json",
    };

    if (isAzure) {
      headers["api-key"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const embeddingModel = isAzureFoundry
      ? "text-embedding-3-large"
      : "text-embedding-3-small";

    // Gerar o vetor da pergunta usando o provedor configurado
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: embeddingModel,
        input: query,
        dimensions: 1536,
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
        n.public_note_id,
        p.public_project_id,
        n.title,
        n.description,
        n.tags,
        n.status,
        n.updated_at,
        1 - (n.embedding <=> $2::vector) AS similarity
      FROM notes n
      LEFT JOIN projects p ON n.project_id = p.id
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
