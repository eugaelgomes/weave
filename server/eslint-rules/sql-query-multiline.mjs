const SQL_KEYWORDS =
  /\b(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP|TRUNCATE|MERGE|VALUES|FROM|WHERE|JOIN|RETURNING|ON\s+CONFLICT)\b/i;
const CONTROL_KEYWORDS = /^(BEGIN|COMMIT|ROLLBACK)$/i;

function isLikelySql(text) {
  const value = String(text || "").trim();
  if (!value || CONTROL_KEYWORDS.test(value)) {
    return false;
  }

  return SQL_KEYWORDS.test(value);
}

function getTemplateText(node) {
  return node.quasis.map((quasi) => quasi.value.raw).join("${}");
}

function canSafelyFixTemplateLiteral(node) {
  return Array.isArray(node.expressions) && node.expressions.length === 0;
}

function splitTopLevelCommaSegments(line) {
  const firstCommaIndex = line.indexOf(",");
  if (firstCommaIndex === -1) {
    return [line];
  }

  const firstParenIndex = line.indexOf("(");
  if (firstParenIndex !== -1 && firstParenIndex < firstCommaIndex) {
    return [line];
  }

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

  const leadingLines = [];
  while (rawLines.length > 0 && rawLines[0].trim() === "") {
    leadingLines.push(rawLines.shift());
  }

  const trailingLines = [];
  while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === "") {
    trailingLines.unshift(rawLines.pop());
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

  return [...leadingLines, ...formatted, ...trailingLines].join("\n");
}

function buildReplacementText(node, formattedText) {
  if (node.type === "TemplateLiteral") {
    return `\`${formattedText}\``;
  }

  const quote = node.raw?.startsWith('"') ? '"' : "'";
  const escaped = formattedText
    .replace(/\\/g, "\\\\")
    .replace(new RegExp(quote, "g"), `\\${quote}`)
    .replace(/\n/g, "\\n");

  return `${quote}${escaped}${quote}`;
}

export default {
  meta: {
    type: "suggestion",
    fixable: "code",
    docs: {
      description:
        "Require SQL query strings to be written across multiple lines.",
    },
    messages: {
      multiline:
        "SQL queries must be written as multiline strings, one clause per line.",
    },
    schema: [],
  },
  create(context) {
    function reportIfNeeded(node, text) {
      if (!isLikelySql(text)) {
        return;
      }

      const formattedText = formatSqlText(text);
      const normalizedText = String(text || "").replace(/\r\n?/g, "\n");
      if (formattedText === normalizedText) {
        return;
      }

      context.report({
        node,
        messageId: "multiline",
        fix(fixer) {
          if (node.type === "TemplateLiteral" && !canSafelyFixTemplateLiteral(node)) {
            return null;
          }
          const replacementText = buildReplacementText(node, formattedText);
          return fixer.replaceText(node, replacementText);
        }
      });
    }

    return {
      Literal(node) {
        if (typeof node.value !== "string") {
          return;
        }

        const parent = node.parent;
        const inQueryCall =
          parent?.type === "CallExpression" &&
          parent.arguments[0] === node &&
          parent.callee?.type === "MemberExpression" &&
          parent.callee.property?.type === "Identifier" &&
          parent.callee.property.name === "query";

        const inSqlVariable =
          parent?.type === "VariableDeclarator" &&
          parent.id?.type === "Identifier" &&
          /query|sql|text|statement/i.test(parent.id.name);

        if (!inQueryCall && !inSqlVariable) {
          return;
        }

        reportIfNeeded(node, node.value);
      },

      TemplateLiteral(node) {
        const parent = node.parent;
        const inQueryCall =
          parent?.type === "CallExpression" &&
          parent.arguments[0] === node &&
          parent.callee?.type === "MemberExpression" &&
          parent.callee.property?.type === "Identifier" &&
          parent.callee.property.name === "query";

        const inSqlVariable =
          parent?.type === "VariableDeclarator" &&
          parent.id?.type === "Identifier" &&
          /query|sql|text|statement/i.test(parent.id.name);

        if (!inQueryCall && !inSqlVariable) {
          return;
        }

        reportIfNeeded(node, getTemplateText(node));
      },
    };
  },
};
