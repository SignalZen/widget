export type LexicalNode = {
  type: string;
  children?: LexicalNode[];
  text?: string;
  format?: number;
  tag?: string;
  listType?: "bullet" | "number";
  url?: string;
  src?: string;
  altText?: string;
};

export function parseJson(raw: unknown): LexicalNode | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as LexicalNode; } catch { return null; }
  }
  if (typeof raw === "object") return raw as LexicalNode;
  return null;
}

export function collectText(node: LexicalNode, parts: string[]): void {
  if (node.type === "text" && node.text) parts.push(node.text);
  if (node.children) node.children.forEach((c) => collectText(c, parts));
}

export function extractLexicalText(raw: unknown): string {
  const root = parseJson(raw);
  if (!root) return "";
  const parts: string[] = [];
  collectText(root, parts);
  return parts.join(" ");
}

export function extractLexicalImages(raw: unknown): string[] {
  const root = parseJson(raw);
  if (!root) return [];
  const srcs: string[] = [];
  function collect(node: LexicalNode) {
    if (node.type === "image" && node.src) srcs.push(node.src);
    node.children?.forEach(collect);
  }
  collect(root);
  return srcs;
}

export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
