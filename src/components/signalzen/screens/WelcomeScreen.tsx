import { useEffect, useState } from "react";
import { ArrowRightIcon, ClockIcon, SearchIcon, SparkleIcon } from "../icons";
import { type HelpItem, fetchSuggestedHelps, fetchPinnedHelps } from "../backend";
import { useSession } from "../SessionProvider";
import { Avatar, AvatarStack } from "./primitives";
import { OPERATORS } from "./types";
import { extractLexicalText, readingTime } from "./LexicalContent";

export function WelcomeScreen({
  onAskAi,
  onOpenHelp,
  onOpenArticle,
  onOpenCategory,
}: {
  onAskAi: (seed?: string) => void;
  onOpenHelp: () => void;
  onOpenArticle: (id: string) => void;
  onOpenCategory: (id: string) => void;
}) {
  const {
    operators: liveOperators,
    anyOnline,
    status,
    appId,
    account,
    translation,
    isUserSession,
  } = useSession();
  const showOnlyAssigned = !!account?.show_only_assigned_operators;
  // When show_only_assigned_operators is on, hide the team card until a user session
  // is established — before that, no operator is assigned and showing the full team
  // would contradict the setting. Once in a user session the server returns only the
  // assigned operator(s), so liveOperators already reflects the right people.
  const showTeamCard = !showOnlyAssigned || isUserSession;
  const humanOperators = status === "live" ? liveOperators.filter((op) => !op.ai) : [];
  const operators = humanOperators.length > 0 ? humanOperators : OPERATORS;
  const onlineCount = status !== "live" || anyOnline ? operators.filter((o) => o.online).length : 0;
  const isSingleOperator = status === "live" && liveOperators.length === 1 && !account?.ai_enabled;

  const [suggested, setSuggested] = useState<HelpItem[]>([]);
  const [pinned, setPinned] = useState<HelpItem[]>([]);

  useEffect(() => {
    if (!appId || status !== "live") return;
    fetchSuggestedHelps(appId)
      .then(setSuggested)
      .catch(() => setSuggested([]));
    fetchPinnedHelps(appId)
      .then(setPinned)
      .catch(() => setPinned([]));
  }, [appId, status]);

  const aiOnly = status === "live" && !anyOnline && !!account?.ai_enabled;
  const aiOperator = liveOperators.find((op) => op.ai);

  const statusLabel = anyOnline
    ? translation.chat_status_online.replace(
        "{{ minutes }}",
        String(account?.avg_reply_minutes ?? 1),
      )
    : status === "live"
      ? translation.chat_status_ai_only
      : translation.chat_status_offline;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
      <div className="px-5 pb-4 pt-6">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            {(anyOnline || aiOnly) && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            )}
            <span
              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${anyOnline || aiOnly ? "bg-success" : "bg-muted-foreground/40"}`}
            />
          </span>
          {statusLabel}
        </div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-foreground">
          {translation.chat_greeting}
          <br />
          <span className="text-muted-foreground">{translation.chat_greeting_subtitle}</span>
        </h1>
      </div>

      {account?.ai_enabled && (
        <div className="px-5">
          <button
            type="button"
            onClick={() => onAskAi()}
            className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left transition-shadow hover:shadow-card"
          >
            {aiOperator ? (
              <Avatar name={aiOperator.name} src={aiOperator.avatarUrl} size={36} />
            ) : (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-foreground text-background">
                <SparkleIcon className="h-4 w-4" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">
                {translation.chat_ask_ai_title}
              </span>
              <span className="block text-xs text-muted-foreground">
                {translation.chat_ask_ai_subtitle}
              </span>
            </span>
            <ArrowRightIcon className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      )}

      {suggested.length > 0 && (
        <div className="px-5 pt-5">
          <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {translation.chat_suggested_label}
          </div>
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
            {suggested.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  item.has_children
                    ? onOpenCategory(String(item.id))
                    : onOpenArticle(String(item.id))
                }
                className={`group flex items-center justify-between gap-3 px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-subtle ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <span className="truncate">{item.title}</span>
                <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 pt-5 pb-6">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {translation.chat_help_center_label}
          </div>
          <button
            type="button"
            onClick={onOpenHelp}
            className="text-xs font-medium text-foreground hover:underline"
          >
            {translation.chat_browse_all}
          </button>
        </div>
        <button
          type="button"
          onClick={onOpenHelp}
          className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-subtle"
        >
          <SearchIcon />
          <span>{translation.chat_search_articles_placeholder}</span>
          <span className="ml-auto rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px]">
            ⌘K
          </span>
        </button>
        {pinned.length > 0 && (
          <div className="flex flex-col gap-2">
            {pinned.map((item) => {
              const text = item.json_body ? extractLexicalText(item.json_body) : (item.body ?? "");
              const mins = readingTime(text);
              const desc = text.length > 120 ? text.slice(0, 120).trimEnd() + "…" : text;
              const readingTimeLabel = translation.chat_reading_time.replace(
                "{{ minutes }}",
                String(mins),
              );
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    item.has_children
                      ? onOpenCategory(String(item.id))
                      : onOpenArticle(String(item.id))
                  }
                  className="group rounded-2xl border border-border bg-card p-4 text-left transition-shadow hover:shadow-card"
                >
                  <div className="text-sm font-semibold text-foreground">{item.title}</div>
                  {desc && (
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{desc}</div>
                  )}
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <ClockIcon className="h-3 w-3" />
                    <span>{readingTimeLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showTeamCard && (
        <div className="px-5 pb-6 pt-5">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <AvatarStack
                operators={aiOnly ? [] : operators}
                ai={!!account?.ai_enabled}
                size={24}
                max={4}
              />
              <div>
                <div className="text-xs font-semibold text-foreground">
                  {aiOnly
                    ? translation.chat_ai_sender_name
                    : isSingleOperator
                      ? operators[0].name
                      : account?.ai_enabled
                        ? translation.chat_ai_teammates_label.replace(
                            "{{ count }}",
                            String(operators.length),
                          )
                        : translation.chat_teammates_label.replace(
                            "{{ count }}",
                            String(operators.length),
                          )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {aiOnly
                    ? translation.chat_ai_auto_replying
                    : isSingleOperator
                      ? anyOnline
                        ? translation.chat_operator_status_online
                        : translation.chat_operator_status_away
                      : translation.chat_team_online_label.replace(
                          "{{ online }}",
                          String(onlineCount),
                        )}
                </div>
              </div>
            </div>
            {account?.avg_reply_minutes != null && anyOnline ? (
              <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                <ClockIcon className="h-3 w-3" />~{account.avg_reply_minutes} min
              </div>
            ) : aiOnly ? (
              <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                <SparkleIcon className="h-3 w-3" />
                {translation.chat_reply_instant}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
