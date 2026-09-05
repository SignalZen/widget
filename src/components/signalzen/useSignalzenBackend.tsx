import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type ApiMessage,
  clearUserSession,
  connectUserSocket,
  createUser,
  deleteUser,
  getBrowserLanguage,
  getGuestUuid,
  getLocalTime,
  getStoredAutoInvitations,
  getStoredDeliveredLastId,
  getStoredReadLastId,
  getUserData,
  getUserUuid,
  loadMessage,
  loadMessages,
  pingUserSession,
  postInitiateMessage,
  postMessage,
  postMessageWithFiles,
  requestTranscript,
  type SocketCallbacks,
  type SocketHandle,
  storeDeliveredLastId,
  storeReadLastId,
  updateUser,
  updateUserData,
} from "./backend";
import { useSession } from "./SessionProvider";

export type BackendState = {
  messages: ApiMessage[];
  unreadCount: number;
  /** Client IDs currently showing a typing indicator */
  typingClientIds: number[];
  userEmail: string | undefined;
  captchaVisible: boolean;
  onCaptchaSolved: (token: string) => void;
  send: (body: string) => Promise<void>;
  sendWithFiles: (files: File[], onProgress?: (pct: number) => void) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  markRead: () => void;
  sendTranscript: (email: string) => Promise<void>;
  /** Create a new user with pre-chat form values, connect socket, and send InitiateMessage if account is configured to do so. */
  initUser: (attrs: Record<string, string>) => Promise<void>;
  /** GDPR destroy: DELETE the user on the server, clear cookies, reset all state, disconnect socket. */
  destroyChat: () => Promise<void>;
};

const BackendContext = createContext<BackendState | null>(null);

const IDLE: BackendState = {
  messages: [],
  unreadCount: 0,
  typingClientIds: [],
  userEmail: undefined,
  captchaVisible: false,
  onCaptchaSolved: () => undefined,
  send: async () => undefined,
  sendWithFiles: async () => undefined,
  sendTyping: () => undefined,
  markRead: () => undefined,
  sendTranscript: async () => undefined,
  initUser: async () => undefined,
  destroyChat: async () => undefined,
};

export function useBackend(): BackendState {
  return useContext(BackendContext) ?? IDLE;
}

let audioContext: AudioContext | null = null;
let _pendingBlip = false;
let _pendingBlipAt = 0;
const PENDING_TTL_MS = 8000;

function scheduleBlipNotes(ctx: AudioContext) {
  const t = ctx.currentTime;
  [
    { freq: 523.25, start: 0, dur: 0.32 },
    { freq: 659.25, start: 0.16, dur: 0.38 },
  ].forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t + start);
    gain.gain.setValueAtTime(0.001, t + start);
    gain.gain.linearRampToValueAtTime(0.18, t + start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
    osc.start(t + start);
    osc.stop(t + start + dur);
  });
}

// Chrome only counts pointer events (pointerdown, click, touchend, etc.) as
// activation gestures for AudioContext — keydown is intentionally excluded.
function onPointerGesture() {
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === "suspended") {
    audioContext
      .resume()
      .then(() => {
        if (_pendingBlip && Date.now() - _pendingBlipAt < PENDING_TTL_MS) {
          _pendingBlip = false;
          scheduleBlipNotes(audioContext!);
        } else {
          _pendingBlip = false;
        }
      })
      .catch(() => {
        _pendingBlip = false;
      });
  } else if (_pendingBlip) {
    if (Date.now() - _pendingBlipAt < PENDING_TTL_MS) scheduleBlipNotes(audioContext);
    _pendingBlip = false;
  }
}

function onPointerMove() {
  // pointermove cannot unlock a suspended AudioContext — Chrome only grants autoplay
  // activation on pointer/click events. Flush pending blips only if already running.
  if (audioContext?.state !== "running" || !_pendingBlip) return;
  if (Date.now() - _pendingBlipAt < PENDING_TTL_MS) scheduleBlipNotes(audioContext);
  _pendingBlip = false;
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", onPointerGesture, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
}

