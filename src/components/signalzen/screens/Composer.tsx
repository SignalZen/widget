import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DownloadIcon, PaperclipIcon, SendIcon, SmileIcon, TrashIcon } from "../icons";
import { IconBtn } from "./primitives";
import { useSession } from "../SessionProvider";
import { useBackend } from "../useSignalzenBackend";
import { getUserUuid } from "../backend";

export function Composer({
  placeholder,
  onSend,
  onOpenAttachments,
  onDownloadTranscript,
  onDestroyChat,
  onTyping,
  onResize,
  initialEmail,
}: {
  placeholder?: string;
  onSend?: (text: string) => void;
  onOpenAttachments?: () => void;
  onDownloadTranscript?: (email: string) => void;
  onDestroyChat?: () => void;
  onTyping?: (isTyping: boolean) => void;
  onResize?: () => void;
  initialEmail?: string;
}) {
  const { account, translation } = useSession();
  const { messages } = useBackend();
  const chatCreated = messages.length > 0 && !!getUserUuid();
  const transcriptEnabled = chatCreated && !!account?.allow_gdpr_transcript;
  const destroyEnabled = chatCreated && !!account?.allow_gdpr_destroy;

  const [val, setVal] = useState("");
  const [menu, setMenu] = useState<null | "transcript" | "destroy" | "emoji">(null);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [transcriptSending, setTranscriptSending] = useState(false);
  const [transcriptSent, setTranscriptSent] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync pre-populated email when it arrives from the backend (e.g. after ping)
  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  useLayoutEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
    onResize?.();
  }, [val]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopTyping = () => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    onTyping?.(false);
  };

  const submit = () => {
    if (!val.trim()) return;
    stopTyping();
    onSend?.(val.trim());
    setVal("");
  };

  const sendTranscript = async () => {
    const e = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    setTranscriptSending(true);
    try {
      await onDownloadTranscript?.(e);
      setTranscriptSent(true);
      setTimeout(() => {
        setTranscriptSent(false);
        setMenu(null);
        setEmail("");
      }, 2500);
    } catch {
      /* noop */
    } finally {
      setTranscriptSending(false);
    }
  };

  const destroy = () => {
    onDestroyChat?.();
    setMenu(null);
  };

  const insertEmoji = (emoji: string) => {
    const ta = ref.current;
    if (!ta) {
      setVal((v) => v + emoji);
      return;
    }
    const start = ta.selectionStart ?? val.length;
    const end = ta.selectionEnd ?? val.length;
    const next = val.slice(0, start) + emoji + val.slice(end);
    setVal(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="border-t border-border bg-card px-3 pb-3 pt-2">
      {transcriptEnabled && menu === "transcript" && (
        <div
          id="composer-transcript-panel"
          className="animate-sz-fade-in mb-2 rounded-2xl border border-border bg-card p-3 shadow-sm"
        >
          <div className="mb-1.5 flex items-center gap-2">
            <DownloadIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] font-semibold text-foreground">
              {translation.chat_transcript_title}
            </span>
          </div>
          {transcriptSent ? (
            <p className="text-[12px] text-success">{translation.chat_transcript_sent}</p>
          ) : (
            <>
              <p className="mb-2 text-[11px] text-muted-foreground">
                {translation.chat_transcript_description}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void sendTranscript();
                  }}
                  placeholder={translation.chat_transcript_email_input_placeholder}
                  aria-label={translation.chat_transcript_email_input_placeholder}
                  className="h-8 flex-1 rounded-lg border border-border bg-card px-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/20 focus:outline-none"
                  autoFocus
                  disabled={transcriptSending}
                />
                <button
                  type="button"
                  onClick={() => setMenu(null)}
                  disabled={transcriptSending}
                  className="h-8 rounded-lg px-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {translation.chat_cancel_button}
                </button>
                <button
                  type="button"
                  onClick={() => void sendTranscript()}
                  disabled={transcriptSending}
                  className="h-8 rounded-lg bg-foreground px-3 text-[12px] font-medium text-background hover:opacity-90 disabled:opacity-50"
                >
                  {transcriptSending
                    ? translation.chat_sending_label
                    : translation.chat_send_transcript_button}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {menu === "destroy" && (
        <div
          id="composer-destroy-panel"
          className="animate-sz-fade-in mb-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3"
        >
          <div className="mb-1 flex items-center gap-2">
            <TrashIcon className="h-3.5 w-3.5 text-destructive" />
            <span className="text-[12px] font-semibold text-foreground">
              {translation.chat_destroy_title}
            </span>
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">
            {translation.chat_destroy_description}
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setMenu(null)}
              className="h-8 rounded-lg px-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
            >
              {translation.chat_cancel_button}
            </button>
            <button
              type="button"
              onClick={destroy}
              className="h-8 rounded-lg bg-destructive px-3 text-[12px] font-medium text-destructive-foreground hover:opacity-90"
            >
              {translation.chat_destroy_confirm_button}
            </button>
          </div>
        </div>
      )}
      {menu === "emoji" && (
        <div
          id="composer-emoji-panel"
          className="animate-sz-fade-in mb-2 rounded-2xl border border-border bg-card p-3 shadow-sm"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-foreground">
              {translation.chat_emoji_panel_title}
            </span>
            <button
              type="button"
              onClick={() => setMenu(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              {translation.chat_close_button}
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1">
            {[
              "👍",
              "❤️",
              "😂",
              "😮",
              "🎉",
              "🔥",
              "👏",
              "🤔",
              "😢",
              "😍",
              "🙏",
              "👌",
              "🚀",
              "⭐",
              "✅",
              "👋",
              "😊",
              "😎",
              "🤗",
              "💯",
              "👎",
              "🤩",
              "😅",
              "🙌",
            ].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="grid h-8 place-items-center rounded-lg text-lg transition-colors hover:bg-subtle"
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-border bg-card transition-shadow focus-within:border-foreground/20 focus-within:shadow-[0_0_0_4px_var(--color-subtle)]">
        <textarea
          ref={ref}
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            if (onTyping) {
              onTyping(true);
              if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
              typingTimerRef.current = setTimeout(() => {
                onTyping(false);
                typingTimerRef.current = null;
              }, 2000);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={placeholder ?? translation.chat_composer_placeholder}
          aria-label={placeholder ?? translation.chat_composer_placeholder}
          className="block max-h-[140px] w-full resize-none bg-transparent px-3.5 pt-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        />
        <div className="flex items-center justify-between px-2 pb-1.5">
          <div className="flex items-center gap-0.5">
            <IconBtn label={translation.chat_attachment_link} onClick={onOpenAttachments}>
              <PaperclipIcon />
            </IconBtn>
            {transcriptEnabled && (
              <IconBtn
                label={translation.chat_transcript_title}
                aria-expanded={menu === "transcript"}
                aria-controls="composer-transcript-panel"
                onClick={() => setMenu(menu === "transcript" ? null : "transcript")}
              >
                <DownloadIcon />
              </IconBtn>
            )}
            {destroyEnabled && (
              <IconBtn
                label={translation.chat_destroy_title}
                aria-expanded={menu === "destroy"}
                aria-controls="composer-destroy-panel"
                onClick={() => setMenu(menu === "destroy" ? null : "destroy")}
              >
                <TrashIcon />
              </IconBtn>
            )}
            <IconBtn
              label={translation.chat_emoji_panel_title}
              aria-expanded={menu === "emoji"}
              aria-controls="composer-emoji-panel"
              onClick={() => setMenu(menu === "emoji" ? null : "emoji")}
            >
              <SmileIcon />
            </IconBtn>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!val.trim()}
            className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-30"
            aria-label={translation.chat_attach_send}
          >
            <SendIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
