/**
 * @module weave-engine/modules/core/tools/actions/web-browser.action
 * @description Implementation logic for the web-browser.action AI tool.
 */
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
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      params: { q: query },
      timeout: 10000,
    });

    const html = response.data;
    const results = [];

    // Very simple regex-based extraction for duckduckgo html
    const regex =
      /<a class="result__url" href="([^"]+)".*?>.*?<\/a>.*?<a class="result__snippet[^>]+>(.*?)<\/a>/gs;
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
        snippet,
        url: decodedUrl,
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
 * Validates a URL is safe to fetch (prevents SSRF).
 * Only allows public HTTP/HTTPS URLs.
 *
 * @param {string} rawUrl
 * @returns {boolean}
 */
function isUrlSafe(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "0.0.0.0"
  ) {
    return false;
  }

  // Block internal network hostnames (no dot = likely a container/service name)
  if (!hostname.includes(".")) {
    return false;
  }

  // Block private/reserved IP ranges
  const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipMatch) {
    const octets = ipMatch.slice(1).map(Number);
    const [a, b] = octets;
    if (a === 10) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    if (a === 0) return false;
  }

  return true;
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

  if (!isUrlSafe(url)) {
    return {
      error: "URL is not allowed: only public HTTP/HTTPS URLs are permitted",
    };
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

module.exports = {
  readUrl,
  searchWeb,
};
