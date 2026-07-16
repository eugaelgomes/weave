const rule = require("./eslint-rules/sql-query-multiline.mjs").default;

const sql = `
      UPDATE weave_engine_reasoning_action_items
      SET \${fields.join(", ")}
      WHERE id = $1 AND deleted = false
      RETURNING *
    `;

// The rule uses getTemplateText which just replaces expressions with ${}
const templateText = "\n      UPDATE weave_engine_reasoning_action_items\n      SET ${}\n      WHERE id = $1 AND deleted = false\n      RETURNING *\n    ";

// Let's copy formatSqlText
function splitTopLevelCommaSegments(line) {
  const firstCommaIndex = line.indexOf(",");
  if (firstCommaIndex === -1) return [line];
  const firstParenIndex = line.indexOf("(");
  if (firstParenIndex !== -1 && firstParenIndex < firstCommaIndex) return [line];

  const segments = [];
  let current = "";
  let depth = 0;
  let quote = null;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (quote) {
      current += char;
      if (char === quote) {
        quote = null;
      } else if (quote === "'" && char === "\\" && nextChar) {
        current += nextChar;
        i++;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      current += char;
      continue;
    }

    if (char === "(") {
      depth++;
      current += char;
      continue;
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (char === "," && depth === 0) {
      segments.push(current.trimEnd());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim().length > 0) {
    segments.push(current.trimEnd());
  }

  return segments.length > 1 ? segments : [line];
}

function formatSqlText(text) {
  const normalized = String(text || "").replace(/\r\n?/g, "\n");
  const rawLines = normalized.split("\n");

  while (rawLines.length > 0 && rawLines[0].trim() === "") {
    rawLines.shift();
  }

  while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === "") {
    rawLines.pop();
  }

  const formatted = [];

  for (const rawLine of rawLines) {
    const trimmedEnd = rawLine.replace(/[ \t]+$/u, "");
    if (trimmedEnd.trim() === "") {
      formatted.push("");
      continue;
    }

    const indentMatch = trimmedEnd.match(/^\s*/u);
    const indent = indentMatch ? indentMatch[0] : "";
    const content = trimmedEnd.trim();
    const segments = splitTopLevelCommaSegments(content);

    if (segments.length === 1) {
      formatted.push(`${indent}${content}`);
      continue;
    }

    for (const segment of segments) {
      formatted.push(`${indent}${segment.trim()}`);
    }
  }

  return formatted.join("\n");
}

const formatted = formatSqlText(templateText);
const normalized = String(templateText || "").replace(/\r\n?/g, "\n");
console.log("FORMATTED:");
console.log(JSON.stringify(formatted));
console.log("NORMALIZED:");
console.log(JSON.stringify(normalized));
