import { useState, useEffect, useRef, useCallback } from "react";
import { ClockIcon, SparkleIcon } from "../icons";
import { Avatar, TypingDots } from "./primitives";
import { Composer } from "./Composer";
import { type ApiMessage, loadMessages, getUserUuid } from "../backend";
import { useSession } from "../SessionProvider";
import { useBackend } from "../useSignalzenBackend";
import { formatDay } from "@/lib/utils/date";
import { isSameGroup } from "@/lib/utils/message";
import { InitiateMessageItem } from "./messages/InitiateMessage";
import { UserMessage } from "./messages/UserMessage";
import { RatingMessageItem } from "./messages/RatingMessage";
import { SubscriptionMessageItem } from "./messages/SubscriptionMessage";
import { BotDisableMessageItem } from "./messages/BotDisableMessage";
import { OperatorMessage } from "./messages/OperatorMessage";

function DayDivider({ label }: { label: string }) {
  return (
    <div className="my-3 flex items-center justify-center">
      <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

const PAGE_SIZE = 20;

function RealMessage({
  msg,
  continued = false,
  showTime = true,
}: {
  msg: ApiMessage;
  continued?: boolean;
  showTime?: boolean;
}) {
  if (msg.type === "InitiateMessage") return <InitiateMessageItem msg={msg} />;
  if (msg.sender_type === "User") return <UserMessage msg={msg} showTime={showTime} />;
  if (msg.type === "RatingMessage")
    return <RatingMessageItem msg={msg} continued={continued} showTime={showTime} />;
  if (msg.type === "SubscriptionMessage")
    return <SubscriptionMessageItem msg={msg} continued={continued} showTime={showTime} />;
  if (msg.type === "BotDisableMessage")
    return <BotDisableMessageItem msg={msg} continued={continued} showTime={showTime} />;
  return <OperatorMessage msg={msg} continued={continued} showTime={showTime} />;
}

export function AiChatScreen({
  withHandoff,
  onOpenArticle: _onOpenArticle,
  seed: _seed,
  onOpenAttachments,
  onFirstSend,
  onDestroyChat,
  proActiveMessages = [],
}: {
  withHandoff?: boolean;
  onOpenArticle: (id: string) => void;
  seed?: string;
  onOpenAttachments: () => void;
  onFirstSend?: () => void;
  onDestroyChat?: () => void;
  proActiveMessages?: ApiMessage[];
}) {
  const { appId, operators, anyOnline, translation } = useSession();
  const { messages, send, sendTyping, typingClientIds, userEmail, sendTranscript, destroyChat } =
    useBackend();
  const userUuid = getUserUuid();

  const [olderMessages, setOlderMessages] = useState<ApiMessage[]>([]);
  const [offset, setOffset] = useState(messages.length);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages arrive, typing changes, or on initial mount.
  // useEffect (post-paint) ensures the flex container has its final height before
  // we measure scrollHeight.
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [messages.length, typingClientIds.length, proActiveMessages.length]);

  const pinScroll = useCallback(() => {
    bottomRef.current?.scrollIntoView();
  }, []);

  // Sync offset when initial messages load
  useEffect(() => {
    setOffset(messages.length);
    setHasMore(messages.length >= PAGE_SIZE);
  }, [messages.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll — load older messages when scrolled to top
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingOlder || !hasMore || !appId || !userUuid) return;
    if (el.scrollTop > 60) return;

    const prevHeight = el.scrollHeight;
    setLoadingOlder(true);
    loadMessages(appId, userUuid, PAGE_SIZE, offset)
      .then(({ messages: fetched }) => {
        const sorted = [...fetched].reverse();
        setOlderMessages((prev) => [...sorted, ...prev]);
        setOffset((o) => o + fetched.length);
        setHasMore(fetched.length === PAGE_SIZE);
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevHeight;
        });
      })
      .catch(() => {})
      .finally(() => setLoadingOlder(false));
  }, [appId, userUuid, offset, hasMore, loadingOlder]);

  const handleSend = useCallback(
    async (body: string) => {
      onFirstSend?.();
      await send(body);
    },
    [send, onFirstSend],
  );

  // Merge: proactive messages (list 2, in-memory) + real backend messages (list 1).
  //
  // When a real Client message arrives from the backend with the same content as an
  // in-memory proactive, remap its id to the same pam-N key. React then sees the same
  // key in both renders and reuses the DOM element — no unmount/mount, no animation hiccup.
  // Once remapped, that proactive entry is excluded from proActiveToShow (no duplicate).
  const proActiveByContent = new Map<string, ApiMessage["id"]>(
    proActiveMessages.flatMap((m) => {
      const ck = m.body ?? (m.json_body ? JSON.stringify(m.json_body) : null);
      return ck ? [[ck, m.id]] : [];
    }),
  );

  const remappedMessages = messages.map((m) => {
    if (m.sender_type === "Client") {
      const ck = m.body ?? (m.json_body ? JSON.stringify(m.json_body) : null);
      if (ck) {
        const pamId = proActiveByContent.get(ck);
        if (pamId !== undefined) return { ...m, id: pamId };
      }
    }
    return m;
  });

  const remappedIds = new Set(remappedMessages.map((m) => m.id));
  const proActiveToShow = proActiveMessages.filter((m) => !remappedIds.has(m.id));

  const liveIds = new Set(remappedMessages.map((m) => m.id));
  const allMessages = [
    ...proActiveToShow,
    ...olderMessages.filter((m) => !liveIds.has(m.id) && !remappedIds.has(m.id)),
    ...remappedMessages,
  ].sort((a, b) => {
    if (!a.created_at) return -1;
    if (!b.created_at) return 1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  // Annotate each message with minute-group info
  type AnnotatedMessage = { msg: ApiMessage; continued: boolean; showTime: boolean };
  const annotated: AnnotatedMessage[] = allMessages.map((msg, i) => ({
    msg,
    continued: i > 0 && isSameGroup(allMessages[i - 1], msg),
    showTime: i === allMessages.length - 1 || !isSameGroup(msg, allMessages[i + 1]),
  }));

  // Group by day for dividers
  const groups: { day: string; items: AnnotatedMessage[] }[] = [];
  for (const item of annotated) {
    const day = item.msg.created_at ? formatDay(item.msg.created_at) : "";
    const last = groups[groups.length - 1];
    if (!last || last.day !== day) {
      groups.push({ day, items: [item] });
    } else {
      last.items.push(item);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label={translation.chat_tab_messages}
        className="flex-1 overflow-y-auto scrollbar-thin px-4 py-5"
      >
        {withHandoff && !anyOnline && (
          <div className="animate-sz-fade-in mb-3 flex items-center gap-2 rounded-xl border border-border bg-subtle/60 px-3 py-2.5 text-[12px] text-muted-foreground">
            <ClockIcon className="h-3.5 w-3.5 shrink-0" />
            {translation.chat_agents_offline_notice}
          </div>
        )}

        {loadingOlder && (
          <div className="mb-3 flex justify-center">
            <span className="text-[11px] text-muted-foreground">{translation.chat_loading}</span>
          </div>
        )}

        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.day} className="space-y-3">
              {group.day && <DayDivider label={group.day} />}
              {group.items.map(({ msg, continued, showTime }) => (
                <div key={msg.id} className={continued ? "-mt-1.5" : ""}>
                  <RealMessage msg={msg} continued={continued} showTime={showTime} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {typingClientIds.length > 0 &&
          (() => {
            // Fall back to operators[0] for single operator mode: the actual typer's client_id
            // may not be in the filtered operators list, but the single operator should be shown.
            const typer =
              operators.find((op) => op.id === String(typingClientIds[0])) ?? operators[0];
            return (
              <div className="animate-sz-fade-in mt-3 flex items-center gap-2.5">
                <Avatar name={typer?.name ?? "Operator"} size={24} src={typer?.avatarUrl} />
                <div className="rounded-2xl rounded-tl-sm bg-card px-3 py-2 shadow-sm ring-1 ring-border">
                  <TypingDots />
                </div>
              </div>
            );
          })()}

        <div ref={bottomRef} />
      </div>

      <Composer
        onOpenAttachments={onOpenAttachments}
        onSend={handleSend}
        onTyping={sendTyping}
        onResize={pinScroll}
        initialEmail={userEmail}
        onDownloadTranscript={async (email) => {
          if (!appId) return;
          await sendTranscript(email);
        }}
        onDestroyChat={async () => {
          await destroyChat();
          onDestroyChat?.();
        }}
      />
    </div>
  );
}
