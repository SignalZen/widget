import { safeUrl } from "@/lib/utils/url";

const URL_RE = /(https?:\/\/[^\s"'<>)]+)/g;

export function LinkedText({
  text,
  className,
  linkClassName,
}: {
  text: string;
  className?: string;
  linkClassName?: string;
}) {
  const parts = text.split(URL_RE);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          // Odd indices are the captured URL groups
          const href = safeUrl(part);
          return href ? (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName ?? "underline"}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          ) : (
            <span key={i}>{part}</span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
