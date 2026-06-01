/**
 * Unit tests for markdown-to-blocks.util.js
 *
 * Run from weave-api root:
 *   node -e "require('module-alias/register')" -e "" --test src/modules/weave-ai/__tests__/markdown-to-blocks.test.js
 *
 * Or simply:
 *   node -r module-alias/register src/modules/weave-ai/__tests__/markdown-to-blocks.test.js
 */

require("module-alias/register");

const {
  markdownToBlocks,
} = require("@/modules/weave-ai/utils/markdown-to-blocks.util");

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${description}`);
  } else {
    failed++;
    console.error(`  ✗ ${description}`);
  }
}

function assertBlock(block, expectedType, expectedText, description) {
  const text = block?.properties?.text || "";
  assert(
    block.type === expectedType,
    `${description} — type is "${expectedType}"`
  );
  if (expectedText !== undefined) {
    assert(text === expectedText, `${description} — text is "${expectedText}"`);
  }
}

console.log("\n=== markdown-to-blocks.util.js tests ===\n");

// ── Empty / null input ────────────────────────────────────────────
console.log("Empty input:");
assert(markdownToBlocks("").length === 0, "empty string → []");
assert(markdownToBlocks("   ").length === 0, "whitespace string → []");
assert(markdownToBlocks(null).length === 0, "null → []");
assert(markdownToBlocks(undefined).length === 0, "undefined → []");

// ── Headings ──────────────────────────────────────────────────────
console.log("\nHeadings:");
{
  const blocks = markdownToBlocks("# Title\n## Subtitle\n### H3\n#### H4");
  assert(blocks.length === 4, "4 heading blocks");
  assertBlock(blocks[0], "heading", "Title", "H1");
  assert(blocks[0].properties.attrs.level === 1, "H1 level is 1");
  assertBlock(blocks[1], "heading", "Subtitle", "H2");
  assert(blocks[1].properties.attrs.level === 2, "H2 level is 2");
  assertBlock(blocks[2], "heading", "H3", "H3");
  assert(blocks[2].properties.attrs.level === 3, "H3 level is 3");
  assertBlock(blocks[3], "heading", "H4", "H4");
  assert(blocks[3].properties.attrs.level === 4, "H4 level is 4");
}

// ── Paragraphs ────────────────────────────────────────────────────
console.log("\nParagraphs:");
{
  const blocks = markdownToBlocks("Hello world\n\nSecond paragraph");
  assert(blocks.length === 2, "2 paragraph blocks");
  assertBlock(blocks[0], "paragraph", "Hello world", "first paragraph");
  assertBlock(blocks[1], "paragraph", "Second paragraph", "second paragraph");
}

// ── Unordered list ────────────────────────────────────────────────
console.log("\nUnordered list:");
{
  const blocks = markdownToBlocks("- Item 1\n- Item 2\n- Item 3");
  assert(blocks.length === 1, "1 list block");
  assert(blocks[0].type === "list", "type is list");
  assert(blocks[0].properties.attrs.ordered === false, "ordered is false");
  assert(blocks[0].children.length === 3, "3 children");
  assertBlock(blocks[0].children[0], "paragraph", "Item 1", "child 1");
  assertBlock(blocks[0].children[1], "paragraph", "Item 2", "child 2");
  assertBlock(blocks[0].children[2], "paragraph", "Item 3", "child 3");
}

// ── Ordered list ──────────────────────────────────────────────────
console.log("\nOrdered list:");
{
  const blocks = markdownToBlocks("1. First\n2. Second\n3. Third");
  assert(blocks.length === 1, "1 list block");
  assert(blocks[0].type === "list", "type is list");
  assert(blocks[0].properties.attrs.ordered === true, "ordered is true");
  assert(blocks[0].children.length === 3, "3 children");
}

// ── Task list ─────────────────────────────────────────────────────
console.log("\nTask list:");
{
  const blocks = markdownToBlocks(
    "- [ ] Todo unchecked\n- [x] Todo checked\n- [X] Todo checked upper"
  );
  assert(blocks.length === 3, "3 todo blocks");
  assert(blocks[0].type === "todo", "first is todo");
  assert(blocks[0].properties.attrs.checked === false, "first is unchecked");
  assert(blocks[1].type === "todo", "second is todo");
  assert(blocks[1].properties.attrs.checked === true, "second is checked");
  assert(
    blocks[2].properties.attrs.checked === true,
    "third is checked (uppercase X)"
  );
}

// ── Blockquote ────────────────────────────────────────────────────
console.log("\nBlockquote:");
{
  const blocks = markdownToBlocks("> This is a quote\n> continued");
  assert(blocks.length === 1, "1 quote block");
  assert(blocks[0].type === "quote", "type is quote");
  assert(
    blocks[0].properties.text === "This is a quote\ncontinued",
    "text joined with newline"
  );
}

// ── Code block ────────────────────────────────────────────────────
console.log("\nCode block:");
{
  const blocks = markdownToBlocks(
    "```javascript\nconst x = 1;\nconsole.log(x);\n```"
  );
  assert(blocks.length === 1, "1 code block");
  assert(blocks[0].type === "code", "type is code");
  assert(
    blocks[0].properties.attrs.language === "javascript",
    "language is javascript"
  );
  assert(
    blocks[0].properties.text === "const x = 1;\nconsole.log(x);",
    "code content preserved"
  );
}

// ── Code block without language ───────────────────────────────────
console.log("\nCode block (no language):");
{
  const blocks = markdownToBlocks("```\nplain code\n```");
  assert(blocks.length === 1, "1 code block");
  assert(blocks[0].type === "code", "type is code");
  assert(blocks[0].properties.attrs.language === "", "language is empty");
}

// ── Divider ───────────────────────────────────────────────────────
console.log("\nDivider:");
{
  const blocks = markdownToBlocks("Before\n---\nAfter");
  assert(blocks.length === 3, "3 blocks");
  assert(blocks[1].type === "divider", "middle is divider");
}

// ── Mixed content (real-world example) ────────────────────────────
console.log("\nMixed content:");
{
  const md = `# Testar Integração com Zapier

