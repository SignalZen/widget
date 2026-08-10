const ALLOWED_SCHEMES = ["http:", "https:"];

/** Returns the URL only when its scheme is http or https, otherwise undefined. */
export function safeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return ALLOWED_SCHEMES.includes(parsed.protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}
