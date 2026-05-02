const axios = require("axios");

/**
 * Perform a web search using duckduckgo HTML version (no API key required).
 * @param {object} args
 * @param {string} args.query
 * @returns {Promise<object>}
 */
async function searchWeb({ query }) {
  if (!query) {
    return { error: "Query is required" };
  }

  try {
    const response = await axios.get("https://html.duckduckgo.com/html/", {
      params: { q: query },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const html = response.data;
    const results = [];
    
    // Very simple regex-based extraction for duckduckgo html
    const regex = /<a class="result__url" href="([^"]+)".*?>.*?<\/a>.*?<a class="result__snippet[^>]+>(.*?)<\/a>/gs;
    let match;
    let count = 0;
    while ((match = regex.exec(html)) !== null && count < 5) {
      // Decode HTML entities
      const url = match[1]
        .replace(/&amp;/g, "&")
        .replace(/^\/\/duckduckgo\.com\/l\/\?uddg=/, "")
        .split("&rut=")[0];
        
      const decodedUrl = decodeURIComponent(url);
      const snippet = match[2].replace(/<[^>]+>/g, "").replace(/&quot;/g, '"');
      
      results.push({
        url: decodedUrl,
        snippet,
      });
      count++;
    }

    if (results.length === 0) {
      return { message: "No results found." };
    }

    return { results };
  } catch (error) {
    return { error: `Failed to search web: ${error.message}` };
  }
}

/**
 * Reads a URL and extracts the main text.
 * @param {object} args
 * @param {string} args.url
 * @returns {Promise<object>}
 */
async function readUrl({ url }) {
  if (!url) {
    return { error: "URL is required" };
  }

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      timeout: 15000,
    });

    const html = response.data;
    if (typeof html !== "string") {
      return { error: "Response is not HTML" };
    }

    // Strip scripts, styles, and extract text from body
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let textContent = bodyMatch ? bodyMatch[1] : html;
    
    textContent = textContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Truncate to avoid blowing up context
    if (textContent.length > 15000) {
      textContent = textContent.slice(0, 15000) + "... [Truncated]";
    }

    return { content: textContent };
  } catch (error) {
    return { error: `Failed to read URL: ${error.message}` };
  }
}

const schemas = [
  {
    name: "web_search",
    description: "Searches the web for current information and facts.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "read_url",
    description: "Reads the textual content of a specified webpage URL.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The complete URL to read.",
        },
      },
      required: ["url"],
    },
  },
];

module.exports = {
  searchWeb,
  readUrl,
  schemas,
};