## Objetivo
- Avaliar a eficácia da integração entre nosso sistema e o Zapier.

## Etapas
1. **Configurar a Integração:**
2. **Realizar Testes:**
3. **Análise de Resultados:**

## Resultados Esperados
- Integração sem erros.
- Transferência de dados eficiente e precisa.

## Observações
> Documentar qualquer problema encontrado durante o processo.`;

  const blocks = markdownToBlocks(md);
  assert(blocks.length > 5, `produced ${blocks.length} blocks (>5)`);

  // Check first is heading
  assert(blocks[0].type === "heading", "first block is heading");
  assert(blocks[0].properties.attrs.level === 1, "first heading is H1");

  // Check we have multiple types
  const types = new Set(blocks.map((b) => b.type));
  assert(types.has("heading"), "has heading blocks");
  assert(types.has("list"), "has list blocks");
  assert(types.has("quote"), "has quote block");
}

// ── Each block has a UUID id ──────────────────────────────────────
console.log("\nBlock IDs:");
{
  const blocks = markdownToBlocks("# Test\nParagraph\n- Item");
  for (const block of blocks) {
    assert(
      typeof block.id === "string" && block.id.length > 0,
      `block "${block.type}" has an id`
    );
  }
}

// ── Asterisk bullets work ─────────────────────────────────────────
console.log("\nAsterisk bullets:");
{
  const blocks = markdownToBlocks("* Item A\n* Item B");
  assert(blocks.length === 1, "1 list block");
  assert(blocks[0].type === "list", "type is list");
  assert(blocks[0].children.length === 2, "2 children");
}

// ── Summary ───────────────────────────────────────────────────────
console.log(`\n${"═".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${"═".repeat(50)}\n`);

if (failed > 0) {
  process.exit(1);
}
