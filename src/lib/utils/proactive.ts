import { useState, useEffect, useRef, useCallback } from "react";
import type { ApiMessage, ProActiveMessage, ProActiveClient } from "@/components/signalzen/backend";
import { readCookie, writeCookie, getUserUuid, postProActiveMessageTrigger } from "@/components/signalzen/backend";

export type { ProActiveMessage, ProActiveClient };

type StoredInvitation = {
  id: number;
  uuid: string;
  createdAt: string;
  clientId: number | null;
  read: boolean;
  closed: boolean;
};

/** Internal per-entry state — not exported; callers receive ApiMessage[]. */
type ProActiveEntry = {
  numericId: number;
  msg: ApiMessage;
  read: boolean;
  closed: boolean;
};

const COOKIE_AUTO_INVITATIONS = "_signalZen_auto_invitations";
const COOKIE_FIRST_VISIT = "_signalZen_first_visit";
const COOKIE_FIRST_OPEN = "_signalZen_first_open";

function loadStored(): StoredInvitation[] {
  const raw = readCookie(COOKIE_AUTO_INVITATIONS);
  if (!raw) return [];
  try {
    return JSON.parse(decodeURIComponent(raw)) as StoredInvitation[];
  } catch {
    return [];
  }
}

function saveStored(items: StoredInvitation[]): void {
  writeCookie(COOKIE_AUTO_INVITATIONS, JSON.stringify(items));
}

function genUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function shouldShowWhen(when: string, anyOnline: boolean): boolean {
  if (when === "online") return anyOnline;
  if (when === "offline") return !anyOnline;
  return true; // "always"
}

function buildApiMessage(
  msg: ProActiveMessage,
  client: ProActiveClient | null,
  createdAt: string,
): ApiMessage {
  return {
    id: `pam-${msg.id}`,
    body: msg.body,
    json_body: msg.json_body,
    sender_type: "Client",
    sender: client
      ? { forename: client.forename, picture_medium_url: client.picture_medium_url }
      : undefined,
    created_at: createdAt,
  };
}

