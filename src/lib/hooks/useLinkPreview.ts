import { useEffect, useState } from "react";
import { type LinkPreview, fetchLinkPreview } from "@/components/signalzen/backend";
import { useSession } from "@/components/signalzen/SessionProvider";

// Module-level cache shared across all hook instances
const cache = new Map<string, LinkPreview | null>();
const inflight = new Map<string, Promise<LinkPreview | null>>();

const URL_RE = /https?:\/\/[^\s"'<>)]+/i;

function extractFirstUrl(text: string): string | null {
  return URL_RE.exec(text)?.[0] ?? null;
}

export function useLinkPreview(text: string | undefined): LinkPreview | null {
  const { appId } = useSession();
  const url = text ? extractFirstUrl(text) : null;

  const [preview, setPreview] = useState<LinkPreview | null>(() =>
    url ? (cache.get(url) ?? null) : null,
  );

  useEffect(() => {
    if (!url || !appId) return;

    if (cache.has(url)) {
      setPreview(cache.get(url) ?? null);
      return;
    }

    // Deduplicate concurrent requests for the same URL
    let req = inflight.get(url);
    if (!req) {
      req = fetchLinkPreview(appId, url);
      inflight.set(url, req);
    }

    let cancelled = false;
    req.then((data) => {
      cache.set(url, data);
      inflight.delete(url);
      if (!cancelled) setPreview(data);
    });

    return () => { cancelled = true; };
  }, [url, appId]);

  return preview;
}
