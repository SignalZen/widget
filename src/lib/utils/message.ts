import type { ApiMessage } from "@/components/signalzen/backend";

function minuteKey(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
  } catch {
    return iso;
  }
}

export function isSameGroup(a: ApiMessage, b: ApiMessage): boolean {
  if (a.sender_type !== b.sender_type) return false;
  if (a.sender_type !== "User" && a.sender?.forename !== b.sender?.forename) return false;
  if (!a.created_at || !b.created_at) return false;
  return minuteKey(a.created_at) === minuteKey(b.created_at);
}