export function useProActiveMessages({
  appId,
  messages,
  fallbackClient,
  anyOnline,
  isOpen,
  onNew,
}: {
  appId: string | undefined;
  messages: ProActiveMessage[];
  fallbackClient: ProActiveClient | null;
  anyOnline: boolean;
  isOpen: boolean;
  onNew?: () => void;
}): {
  /** All non-closed proactive messages — merge with real messages for chat display. */
  proActiveMessages: ApiMessage[];
  /** IDs of proactive messages not yet read — use for popup and unread badge. */
  unreadIds: Set<ApiMessage["id"]>;
  dismiss: (id: ApiMessage["id"]) => void;
  onWidgetOpen: () => void;
} {
  const [entries, setEntries] = useState<ProActiveEntry[]>([]);
  const restoredFromCookie = useRef(false);

  const scheduledIds = useRef(new Set<number>());
  const firstVisitScheduled = useRef(false);
  const firstOpenScheduled = useRef(false);
  const anyOnlineRef = useRef(anyOnline);
  const fallbackClientRef = useRef(fallbackClient);
  const messagesRef = useRef(messages);
  const appIdRef = useRef(appId);
  const isOpenRef = useRef(isOpen);
  const onNewRef = useRef(onNew);
  const pendingShortcuts = useRef<string[]>([]);

  useEffect(() => { anyOnlineRef.current = anyOnline; }, [anyOnline]);
  useEffect(() => { fallbackClientRef.current = fallbackClient; }, [fallbackClient]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { appIdRef.current = appId; }, [appId]);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  useEffect(() => { onNewRef.current = onNew; }, [onNew]);

  // Restore persisted proactive messages from cookie once session messages are available.
  useEffect(() => {
    if (messages.length === 0 || restoredFromCookie.current) return;
    restoredFromCookie.current = true;

    const stored = loadStored();
    const toRestore: ProActiveEntry[] = [];
    for (const s of stored) {
      if (s.closed) continue;
      const proMsg = messages.find((m) => m.id === s.id);
      if (!proMsg || (!proMsg.body && !proMsg.json_body)) continue;
      toRestore.push({
        numericId: s.id,
        msg: buildApiMessage(proMsg, proMsg.client ?? null, s.createdAt),
        read: s.read,
        closed: false,
      });
    }
    if (toRestore.length > 0) {
      setEntries((prev) => {
        const existingIds = new Set(prev.map((e) => e.numericId));
        return [...prev, ...toRestore.filter((e) => !existingIds.has(e.numericId))];
      });
    }
  }, [messages]);

  // Record first_visit timestamp once, ever
  useEffect(() => {
    if (!readCookie(COOKIE_FIRST_VISIT)) {
      writeCookie(COOKIE_FIRST_VISIT, new Date().toISOString());
    }
  }, []);

  const pushEntry = useCallback((numericId: number, apiMsg: ApiMessage) => {
    setEntries((prev) => {
      if (prev.some((e) => e.numericId === numericId)) return prev;
      return [...prev, { numericId, msg: apiMsg, read: false, closed: false }];
    });
  }, []);

  // Schedule a proactive message to appear after its remaining delay.
  // Writes the cookie and adds the entry when the timer fires.
  // If the widget is open when the timer fires, the entry is added as already read
  // so it won't show a popup or badge after the user closes the widget.
  const triggerInvitation = useCallback((msg: ProActiveMessage, referenceTime: Date) => {
    if (scheduledIds.current.has(msg.id)) return;
    scheduledIds.current.add(msg.id);

    const client = msg.client ?? fallbackClientRef.current;
    const elapsedMs = Date.now() - referenceTime.getTime();
    const remainingMs = Math.max(0, msg.delay_seconds * 1000 - elapsedMs);

    setTimeout(() => {
      if (getUserUuid() || (!msg.body && !msg.json_body)) return;
      const stored = loadStored();
      if (stored.some((s) => s.id === msg.id)) return;

      const read = isOpenRef.current;
      const now = new Date().toISOString();
      stored.push({ id: msg.id, uuid: genUuid(), createdAt: now, clientId: client?.id ?? null, read, closed: false });
      saveStored(stored);
      setEntries((prev) => {
        if (prev.some((e) => e.numericId === msg.id)) return prev;
        return [...prev, { numericId: msg.id, msg: buildApiMessage(msg, client, now), read, closed: false }];
      });
      onNewRef.current?.();
    }, remainingMs);
  }, []);

  // Force-fire a javascript-kind invitation: respects delay from now, re-triggers even if seen before.
  const fireJavascriptInvitation = useCallback((msg: ProActiveMessage) => {
    const client = msg.client ?? fallbackClientRef.current;
    setTimeout(() => {
      if (!msg.body && !msg.json_body) return;
      const userUuid = getUserUuid();
      if (userUuid && appIdRef.current) {
        postProActiveMessageTrigger(appIdRef.current, userUuid, msg.id).catch(() => {});
        return;
      }
      if (userUuid) return;

      const read = isOpenRef.current;
      const now = new Date().toISOString();
      const stored = loadStored();
      const existingIdx = stored.findIndex((s) => s.id === msg.id);
      if (existingIdx >= 0) {
        stored[existingIdx] = { ...stored[existingIdx], createdAt: now, read, closed: false };
      } else {
        stored.push({ id: msg.id, uuid: genUuid(), createdAt: now, clientId: client?.id ?? null, read, closed: false });
      }
      saveStored(stored);

      const apiMsg = buildApiMessage(msg, client, now);
      setEntries((prev) => {
        const rest = prev.filter((e) => e.numericId !== msg.id);
        return [...rest, { numericId: msg.id, msg: apiMsg, read, closed: false }];
      });
      onNewRef.current?.();
    }, msg.delay_seconds * 1000);
  }, []);

  // Schedule first_visit messages once when session arrives
  useEffect(() => {
    if (messages.length === 0 || firstVisitScheduled.current || getUserUuid()) return;
    firstVisitScheduled.current = true;

    const firstVisitAt = readCookie(COOKIE_FIRST_VISIT);
    const reference = firstVisitAt ? new Date(firstVisitAt) : new Date();
    const storedIds = new Set(loadStored().map((s) => s.id));

    for (const msg of messages) {
      if (msg.kind !== "first_visit" || msg.disabled || storedIds.has(msg.id)) continue;
      if (!shouldShowWhen(msg.when, anyOnlineRef.current)) continue;
      triggerInvitation(msg, reference);
    }
  }, [messages, triggerInvitation]);

  // Re-schedule first_open messages that weren't shown in a previous visit (session load).
  // Also called on first widget open.
  const handleFirstOpen = useCallback((fromSessionLoad = false) => {
    if (firstOpenScheduled.current || getUserUuid()) return;
    const hadFirstOpen = readCookie(COOKIE_FIRST_OPEN);
    if (fromSessionLoad && !hadFirstOpen) return;
    firstOpenScheduled.current = true;

    if (!hadFirstOpen) writeCookie(COOKIE_FIRST_OPEN, new Date().toISOString());
    const reference = hadFirstOpen ? new Date(hadFirstOpen) : new Date();
    const storedIds = new Set(loadStored().map((s) => s.id));

    for (const msg of messages) {
      if (msg.kind !== "first_open" || msg.disabled || storedIds.has(msg.id)) continue;
      if (!shouldShowWhen(msg.when, anyOnlineRef.current)) continue;
      triggerInvitation(msg, reference);
    }
  }, [messages, triggerInvitation]);

  useEffect(() => {
    if (messages.length === 0 || getUserUuid()) return;
    handleFirstOpen(true);
  }, [messages, handleFirstOpen]);

  const fireTriggerByShortcut = useCallback((shortcut: string) => {
    const all = messagesRef.current;
    if (all.length === 0) {
      pendingShortcuts.current.push(shortcut);
      return;
    }

    const javascriptMessages = all.filter((m) => m.kind === "javascript");
    if (javascriptMessages.length === 0) return;

    const byShortcut = javascriptMessages.find((m) => m.shortcut === shortcut);
    if (!byShortcut) return;
    if (byShortcut.disabled) return;
    if (!byShortcut.body && !byShortcut.json_body) return;
    if (!shouldShowWhen(byShortcut.when, anyOnlineRef.current)) return;

    const userUuid = getUserUuid();
    if (userUuid && appIdRef.current) {
      postProActiveMessageTrigger(appIdRef.current, userUuid, byShortcut.id)
        .then((returnedMsg) => {
          // Use pam-N id so AiChatScreen's body-match dedup can remap the real websocket
          // message to the same key and avoid a flash.
          const pamMsg: ApiMessage = { ...returnedMsg, id: `pam-${byShortcut.id}` };
          // Persist to cookie so unread state survives page refresh.
          const now = new Date().toISOString();
          const stored = loadStored();
          const existingIdx = stored.findIndex((s) => s.id === byShortcut.id);
          if (existingIdx >= 0) {
            stored[existingIdx] = { ...stored[existingIdx], createdAt: now, read: false, closed: false };
          } else {
            stored.push({ id: byShortcut.id, uuid: genUuid(), createdAt: now, clientId: null, read: false, closed: false });
          }
          saveStored(stored);
          // Always replace (not skip-if-exists) so re-triggering after opening marks it unread again.
          setEntries((prev) => {
            const rest = prev.filter((e) => e.numericId !== byShortcut.id);
            return [...rest, { numericId: byShortcut.id, msg: pamMsg, read: false, closed: false }];
          });
        })
        .catch(() => {});
    } else if (!userUuid) {
      fireJavascriptInvitation(byShortcut);
    }
  }, [fireJavascriptInvitation]);

  // Drain any shortcuts that arrived before the session loaded
  useEffect(() => {
    if (messages.length === 0 || pendingShortcuts.current.length === 0) return;
    const queued = pendingShortcuts.current.splice(0);
    for (const shortcut of queued) fireTriggerByShortcut(shortcut);
  }, [messages, fireTriggerByShortcut]);

  // Listen for javascript-kind triggers dispatched by the host page
  useEffect(() => {
    const handler = (event: Event) => {
      const shortcut = (event as CustomEvent<{ shortcut?: string }>).detail?.shortcut;
      if (!shortcut) return;
      fireTriggerByShortcut(shortcut);
    };

    document.addEventListener("signalzen.triggerProActiveMessage", handler);
    return () => document.removeEventListener("signalzen.triggerProActiveMessage", handler);
  }, [fireTriggerByShortcut]);

  const dismiss = useCallback((id: ApiMessage["id"]) => {
    const numericId = typeof id === "string" ? parseInt(id.replace("pam-", ""), 10) : id;
    const stored = loadStored().map((s) => s.id === numericId ? { ...s, closed: true } : s);
    saveStored(stored);
    setEntries((prev) => prev.map((e) => e.numericId === numericId ? { ...e, closed: true } : e));
  }, []);

  const onWidgetOpen = useCallback(() => {
    handleFirstOpen();
    const stored = loadStored().map((s) => ({ ...s, read: true }));
    saveStored(stored);
    setEntries((prev) => prev.map((e) => ({ ...e, read: true })));
  }, [handleFirstOpen]);

  const proActiveMessages = entries.filter((e) => !e.closed).map((e) => e.msg);
  const unreadIds = new Set(entries.filter((e) => !e.closed && !e.read).map((e) => e.msg.id));

  return { proActiveMessages, unreadIds, dismiss, onWidgetOpen };
}