export function playBlip() {
  if (audioContext?.state === "running") {
    scheduleBlipNotes(audioContext);
  } else {
    _pendingBlip = true;
    _pendingBlipAt = Date.now();
  }
}

export function SignalzenBackendProvider({
  language,
  isOpen = false,
  children,
}: {
  language?: string;
  isOpen?: boolean;
  children: React.ReactNode;
}) {
  const { appId, windowUuid, status: sessionStatus, account, applySession } = useSession();
  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [typingClientIds, setTypingClientIds] = useState<number[]>([]);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [captchaVisible, setCaptchaVisible] = useState(false);
  const captchaResolverRef = useRef<((token: string) => void) | null>(null);

  const requestCaptchaToken = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      captchaResolverRef.current = resolve;
      setCaptchaVisible(true);
    });
  }, []);

  const onCaptchaSolved = useCallback((token: string) => {
    setCaptchaVisible(false);
    captchaResolverRef.current?.(token);
    captchaResolverRef.current = null;
  }, []);

  const socketRef = useRef<SocketHandle | null>(null);
  // Typing auto-clear timers keyed by client_id
  const typingTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // ------------------------------------------------------------------
  // Socket callbacks — stable ref so they always close over latest state
  // setters without needing to recreate the socket
  // ------------------------------------------------------------------
  const handleTyping = useCallback((payload: { is_typing: boolean; client_id: number }) => {
    const { is_typing, client_id } = payload;

    // Clear any existing auto-clear timer for this client
    const existing = typingTimersRef.current.get(client_id);
    if (existing) clearTimeout(existing);

    if (is_typing) {
      setTypingClientIds((prev) => (prev.includes(client_id) ? prev : [...prev, client_id]));
      // Auto-clear after 5 s if no stop event arrives
      const timer = setTimeout(() => {
        setTypingClientIds((prev) => prev.filter((id) => id !== client_id));
        typingTimersRef.current.delete(client_id);
      }, 5_000);
      typingTimersRef.current.set(client_id, timer);
    } else {
      setTypingClientIds((prev) => prev.filter((id) => id !== client_id));
      typingTimersRef.current.delete(client_id);
    }
  }, []);

  const buildCallbacks = useCallback(
    (appId: string, userUuid: string): SocketCallbacks => ({
      onMessageCreated: ({ message, play_blip }) => {
        // Operator messages carry the full message object; user's own messages have empty params
        if (!message) return;
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
        if (message.sender_type !== "User") {
          setUnread((u) => u + 1);
          if (play_blip && (!isOpenRef.current || !document.hasFocus())) playBlip();
          window.dispatchEvent(
            new CustomEvent("signalzen.messageReceived", { detail: { message } }),
          );
          if (typeof message.id === "number") {
            // Mark as read (widget open) or delivered (widget closed) on the server,
            // skipping the request when the ID was already reported via cookie.
            const attr: Record<string, number> = {};
            if (message.id > getStoredDeliveredLastId()) {
              attr.delivered_last_message_id = message.id;
              storeDeliveredLastId(message.id);
            }
            if (isOpenRef.current && message.id > getStoredReadLastId()) {
              attr.read_last_message_id = message.id;
              storeReadLastId(message.id);
            }
            if (Object.keys(attr).length > 0) updateUser(appId, userUuid, attr).catch(() => {});
            if (isOpenRef.current) setUnread(0);
            // Re-fetch from REST to get fresh presigned file URLs and complete data.
            // The websocket payload may have stale or missing file URLs; the REST
            // response always generates them fresh at request time.
            loadMessage(appId, userUuid, message.id)
              .then((fresh) =>
                setMessages((prev) => prev.map((m) => (m.id === fresh.id ? fresh : m))),
              )
              .catch(() => {});
          }
        }
      },
      onUserUpdated: () => {
        pingUserSession(appId, userUuid, {
          guest_uuid: getGuestUuid(),
          window_uuid: windowUuid,
          last_url: typeof window !== "undefined" ? window.location.href : "",
          bl: getBrowserLanguage(),
          local_time: getLocalTime(),
          ...(language ? { sl: language } : {}),
        })
          .then((session) => {
            applySession(session);
          })
          .catch(() => {});
      },
      onUserDeleted: () => {
        clearUserSession();
        setMessages([]);
        setUnread(0);
        setTypingClientIds([]);
        setUserEmail(undefined);
        socketRef.current?.close();
        socketRef.current = null;
      },
      onClientTyping: handleTyping,
    }),
    [windowUuid, language, handleTyping, applySession],
  );

  const connectSocket = useCallback(
    (appId: string, userUuid: string) => {
      if (socketRef.current) return;
      socketRef.current = connectUserSocket(
        appId,
        userUuid,
        windowUuid,
        buildCallbacks(appId, userUuid),
        language,
      );
    },
    [windowUuid, language, buildCallbacks],
  );

  // ------------------------------------------------------------------
  // Main effect — runs when an existing user session is live
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!appId || sessionStatus !== "live") return;
    const userUuid = getUserUuid();
    if (!userUuid) return;

    let cancelled = false;

    // Send any pre-configured userData to the existing user on first live session
    const initialData = getUserData();
    if (Object.keys(initialData).length > 0) {
      updateUserData(appId, userUuid, initialData).catch(() => {});
    }

    (async () => {
      // Load initial messages
      try {
        const list = await loadMessages(appId, userUuid, 20, 0);
        if (cancelled) return;
        const sorted = (list.messages ?? []).slice().reverse();
        setMessages(sorted);
        // Notify server of delivered/read state for the last message,
        // skipping the request when the ID was already reported via cookie.
        const lastMsg = sorted[sorted.length - 1];
        if (lastMsg && typeof lastMsg.id === "number") {
          const attr: Record<string, number> = {};
          if (lastMsg.id > getStoredDeliveredLastId()) {
            attr.delivered_last_message_id = lastMsg.id;
            storeDeliveredLastId(lastMsg.id);
          }
          if (isOpenRef.current && lastMsg.id > getStoredReadLastId()) {
            attr.read_last_message_id = lastMsg.id;
            storeReadLastId(lastMsg.id);
          }
          if (Object.keys(attr).length > 0) updateUser(appId, userUuid, attr).catch(() => {});
        }
      } catch {
        /* ignore */
      }

      if (cancelled) return;

      connectSocket(appId, userUuid);
    })();

    return () => {
      cancelled = true;
    };
  }, [appId, windowUuid, sessionStatus, connectSocket]);

  // Listen for runtime pushUserData calls (SPA use-case)
  useEffect(() => {
    if (!appId) return;
    const handler = (e: Event) => {
      const data = (e as CustomEvent<Record<string, unknown>>).detail;
      const userUuid = getUserUuid();
      if (!userUuid) return;
      updateUserData(appId, userUuid, data).catch(() => {});
    };
    document.addEventListener("signalzen.pushUserData", handler);
    return () => document.removeEventListener("signalzen.pushUserData", handler);
  }, [appId]);

  // Disconnect socket on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.close();
      socketRef.current = null;
      typingTimersRef.current.forEach(clearTimeout);
      typingTimersRef.current.clear();
    };
  }, []);

  const value = useMemo<BackendState>(
    () => ({
      messages,
      unreadCount: unread,
      typingClientIds,
      userEmail,
      captchaVisible,
      onCaptchaSolved,
      markRead: () => {
        setUnread(0);
        const userUuid = getUserUuid();
        if (appId && userUuid && messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          if (typeof lastMsg.id === "number") {
            const attr: Record<string, number> = {};
            if (lastMsg.id > getStoredDeliveredLastId()) {
              attr.delivered_last_message_id = lastMsg.id;
              storeDeliveredLastId(lastMsg.id);
            }
            if (lastMsg.id > getStoredReadLastId()) {
              attr.read_last_message_id = lastMsg.id;
              storeReadLastId(lastMsg.id);
            }
            if (Object.keys(attr).length > 0) updateUser(appId, userUuid, attr).catch(() => {});
          }
        }
      },
      sendTranscript: async (email: string) => {
        if (!appId) throw new Error("No appId");
        const uuid = getUserUuid();
        if (!uuid) throw new Error("No user");
        if (email && email !== userEmail) {
          await updateUser(appId, uuid, { email });
          setUserEmail(email);
        }
        await requestTranscript(appId, uuid);
      },
      sendTyping: (isTyping: boolean) => {
        const uuid = getUserUuid();
        if (!uuid || !socketRef.current) return;
        socketRef.current.socket.emit("user.typing", { uuid, is_typing: isTyping });
      },
      send: async (body: string) => {
        if (!appId) throw new Error("No appId");
        let userUuid = getUserUuid();
        const isFirstSend = !userUuid;

        if (!userUuid) {
          // First-time user: verify captcha if required, then create account
          const captchaToken = account?.captcha ? await requestCaptchaToken() : undefined;
          const created = await createUser(appId, {
            ...getUserData(),
            ...(captchaToken ? { captcha_token: captchaToken } : {}),
          });
          userUuid = created.uuid;
          connectSocket(appId, userUuid);
          window.dispatchEvent(
            new CustomEvent("signalzen.chatStarted", { detail: { uuid: userUuid } }),
          );
        }

        const optimisticId = `local-${Date.now()}`;
        const optimistic: ApiMessage = {
          id: optimisticId,
          body,
          sender_type: "User",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimistic]);

        try {
          await postMessage(
            appId,
            userUuid,
            body,
            isFirstSend ? getStoredAutoInvitations() : undefined,
          );
          window.dispatchEvent(new CustomEvent("signalzen.messageSent", { detail: { body } }));
        } catch (err) {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
          throw err;
        }
      },
      sendWithFiles: async (files: File[], onProgress?: (pct: number) => void) => {
        if (!appId) throw new Error("No appId");
        let userUuid = getUserUuid();
        const isFirstSend = !userUuid;

        if (!userUuid) {
          const captchaToken = account?.captcha ? await requestCaptchaToken() : undefined;
          const created = await createUser(appId, {
            ...getUserData(),
            ...(captchaToken ? { captcha_token: captchaToken } : {}),
          });
          userUuid = created.uuid;
          connectSocket(appId, userUuid);
          window.dispatchEvent(
            new CustomEvent("signalzen.chatStarted", { detail: { uuid: userUuid } }),
          );
        }

        const uploaded = await postMessageWithFiles(
          appId,
          userUuid,
          files,
          onProgress,
          isFirstSend ? getStoredAutoInvitations() : undefined,
        );
        // Websocket skips the sender's own message.created event, so push
        // the API response directly into state so files appear immediately.
        setMessages((prev) => [...prev, uploaded]);
        window.dispatchEvent(new CustomEvent("signalzen.messageSent", { detail: { files } }));
      },
      initUser: async (attrs: Record<string, string>) => {
        if (!appId) return;
        const captchaToken = account?.captcha ? await requestCaptchaToken() : undefined;
        const created = await createUser(appId, {
          ...getUserData(),
          ...attrs,
          ...(captchaToken ? { captcha_token: captchaToken } : {}),
        });
        const userUuid = created.uuid;
        connectSocket(appId, userUuid);
        window.dispatchEvent(
          new CustomEvent("signalzen.chatStarted", { detail: { uuid: userUuid } }),
        );
        if (account?.auto_initiate_after_form) {
          try {
            const msg = await postInitiateMessage(appId, userUuid);
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          } catch {
            /* noop */
          }
        }
      },
      destroyChat: async () => {
        if (!appId) return;
        const userUuid = getUserUuid();
        if (userUuid) {
          try {
            await deleteUser(appId, userUuid);
          } catch {
            /* noop — clear local state regardless */
          }
        }
        clearUserSession();
        setMessages([]);
        setUnread(0);
        setTypingClientIds([]);
        setUserEmail(undefined);
        socketRef.current?.close();
        socketRef.current = null;
      },
    }),
    [
      appId,
      account,
      messages,
      unread,
      typingClientIds,
      userEmail,
      captchaVisible,
      onCaptchaSolved,
      requestCaptchaToken,
      connectSocket,
    ],
  );

  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
}
