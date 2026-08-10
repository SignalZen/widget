import type { ReactNode } from "react";
import { type LexicalNode, parseJson, extractLexicalText, readingTime } from "@/lib/utils/lexical";
import { safeUrl } from "@/lib/utils/url";

export type { LexicalNode };
export { extractLexicalText, readingTime };

const BOLD = 1;
const ITALIC = 2;
const STRIKETHROUGH = 4;
const UNDERLINE = 8;
const CODE = 16;

function renderText(node: LexicalNode, key: number): ReactNode {
  let el: ReactNode = node.text ?? "";
  const fmt = node.format ?? 0;
  if (fmt & CODE)
    el = (
      <code key={key} className="rounded bg-subtle px-1 font-mono text-[12px]">
        {el}
      </code>
    );
  if (fmt & BOLD) el = <strong key={key}>{el}</strong>;
  if (fmt & ITALIC) el = <em key={key}>{el}</em>;
  if (fmt & STRIKETHROUGH) el = <s key={key}>{el}</s>;
  if (fmt & UNDERLINE) el = <u key={key}>{el}</u>;
  return <span key={key}>{el}</span>;
}

function renderNodes(nodes: LexicalNode[]): ReactNode[] {
  return nodes.map((n, i) => renderNode(n, i));
}

function renderNode(node: LexicalNode, key: number): ReactNode {
  const children = node.children ? renderNodes(node.children) : null;

  switch (node.type) {
    case "root":
      return <>{children}</>;

    case "paragraph":
      return (
        <p key={key} className="mb-3 last:mb-0 empty:hidden">
          {children ?? <br />}
        </p>
      );

    case "heading": {
      const tag = (node.tag ?? "h2") as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      const cls: Record<string, string> = {
        h1: "mb-3 text-xl font-bold",
        h2: "mb-2 text-lg font-bold",
        h3: "mb-2 text-base font-semibold",
        h4: "mb-1 text-sm font-semibold",
        h5: "mb-1 text-sm font-medium",
        h6: "mb-1 text-xs font-medium",
      };
      const Tag = tag;
      return (
        <Tag key={key} className={cls[tag]}>
          {children}
        </Tag>
      );
    }

    case "list": {
      const ordered = node.listType === "number";
      const Tag = ordered ? "ol" : "ul";
      return (
        <Tag key={key} className={`mb-3 pl-5 ${ordered ? "list-decimal" : "list-disc"}`}>
          {children}
        </Tag>
      );
    }

    case "listitem":
      return (
        <li key={key} className="mb-0.5">
          {children}
        </li>
      );

    case "quote":
      return (
        <blockquote
          key={key}
          className="mb-3 border-l-2 border-border pl-3 italic text-muted-foreground"
        >
          {children}
        </blockquote>
      );

    case "link": {
      const href = safeUrl(node.url);
      return href ? (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="underline">
          {children}
        </a>
      ) : (
        <span key={key}>{children}</span>
      );
    }

    case "image": {
      const src = safeUrl(node.src);
      return src ? (
        <img key={key} src={src} alt={node.altText ?? ""} className="my-2 max-w-full rounded" />
      ) : null;
    }

    case "horizontalrule":
      return <hr key={key} className="my-4 border-border" />;

    case "linebreak":
      return <br key={key} />;

    case "text":
      return renderText(node, key);

    default:
      return children ? <span key={key}>{children}</span> : null;
  }
}

export function LexicalContent({ json }: { json: unknown }) {
  const root = parseJson(json);
  if (!root) return null;
  return <div className="text-[14px] leading-relaxed text-foreground">{renderNode(root, 0)}</div>;
}
