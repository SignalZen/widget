import type { LinkPreview } from "../../backend";

export function LinkPreviewCard({
  preview,
  align = "left",
}: {
  preview: LinkPreview;
  align?: "left" | "right";
}) {
  const isUser = align === "right";

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-1.5 block max-w-[280px] overflow-hidden rounded-2xl border transition-opacity hover:opacity-90 ${
        isUser
          ? "rounded-br-md border-accent/30 bg-accent/80"
          : "rounded-tl-md border-border bg-card"
      }`}
    >
      {preview.image && (
        <img
          src={preview.image}
          alt=""
          className="h-36 w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="px-3 py-2.5">
        {preview.site_name && (
          <div
            className={`mb-0.5 text-[10px] font-medium uppercase tracking-wider ${isUser ? "text-accent-foreground/60" : "text-muted-foreground"}`}
          >
            {preview.site_name}
          </div>
        )}
        <div
          className={`line-clamp-2 text-[12px] font-semibold leading-snug ${isUser ? "text-accent-foreground" : "text-foreground"}`}
        >
          {preview.title}
        </div>
        {preview.description && (
          <div
            className={`mt-0.5 line-clamp-2 text-[11px] leading-snug ${isUser ? "text-accent-foreground/70" : "text-muted-foreground"}`}
          >
            {preview.description}
          </div>
        )}
      </div>
    </a>
  );
}
