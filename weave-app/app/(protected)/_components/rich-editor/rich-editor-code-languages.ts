import { common } from "lowlight";

const LABEL_PT: Record<string, string> = {
  apache: "Apache",
  bash: "Bash",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  css: "CSS",
  diff: "Diff",
  go: "Go",
  graphql: "GraphQL",
  ini: "INI",
  java: "Java",
  javascript: "JavaScript",
  json: "JSON",
  jsx: "JSX",
  kotlin: "Kotlin",
  less: "Less",
  lua: "Lua",
  makefile: "Makefile",
  markdown: "Markdown",
  objectivec: "Objective-C",
  perl: "Perl",
  php: "PHP",
  plaintext: "Texto simples",
  python: "Python",
  r: "R",
  ruby: "Ruby",
  rust: "Rust",
  sass: "Sass",
  scala: "Scala",
  scss: "SCSS",
  shell: "Shell",
  sql: "SQL",
  swift: "Swift",
  typescript: "TypeScript",
  vbnet: "VB.NET",
  wasm: "WebAssembly",
  xml: "XML",
  yaml: "YAML",
  tsx: "TSX",
};

function fallbackLabel(id: string): string {
  return id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/** Languages registered via `lowlight` common bundle (same as CodeBlockLowlight). */
export const CODE_BLOCK_LANGUAGE_OPTIONS: { value: string; label: string }[] = Object.keys(common)
  .map((value) => ({
    value,
    label: LABEL_PT[value] ?? fallbackLabel(value),
  }))
  .sort((a, b) => a.label.localeCompare(b.label, "pt", { sensitivity: "base" }));
