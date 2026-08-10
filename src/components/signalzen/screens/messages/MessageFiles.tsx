import { useEffect, useRef, useState } from "react";
import type { ApiFile } from "../../backend";
import { DownloadIcon, FileIcon } from "../../icons";

function isImage(f: ApiFile) {
  if (f.content_type) return f.content_type.startsWith("image/");
  const name = f.filename ?? f.name ?? "";
  return /\.(png|jpe?g|gif|webp|avif|bmp)$/i.test(name);
}

type Align = "left" | "right";

function FileCard({ f, displayName, align }: { f: ApiFile; displayName: string; align: Align }) {
  const href = f.download_url ?? f.url;
  const isUser = align === "right";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      download={displayName}
      className={`inline-flex items-center gap-2 px-3.5 py-2 text-[14px] transition-opacity hover:opacity-80 ${
        isUser
          ? "rounded-2xl rounded-br-md bg-accent text-accent-foreground"
          : "rounded-2xl rounded-tl-md border border-border bg-card text-foreground"
      }`}
    >
      <FileIcon
        className={`h-4 w-4 shrink-0 ${isUser ? "text-accent-foreground/70" : "text-muted-foreground"}`}
      />
      <span className="max-w-[160px] truncate">{displayName}</span>
      <DownloadIcon
        className={`h-3.5 w-3.5 shrink-0 ${isUser ? "text-accent-foreground/70" : "text-muted-foreground"}`}
      />
    </a>
  );
}

const MAX_RETRIES = 3;

function ImagePreview({
  f,
  displayName,
  align,
}: {
  f: ApiFile;
  displayName: string;
  align: Align;
}) {
  const [failed, setFailed] = useState(false);
  const retriesRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const href = f.download_url ?? f.url;

  // Reset on URL change so a fresh REST-provided URL always gets a clean attempt
  useEffect(() => {
    retriesRef.current = 0;
    setFailed(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [f.url]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleError = () => {
    if (retriesRef.current < MAX_RETRIES) {
      retriesRef.current += 1;
      const delay = 500 * retriesRef.current;
      timerRef.current = setTimeout(() => {
        // Force reload by toggling src
        if (imgRef.current) {
          imgRef.current.src = "";
          imgRef.current.src = f.url ?? "";
        }
      }, delay);
    } else {
      setFailed(true);
    }
  };

  if (failed) return <FileCard f={f} displayName={displayName} align={align} />;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block max-w-[240px] overflow-hidden rounded-2xl border border-border shadow-sm"
    >
      <img
        ref={imgRef}
        src={f.url}
        alt={displayName}
        onError={handleError}
        className="block max-h-48 w-full object-cover"
      />
    </a>
  );
}

export function MessageFiles({ files, align = "left" }: { files: ApiFile[]; align?: Align }) {
  if (!files.length) return null;

  return (
    <div className={`mt-2 flex flex-col gap-2 ${align === "right" ? "items-end" : "items-start"}`}>
      {files.map((f, i) => {
        const displayName = f.filename ?? f.name ?? "file";
        return isImage(f) && f.url ? (
          <ImagePreview key={i} f={f} displayName={displayName} align={align} />
        ) : (
          <FileCard key={i} f={f} displayName={displayName} align={align} />
        );
      })}
    </div>
  );
}
