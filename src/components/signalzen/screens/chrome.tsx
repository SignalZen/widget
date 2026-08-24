import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  BookIcon,
  ChatIcon,
  ExpandIcon,
  HomeIcon,
  MinusIcon,
  SparkleIcon,
  XIcon,
} from "../icons";
import { type Tab } from "./types";
import { Avatar, AvatarStack, IconBtn } from "./primitives";
import { useSession } from "../SessionProvider";
import { useBackend } from "../useSignalzenBackend";
import { readCookie, writeCookie, destroyCookie, cookieKey } from "../backend";

export function Header({
  title,
  subtitle,
  back,
  onBack,
  onClose,
  onMin,
  onExpand,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  onMin?: () => void;
  onExpand?: () => void;
}) {
  const { translation } = useSession();
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        {back && (
          <IconBtn label={translation.chat_gdpr_back} onClick={onBack}>
            <ArrowLeftIcon />
          </IconBtn>
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</div>
        {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-0.5">
        {onExpand && (
          <IconBtn label={translation.chat_expand_button} onClick={onExpand}>
            <ExpandIcon className="h-3.5 w-3.5" />
          </IconBtn>
        )}
        {onMin && (
          <IconBtn label={translation.chat_minimize_button} onClick={onMin}>
            <MinusIcon />
          </IconBtn>
        )}
        {onClose && (
          <IconBtn label={translation.chat_close_button} onClick={onClose}>
            <XIcon />
          </IconBtn>
        )}
      </div>
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M5 8l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExpandableChatHeader({
  aiOn,
  aiPaused,
  onBack,
  onClose,
  onMin,
  onExpand,
  showBack,
}: {
  aiOn?: boolean;
  aiPaused?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  onMin?: () => void;
  onExpand?: () => void;
  showBack?: boolean;
}) {
  const { operators, account, anyOnline, translation } = useSession();
  const [open, setOpen] = useState(
    () => readCookie(cookieKey("_signalZen_header_expanded")) === "true",
  );
  const forceOnline = account?.online_status === "online";
  const aiActive = account !== undefined ? !!account.ai_enabled : !!aiOn;
  const isSingleOperator = operators.length === 1 && !aiActive;
  const onlineCount = operators.filter(
    (op) =>
      forceOnline ||
      (op.ai && aiActive && !aiPaused) ||
      (anyOnline && (isSingleOperator || op.online)),
  ).length;
  const canExpand = operators.length > 0 || !!aiActive;
  const statusLabel = aiPaused
    ? translation.chat_ai_paused_status
    : isSingleOperator
      ? anyOnline
        ? translation.chat_operator_status_online
        : translation.chat_operator_status_away
      : onlineCount > 0
        ? translation.chat_operator_count_label
            .replace("{{ online }}", String(onlineCount))
            .replace("{{ total }}", String(operators.length))
        : anyOnline
          ? translation.chat_operator_status_online
          : translation.chat_agents_offline_status;

  return (
    <div className="border-b border-border bg-card">
      <div
        {...(canExpand
          ? {
              onClick: () =>
                setOpen((v) => {
                  const next = !v;
                  if (next) writeCookie(cookieKey("_signalZen_header_expanded"), "true");
                  else destroyCookie(cookieKey("_signalZen_header_expanded"));
                  return next;
                }),
              role: "button",
              "aria-expanded": open,
              tabIndex: 0,
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpen((v) => {
                    const next = !v;
                    if (next) writeCookie(cookieKey("_signalZen_header_expanded"), "true");
                    else destroyCookie(cookieKey("_signalZen_header_expanded"));
                    return next;
                  });
                }
              },
            }
          : {})}
        className={`group flex items-center gap-2 px-4 py-3 transition-colors ${canExpand ? "cursor-pointer hover:bg-subtle" : ""}`}
      >
        {showBack && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onBack?.();
            }}
          >
            <IconBtn label={translation.chat_gdpr_back} onClick={() => {}}>
              <ArrowLeftIcon />
            </IconBtn>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {aiPaused ? (
              <span className="shrink-0 rounded-md bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {translation.chat_ai_paused_badge}
              </span>
            ) : aiActive ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                <SparkleIcon className="h-2.5 w-2.5 text-accent" /> {translation.chat_ai_on_badge}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${anyOnline ? "bg-success" : "bg-muted-foreground/40"}`}
            />
            <span className="truncate">{statusLabel}</span>
          </div>
        </div>
        {canExpand && (
          <ChevronDownIcon
            className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {onExpand && (
            <IconBtn label={translation.chat_expand_button} onClick={onExpand}>
              <ExpandIcon className="h-3.5 w-3.5" />
            </IconBtn>
          )}
          {onMin && (
            <IconBtn label={translation.chat_minimize_button} onClick={onMin}>
              <MinusIcon />
            </IconBtn>
          )}
          {onClose && (
            <IconBtn label={translation.chat_close_button} onClick={onClose}>
              <XIcon />
            </IconBtn>
          )}
        </div>
      </div>
      {open && canExpand && (
        <div
          className="border-t border-border bg-subtle/40 animate-[sz-fade-in_120ms_ease-out] overflow-y-auto scrollbar-thin px-4 py-3"
          style={{ maxHeight: "calc(var(--sz-widget-h, 640px) * 0.3)" }}
        >
          {operators.length > 1 && (
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {translation.chat_team_on_conversation}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {translation.chat_operator_count_label
                  .replace("{{ online }}", String(onlineCount))
                  .replace("{{ total }}", String(operators.length))}
              </span>
            </div>
          )}
          <ul className="space-y-1.5">
            {operators.map((op) => {
              const isOnline =
                forceOnline ||
                (op.ai && aiActive && !aiPaused) ||
                (anyOnline && (isSingleOperator || op.online));
              return (
                <li
                  key={op.id}
                  className="flex items-center gap-2.5 rounded-lg bg-card px-2 py-1.5 ring-1 ring-border"
                >
                  <Avatar
                    name={op.name}
                    src={op.avatarUrl}
                    size={28}
                    online={isOnline}
                    tooltip={op.tooltip}
                    showTooltip={account?.show_avatar_tooltips}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-foreground">{op.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{op.role}</div>
                  </div>
                  <span
                    className={`text-[10px] font-medium ${
                      isOnline ? "text-success" : "text-muted-foreground"
                    }`}
                  >
                    {isOnline
                      ? translation.chat_operator_status_online
                      : translation.chat_operator_status_away}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function OfflineBanner() {
  const { translation } = useSession();
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="flex items-center gap-1.5 bg-warning/15 px-4 py-1.5 text-[11px] font-medium text-warning">
      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" aria-hidden>
        <path d="M8 6v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M6.586 2.586a2 2 0 0 1 2.828 0l4 4a2 2 0 0 1 0 2.828l-4 4a2 2 0 0 1-2.828 0l-4-4a2 2 0 0 1 0-2.828l4-4Z"
          stroke="currentColor"
          strokeWidth="1.25"
        />
      </svg>
      {translation.chat_no_internet}
    </div>
  );
}

export function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { translation } = useSession();
  const { unreadCount } = useBackend();
  const items: { id: Tab; label: string; icon: ReactNode; badge?: number }[] = [
    { id: "home", label: translation.chat_tab_home, icon: <HomeIcon /> },
    {
      id: "messages",
      label: translation.chat_tab_messages,
      icon: <ChatIcon />,
      badge: unreadCount,
    },
    { id: "help", label: translation.chat_tab_help, icon: <BookIcon /> },
  ];
  return (
    <div role="tablist" className="grid grid-cols-3 border-t border-border bg-card">
      {items.map((it) => {
        const active = tab === it.id;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setTab(it.id)}
            className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="relative">
              <span
                className={`grid h-7 w-7 place-items-center rounded-lg ${
                  active ? "bg-subtle text-foreground" : ""
                }`}
              >
                {it.icon}
              </span>
              {!!it.badge && it.badge > 0 && (
                <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-semibold text-accent-foreground">
                  {it.badge > 99 ? "99+" : it.badge}
                </span>
              )}
            </span>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export { Composer } from "./Composer";
