/**
 * Clipboard and pasted HTML helpers for the note TipTap editor.
 */

const FORBIDDEN_TAGS = new Set([
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "style",
  "link",
  "meta",
  "base",
]);

/**
 * Collects image files from a DataTransfer (clipboard or drop).
 */
export function collectClipboardImageFiles(data: DataTransfer | null): File[] {
  if (!data) return [];
  const out: File[] = [];
  const seen = new Set<string>();

  const pushFile = (file: File) => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(file);
  };

  if (data.items?.length) {
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) pushFile(file);
      }
    }
  }

  if (out.length === 0 && data.files?.length) {
    for (let i = 0; i < data.files.length; i++) {
      const file = data.files[i];
      if (file.type.startsWith("image/")) pushFile(file);
    }
  }

  return out;
}

/**
 * Returns image files to upload on paste, or null when ProseMirror should handle paste from HTML instead.
 * If `text/html` contains an `img` element, the default HTML pipeline runs (http(s) URLs, layout).
 * Screenshot-style pastes usually yield files with empty or wrapper-only HTML without `img`.
 */
export function getClipboardImagesForUpload(data: DataTransfer | null): File[] | null {
  if (!data) return null;
  const files = collectClipboardImageFiles(data);
  if (files.length === 0) return null;
  const html = data.getData("text/html").trim();
  if (html && /<img\b/i.test(html)) return null;
  return files;
}

/**
 * Removes dangerous tags and attributes before ProseMirror parses pasted HTML.
 */
export function sanitizePastedHtml(html: string): string {
  if (!html || typeof document === "undefined") return html;

  const tpl = document.createElement("template");
  tpl.innerHTML = html;

  const snapshot = Array.from(tpl.content.querySelectorAll("*"));
  for (const el of snapshot) {
    if (!el.parentNode) continue;

    const tag = el.tagName.toLowerCase();
    if (FORBIDDEN_TAGS.has(tag)) {
      el.remove();
      continue;
    }

    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();

      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        continue;
      }

      if (
        (name === "href" || name === "src" || name === "xlink:href") &&
        /^javascript:/i.test(value)
      ) {
        el.removeAttribute(attr.name);
      }
    }
  }

  return tpl.innerHTML;
}
