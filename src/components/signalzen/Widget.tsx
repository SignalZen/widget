import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ExpandIcon,
  MinusIcon,
  SparkleIcon,
  XIcon,
  renderLauncherIcon,
  type LauncherIconName,
} from "./icons";
import { SessionProvider, useSession, type SessionStatus } from "./SessionProvider";
import { SignalzenBackendProvider, useBackend, playBlip } from "./useSignalzenBackend";
import {
  type ApiFile,
  type ApiMessage,
  type SessionResponse,
  fetchGuestSession,
  pingUserSession,
  getUserUuid,
  getGuestUuid,
  getBrowserLanguage,
  getLocalTime,
  consumePrefetchedSession,
  readCookie,
  writeCookie,
  destroyCookie,
} from "./backend";
import { useThemeStyle } from "./theme";
import { useProActiveMessages } from "@/lib/utils/proactive";
import { LexicalContent } from "./screens/LexicalContent";
import { CaptchaOverlay } from "./screens/Captcha";
import { extractLexicalImages } from "@/lib/utils/lexical";
import { IconBtn } from "./screens/primitives";
import { ExpandableChatHeader, Header, OfflineBanner, TabBar } from "./screens/chrome";

const WelcomeScreen = lazy(() =>
  import("./screens/WelcomeScreen").then((m) => ({ default: m.WelcomeScreen })),
);
const GdprScreen = lazy(() =>
  import("./screens/GdprScreen").then((m) => ({ default: m.GdprScreen })),
);
const PrerequisiteFormScreen = lazy(() =>
  import("./screens/PrerequisiteFormScreen").then((m) => ({ default: m.PrerequisiteFormScreen })),
);
const AiChatScreen = lazy(() =>
  import("./screens/AiChatScreen").then((m) => ({ default: m.AiChatScreen })),
);
const HelpCenterScreen = lazy(() =>
  import("./screens/HelpCenterScreen").then((m) => ({ default: m.HelpCenterScreen })),
);
const ArticleScreen = lazy(() =>
  import("./screens/ArticleScreen").then((m) => ({ default: m.ArticleScreen })),
);
const AttachmentsScreen = lazy(() =>
  import("./screens/AttachmentsScreen").then((m) => ({ default: m.AttachmentsScreen })),
);
const OfflineScreen = lazy(() =>
  import("./screens/OfflineScreen").then((m) => ({ default: m.OfflineScreen })),
);
import { type LauncherShape, type Screen, type Tab, type WidgetVariant } from "./screens/types";

export type { LauncherIconName, WidgetVariant };

function chatIconVersionToLauncher(version: string | undefined): {
  shape: LauncherShape;
  icon: LauncherIconName;
} {
  switch (version) {
    case "v1":
      return { shape: "circle", icon: "sz-v1" };
    case "v2":
      return { shape: "circle", icon: "sz-v2" };
    case "v3":
      return { shape: "circle", icon: "sz-v3" };
    case "v4":
      return { shape: "square", icon: "sz-v1" };
    case "v5":
      return { shape: "square", icon: "sz-v2" };
    case "v6":
      return { shape: "square", icon: "sz-v3" };
    case "v7":
      return { shape: "tab", icon: "sz-v1" };
    case "v8":
      return { shape: "tab", icon: "sz-v2" };
    case "v9":
      return { shape: "tab", icon: "sz-v3" };
    default:
      return { shape: "rounded", icon: "sz-v2" };
  }
}

const SMALL_SCREEN_QUERY = "(max-width: 639px)";

function useSmallScreen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(SMALL_SCREEN_QUERY);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(SMALL_SCREEN_QUERY).matches,
    () => false,
  );
}

function isMobileUA(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
}

function SessionGate({
  isMobile,
  embedded,
  children,
}: {
  isMobile?: boolean;
  embedded?: boolean;
  children: React.ReactNode;
}) {
  const { status, appId, account } = useSession();
  if (appId && status === "loading") return null;
  if (!embedded && (isMobile || isMobileUA()) && account?.hide_on_mobile) return null;
  return <>{children}</>;
}

function SessionTheme({
  children,
  className,
  floating,
  isMobile,
  open,
}: {
  children: React.ReactNode;
  className?: string;
  floating?: boolean;
  isMobile?: boolean;
  open?: boolean;
}) {
  const { account, locale } = useSession();
  const themeStyle = useThemeStyle(
    account?.colors?.["primary"],
    account?.colors?.["secondary"],
    undefined,
    account?.colors?.["textPrimary"],
  );

  const [posStyle, alignClass] = useMemo((): [React.CSSProperties, string] => {
    if (!floating) return [{}, ""];
    const zIdx = account?.z_index ?? 10001;
    if (isMobile && open) return [{ zIndex: zIdx }, ""];
    const hPos = account?.horizontal_position ?? "right";
    const vPos = account?.vertical_position ?? "bottom";
    const hOff = account?.horizontal_offset ?? 20;
    const vOff = account?.vertical_offset ?? 20;
    return [
      { [hPos]: `${hOff}px`, [vPos]: `${vOff}px`, zIndex: zIdx },
      hPos === "left" ? "items-start" : "items-end",
    ];
  }, [account, floating, isMobile, open]);

  const fullClass = [className, alignClass].filter(Boolean).join(" ");

  return (
    <div
      className={fullClass}
      style={{ ...(themeStyle ?? undefined), ...posStyle }}
      lang={locale ?? undefined}
    >
      {children}
    </div>
  );
}

// Runs inside SessionProvider so it can read proActiveMessages from session.
// Owns the proactive invitation state and wires popup + in-chat display.
// For embedded widgets the parent provides the theme container; this component
// renders only the shell.  For floating widgets it also renders the popup and launcher.
function WidgetCore({
  open,
  setOpen,
  screen,
  setScreen,
  tab,
  setTab,
  expanded,
  setExpanded,
  embedded,
  mobile,
  gdprAccepted,
  setGdprAccepted,
  label,
}: {
  open: boolean;
  setOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  screen: Screen;
  setScreen: (s: Screen) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  expanded: boolean;
  setExpanded: (b: boolean) => void;
  embedded?: boolean;
  mobile?: boolean;
  gdprAccepted: boolean;
  setGdprAccepted: (v: boolean) => void;
  label?: string;
}) {
  const { appId, account, translation, proActiveMessages, proActiveMessageClient, anyOnline } =
    useSession();
  const { markRead, messages, unreadCount } = useBackend();

  const {
    proActiveMessages: hookedProActiveMessages,
    unreadIds,
    dismiss,
    onWidgetOpen,
  } = useProActiveMessages({
    appId,
    messages: proActiveMessages,
    fallbackClient: proActiveMessageClient,
    anyOnline,
    isOpen: open,
    onNew: playBlip,
  });

  const { shape: resolvedShape, icon: resolvedIcon } = chatIconVersionToLauncher(
    account?.chat_icon_version,
  );
  const resolvedShadow = account?.chat_icon_shadow ?? false;
  const resolvedLabel = label ?? translation.chat_icon_label;

  useEffect(() => {
    if (open) onWidgetOpen();
  }, [open, onWidgetOpen]);

  useEffect(() => {
    if (open && tab === "messages") markRead();
  }, [open, tab, markRead]);

  // Proactive popup: last unread proactive message
  const unreadProActive = hookedProActiveMessages.filter((m) => unreadIds.has(m.id));
  const proactivePopup = !open ? (unreadProActive[unreadProActive.length - 1] ?? null) : null;

  // Backend popup: last unread operator/AI message
  const [dismissedBackendId, setDismissedBackendId] = useState<ApiMessage["id"] | null>(null);
  const lastOperatorMsg =
    !open && unreadCount > 0
      ? ([...messages].reverse().find((m) => m.sender_type !== "User") ?? null)
      : null;
  const backendPopup =
    lastOperatorMsg && lastOperatorMsg.id !== dismissedBackendId ? lastOperatorMsg : null;

  // Proactive takes priority; backend popup shows when there are no unread proactives
  const activePopupInfo = (() => {
    if (proactivePopup) return { msg: proactivePopup, onDismiss: () => dismiss(proactivePopup.id) };
    if (backendPopup)
      return { msg: backendPopup, onDismiss: () => setDismissedBackendId(backendPopup.id) };
    return null;
  })();

  const proActiveUnread = unreadIds.size;

  const shell = (
    <WidgetShell
      screen={screen}
      setScreen={setScreen}
      tab={tab}
      setTab={setTab}
      expanded={expanded}
      setExpanded={setExpanded}
      onClose={embedded ? undefined : () => setOpen(false)}
      embedded={embedded}
      mobile={mobile}
      gdprAccepted={gdprAccepted}
      setGdprAccepted={setGdprAccepted}
      proActiveMessages={hookedProActiveMessages}
    />
  );

  // Embedded: parent provides the theme wrapper; we only render the shell.
  if (embedded) return shell;

  return (
    <>
      {open && shell}
      {activePopupInfo && (
        <LauncherPopup
          sender={activePopupInfo.msg.sender?.forename}
          avatarUrl={activePopupInfo.msg.sender?.picture_medium_url ?? undefined}
          jsonBody={activePopupInfo.msg.json_body}
          body={activePopupInfo.msg.body}
          files={activePopupInfo.msg.files}
          onOpen={() => {
            setOpen(true);
            setScreen("ai-chat");
          }}
          onDismiss={activePopupInfo.onDismiss}
        />
      )}
      {!(mobile && open) && (
        <LiveLauncher
          open={open}
          onClick={() => setOpen((v) => !v)}
          label={resolvedLabel}
          closeLabel={translation.chat_close_button}
          icon={resolvedIcon}
          shape={resolvedShape}
          shadow={resolvedShadow}
          extraUnread={proActiveUnread}
        />
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Widget shell                                                        */
/* ────────────────────────────────────────────────────────────────── */

function WidgetShell({
  screen,
  setScreen,
  tab,
  setTab,
  expanded,
  setExpanded,
  onClose,
  embedded,
  mobile,
  gdprAccepted,
  setGdprAccepted,
  proActiveMessages = [],
}: {
  screen: Screen;
  setScreen: (s: Screen) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  expanded: boolean;
  setExpanded: (b: boolean) => void;
  onClose?: () => void;
  embedded?: boolean;
  mobile?: boolean;
  gdprAccepted: boolean;
  setGdprAccepted: (v: boolean) => void;
  proActiveMessages?: ApiMessage[];
}) {
  const { account, translation, fields, status, anyOnline } = useSession();
  const { initUser, captchaVisible, onCaptchaSolved } = useBackend();
  const helpEnabled = !account || account.help_enabled !== false;
  const userExists = !!getUserUuid();
  const askGdpr = !!account?.ask_gdpr_accept && !userExists;

  const [articleId, setArticleId] = useState("a1");
  const [initialHelpCategoryId, setInitialHelpCategoryId] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const tabsEligible =
    helpEnabled &&
    screen !== "attachments" &&
    screen !== "article" &&
    screen !== "gdpr" &&
    !expanded;
  const showPrerequisiteForm =
    !userExists &&
    fields.length > 0 &&
    !formSubmitted &&
    (!askGdpr || gdprAccepted) &&
    (!account?.show_form_only_when_offline || !anyOnline) &&
    screen !== "help-center" &&
    screen !== "article" &&
    (!tabsEligible || tab === "messages");
  const [seed, setSeed] = useState<string | undefined>(undefined);
  const [postGdprScreen, setPostGdprScreen] = useState<"ai-chat" | "human-chat">("ai-chat");
  const [gdprHasBack, setGdprHasBack] = useState(false);

  const goToChat = (target: "ai-chat" | "human-chat") => {
    if (!askGdpr || gdprAccepted) {
      setScreen(target);
    } else {
      setPostGdprScreen(target);
      setGdprHasBack(true);
      setScreen("gdpr");
    }
  };

  useEffect(() => {
    if (askGdpr && !gdprAccepted && (screen === "ai-chat" || screen === "human-chat")) {
      setPostGdprScreen(screen);
      setScreen("gdpr");
    }
  }, [screen, gdprAccepted, askGdpr]);

  useEffect(() => {
    if (
      !helpEnabled &&
      (screen === "welcome" || screen === "help-center" || screen === "article")
    ) {
      setScreen("ai-chat");
    }
  }, [helpEnabled, screen]);

  const renderTabContent = () => {
    if (showPrerequisiteForm)
      return (
        <PrerequisiteFormScreen
          fields={fields}
          onSubmit={async (values) => {
            await initUser(values);
            setFormSubmitted(true);
          }}
        />
      );
    if (screen === "article")
      return (
        <ArticleScreen
          id={articleId}
          onBack={() => {
            setScreen("help-center");
            setTab("help");
          }}
        />
      );
    if (screen === "attachments") return <AttachmentsScreen onBack={() => goToChat("ai-chat")} />;
    if (screen === "offline") return <OfflineScreen />;
    if (screen === "help-center")
      return (
        <HelpCenterScreen
          onOpenArticle={(id) => {
            setArticleId(id);
            setScreen("article");
          }}
          initialCategoryId={initialHelpCategoryId}
          onConsumedInitialCategory={() => setInitialHelpCategoryId(null)}
        />
      );
    if (screen === "gdpr")
      return (
        <GdprScreen
          onAccept={() => {
            setGdprAccepted(true);
            setScreen(postGdprScreen);
            setTab("messages");
          }}
          onBack={() => setScreen("welcome")}
          showBack={gdprHasBack}
          jsonBody={translation.chat_gdpr_json_body}
          body={translation.chat_gdpr_body}
          buttonText={translation.chat_gdpr_button}
        />
      );
    if (screen === "ai-chat" || screen === "human-chat")
      return (
        <AiChatScreen
          seed={seed}
          withHandoff={screen === "human-chat"}
          onOpenArticle={(id) => {
            setArticleId(id);
            setScreen("article");
          }}
          onOpenAttachments={() => setScreen("attachments")}
          onFirstSend={() => {}}
          onDestroyChat={() => {
            setFormSubmitted(false);
            setGdprAccepted(false);
            onClose?.();
          }}
          proActiveMessages={proActiveMessages}
        />
      );
    return (
      <WelcomeScreen
        onAskAi={(s) => {
          setSeed(s);
          goToChat("ai-chat");
        }}
        onOpenHelp={() => {
          setScreen("help-center");
          setTab("help");
        }}
        onOpenCategory={(id) => {
          setInitialHelpCategoryId(id);
          setScreen("help-center");
          setTab("help");
        }}
        onOpenArticle={(id) => {
          setArticleId(id);
          setScreen("article");
          setTab("help");
        }}
      />
    );
  };

  const showHeader =
    showPrerequisiteForm ||
    screen === "welcome" ||
    screen === "gdpr" ||
    screen === "ai-chat" ||
    screen === "human-chat" ||
    screen === "attachments" ||
    screen === "article" ||
    screen === "help-center";

  const header = (() => {
    if (showPrerequisiteForm)
      return (
        <ExpandableChatHeader
          aiOn
          onClose={onClose}
          onMin={onClose}
          onExpand={embedded || mobile ? undefined : () => setExpanded(!expanded)}
        />
      );
    if (screen === "welcome")
      return (
        <ExpandableChatHeader
          aiOn
          onClose={onClose}
          onMin={onClose}
          onExpand={embedded || mobile ? undefined : () => setExpanded(!expanded)}
        />
      );
    if (screen === "gdpr")
      return (
        <Header
          title={translation.chat_gdpr_title}
          back={gdprHasBack}
          onBack={gdprHasBack ? () => setScreen("welcome") : undefined}
          onClose={onClose}
        />
      );
    if (screen === "attachments")
      return (
        <Header
          title={translation.chat_attach_title}
          back
          onBack={() => setScreen("ai-chat")}
          onClose={onClose}
        />
      );
    if (screen === "help-center")
      return (
        <ExpandableChatHeader
          aiOn
          onClose={onClose}
          onMin={onClose}
          onExpand={embedded || mobile ? undefined : () => setExpanded(!expanded)}
        />
      );
    if (screen === "article")
      return (
        <ExpandableChatHeader
          aiOn
          showBack
          onBack={() => setScreen("help-center")}
          onClose={onClose}
          onMin={onClose}
          onExpand={embedded || mobile ? undefined : () => setExpanded(!expanded)}
        />
      );
    if (screen === "human-chat")
      return (
        <ExpandableChatHeader
          aiOn
          aiPaused
          showBack={!expanded && helpEnabled}
          onBack={() => setScreen("welcome")}
          onClose={onClose}
          onMin={onClose}
          onExpand={embedded || mobile ? undefined : () => setExpanded(!expanded)}
        />
      );
    if (screen === "ai-chat")
      return (
        <ExpandableChatHeader
          aiOn
          showBack={!expanded && helpEnabled}
          onBack={() => setScreen("welcome")}
          onClose={onClose}
          onMin={onClose}
          onExpand={embedded || mobile ? undefined : () => setExpanded(!expanded)}
        />
      );
    return null;
  })();

  const topBar = !showHeader && (
    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
      <div className="flex items-center gap-2">
        <div className="grid h-6 w-6 place-items-center rounded-md bg-foreground text-background">
          <SparkleIcon className="h-3 w-3" />
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-foreground">SignalZen</span>
      </div>
      <div className="flex items-center gap-0.5">
        {!embedded && !mobile && (
          <IconBtn label={translation.chat_expand_button} onClick={() => setExpanded(!expanded)}>
            <ExpandIcon className="h-3.5 w-3.5" />
          </IconBtn>
        )}
        <IconBtn label={translation.chat_minimize_button} onClick={onClose}>
          <MinusIcon />
        </IconBtn>
        <IconBtn label={translation.chat_close_button} onClick={onClose}>
          <XIcon />
        </IconBtn>
      </div>
    </div>
  );

  const showTabBar = tabsEligible;

  return (
    <div
      className={`animate-sz-scale-in relative flex flex-col overflow-hidden bg-card text-foreground ${
        mobile ? "h-full w-full" : "rounded-3xl border border-border"
      }`}
      style={
        mobile
          ? ({ "--sz-widget-h": "100dvh" } as React.CSSProperties)
          : ({
              width: expanded ? 720 : 392,
              height: 640,
              "--sz-widget-h": "640px",
              boxShadow:
                "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 8px 24px -8px rgb(0 0 0 / 0.12), 0 24px 48px -16px rgb(0 0 0 / 0.14)",
            } as React.CSSProperties)
      }
    >
      <div className="flex h-full min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {topBar}
          {header}
          <OfflineBanner />
          <Suspense fallback={<ChatSkeleton />}>{renderTabContent()}</Suspense>
          {showTabBar && (
            <TabBar
              tab={tab}
              setTab={(t) => {
                setTab(t);
                if (t === "home") setScreen("welcome");
                if (t === "messages") goToChat("ai-chat");
                if (t === "help") setScreen("help-center");
              }}
            />
          )}
          {account?.show_ad && (
            <div className="flex items-center justify-center py-1.5 text-[11px] text-muted-foreground">
              Powered by&nbsp;
              <a
                href="https://signalzen.com/?utm_source=powered_by"
                target="_blank"
                className="font-medium text-foreground hover:text-accent transition-colors"
              >
                SignalZen
              </a>
            </div>
          )}
        </div>
      </div>
      {captchaVisible && <CaptchaOverlay onSolved={onCaptchaSolved} />}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Launcher + public API                                               */
/* ────────────────────────────────────────────────────────────────── */

export function Launcher({
  open,
  onClick,
  unread,
  label = "Ask AI",
  closeLabel = "Close",
  icon = "bubble",
  shape = "rounded",
  shadow = false,
}: {
  open: boolean;
  onClick: () => void;
  unread?: number;
  label?: string;
  closeLabel?: string;
  icon?: LauncherIconName;
  shape?: LauncherShape;
  shadow?: boolean;
}) {
  const radiusClass =
    shape === "circle"
      ? "rounded-full"
      : shape === "square"
        ? "rounded-[8px]"
        : shape === "tab"
          ? "rounded-[10px]"
          : "rounded-[18px]";

  const shadowStyle: React.CSSProperties = shadow
    ? { boxShadow: "0 4px 14px rgb(0 0 0 / 0.35)" }
    : {};

  const iconColor = "var(--color-accent-foreground)";
  // Badge uses inverted accent scheme so it's always visible against the button background.
  const badgeStyle = {
    backgroundColor: "var(--color-card)",
    color: "var(--color-accent)",
    border: "2px solid var(--color-accent)",
  };

  if (shape === "tab") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={open ? closeLabel : label}
        className={`group relative flex items-center gap-2.5 bg-accent px-4 transition-all hover:-translate-y-0.5 ${radiusClass}`}
        style={{ height: 44, ...shadowStyle }}
      >
        <span style={{ color: iconColor, display: "flex", alignItems: "center" }}>
          {open ? <XIcon className="h-4 w-4" /> : renderLauncherIcon(icon, "h-6 w-6")}
        </span>
        <span className="text-[14px] font-semibold whitespace-nowrap" style={{ color: iconColor }}>
          {open ? closeLabel : label}
        </span>
        {!open && unread !== undefined && unread > 0 && (
          <span
            className="ml-1 grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold"
            style={badgeStyle}
          >
            {unread}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close chat" : "Open chat"}
      className={`group relative flex items-center justify-center bg-accent transition-all hover:-translate-y-0.5 ${radiusClass}`}
      style={{ height: 60, width: 60, ...shadowStyle }}
    >
      {open ? (
        <XIcon className="h-5 w-5" style={{ color: iconColor }} />
      ) : (
        <span
          style={{
            color: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {renderLauncherIcon(icon, "h-9 w-9")}
        </span>
      )}
      {!open && unread !== undefined && unread > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold"
          style={badgeStyle}
        >
          {unread}
        </span>
      )}
    </button>
  );
}

export function LauncherPopup({
  jsonBody,
  body,
  files,
  sender,
  avatarUrl,
  onOpen,
  onDismiss,
}: {
  jsonBody?: unknown;
  body?: string;
  files?: ApiFile[];
  sender?: string;
  avatarUrl?: string;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const srcs = extractLexicalImages(jsonBody);
    files?.forEach((f) => {
      if (f.url && f.content_type?.startsWith("image/")) srcs.push(f.url);
    });
    srcs.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, [jsonBody, files]);

  const fileNames = (files ?? [])
    .map((f) => f.filename ?? f.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className="pointer-events-auto relative w-[280px] animate-in fade-in slide-in-from-bottom-2 duration-300"
      role="dialog"
      aria-label="New message from support"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute -top-2 -right-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-card text-muted-foreground border border-border hover:text-foreground"
        style={{ boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.12), 0 1px 2px -1px rgb(0 0 0 / 0.08)" }}
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start gap-3 rounded-2xl bg-card p-3.5 text-left border border-border transition-all hover:-translate-y-0.5"
        style={{ boxShadow: "0 12px 32px -8px rgb(0 0 0 / 0.22)" }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full object-cover border-2 border-card"
          />
        ) : (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground text-xs font-semibold border-2 border-card">
            {(sender || "S").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {sender && (
            <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {sender}
            </div>
          )}
          <div className="text-sm leading-snug">
            {jsonBody ? (
              <LexicalContent json={jsonBody} />
            ) : body ? (
              <span className="text-foreground">{body}</span>
            ) : fileNames ? (
              <span className="text-muted-foreground">{fileNames}</span>
            ) : null}
          </div>
        </div>
      </button>
    </div>
  );
}

function genUuid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Math.random());
}

export function SignalzenWidget({
  embedded,
  initialScreen = "welcome",
  initialTab = "home",
  initialGdprAccepted = false,
  defaultExpanded = false,
  mobile,
  label,
  appId,
  language,
  defaultOpen = false,
}: WidgetVariant) {
  const isSmallScreen = useSmallScreen();
  const isMobile = mobile || isSmallScreen;

  const windowUuid = useRef<string>(genUuid()).current;
  const [session, setSession] = useState<SessionResponse | undefined>(undefined);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("loading");
  const pollStarted = useRef(false);

  useEffect(() => {
    if (!appId || pollStarted.current) return;
    pollStarted.current = true;

    // Consume once, inside the effect so StrictMode's double render never
    // calls it a second time (the pollStarted guard blocks re-entry).
    const prefetched = consumePrefetchedSession();
    let firstDone = Boolean(prefetched);

    if (prefetched) {
      setSession(prefetched);
      setSessionStatus("live");
    }

    const poll = async () => {
      const userUuid = getUserUuid();
      try {
        const s = userUuid
          ? await pingUserSession(appId, userUuid, {
              guest_uuid: getGuestUuid(),
              window_uuid: windowUuid,
              last_url: typeof window !== "undefined" ? window.location.href : "",
              bl: getBrowserLanguage(),
              local_time: getLocalTime(),
              ...(language ? { sl: language } : {}),
            })
          : await fetchGuestSession(appId, windowUuid, firstDone, language);
        firstDone = true;
        setSession(s);
        setSessionStatus("live");
      } catch {
        // keep polling on error
      }
      setTimeout(poll, 20_000);
    };

    if (prefetched) {
      setTimeout(poll, 20_000);
    } else {
      void poll();
    }
  }, [appId]);

  const applySession = useCallback((s: SessionResponse) => {
    setSession(s);
    setSessionStatus("live");
  }, []);
  const [open, setOpen] = useState(() =>
    embedded ? true : defaultOpen || readCookie("_signalZen_opened") === "true",
  );
  const [tab, setTab] = useState<Tab>(
    () => (readCookie("_signalZen_tab") as Tab | undefined) ?? initialTab,
  );
  const [screen, setScreen] = useState<Screen>(() => {
    const t = (readCookie("_signalZen_tab") as Tab | undefined) ?? initialTab;
    if (t === "messages") return "ai-chat";
    if (t === "help") return "help-center";
    return "welcome";
  });
  const [expanded, setExpanded] = useState(
    () => defaultExpanded || readCookie("_signalZen_expanded") === "true",
  );
  const [gdprAccepted, setGdprAccepted] = useState(
    () => initialGdprAccepted || readCookie("_signalZen_gdpr_accepted") === "true",
  );

  const readyFired = useRef(false);
  useEffect(() => {
    if (sessionStatus === "live" && !readyFired.current) {
      readyFired.current = true;
      window.dispatchEvent(new CustomEvent("signalzen.ready"));
    }
  }, [sessionStatus]);

  const collapseInitialized = useRef(false);
  useEffect(() => {
    if (!collapseInitialized.current) {
      collapseInitialized.current = true;
      return;
    }
    window.dispatchEvent(
      new CustomEvent("signalzen.collapse", {
        detail: { status: open ? "opened" : "closed" },
      }),
    );
  }, [open]);

  const prevAnyOnline = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (session === undefined) return;
    const anyOnline = Boolean(session.any_online);
    if (anyOnline === prevAnyOnline.current) return;
    prevAnyOnline.current = anyOnline;
    window.dispatchEvent(
      new CustomEvent("signalzen.onlineStatusChange", {
        detail: { status: anyOnline ? "online" : "offline" },
      }),
    );
  }, [session]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setScreen("help-center");
        setTab("help");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const onExpand = () => setOpen(true);
    const onSuspend = () => setOpen(false);
    document.addEventListener("signalzen.expand", onExpand);
    document.addEventListener("signalzen.suspend", onSuspend);
    return () => {
      document.removeEventListener("signalzen.expand", onExpand);
      document.removeEventListener("signalzen.suspend", onSuspend);
    };
  }, []);

  useEffect(() => {
    if (screen === "welcome") setTab("home");
    else if (screen === "help-center" || screen === "article") setTab("help");
    else if (screen === "ai-chat" || screen === "human-chat" || screen === "gdpr")
      setTab("messages");
  }, [screen]);

  useEffect(() => {
    if (!embedded) writeCookie("_signalZen_opened", open ? "true" : "false");
  }, [embedded, open]);

  useEffect(() => {
    if (expanded) writeCookie("_signalZen_expanded", "true");
    else destroyCookie("_signalZen_expanded");
  }, [expanded]);

  useEffect(() => {
    if (gdprAccepted) writeCookie("_signalZen_gdpr_accepted", "true");
    else destroyCookie("_signalZen_gdpr_accepted");
  }, [gdprAccepted]);

  useEffect(() => {
    writeCookie("_signalZen_tab", tab);
  }, [tab]);

  const coreProps = {
    open,
    setOpen,
    screen,
    setScreen,
    tab,
    setTab,
    expanded,
    setExpanded,
    embedded,
    mobile: isMobile,
    gdprAccepted,
    setGdprAccepted,
    label,
  };

  const floatingClass = isMobile && open ? "fixed inset-0" : "fixed flex flex-col gap-3";

  return (
    <SessionProvider
      session={session}
      status={sessionStatus}
      applySession={applySession}
      appId={appId}
      windowUuid={windowUuid}
      language={language}
    >
      <SignalzenBackendProvider isOpen={open}>
        <SessionGate isMobile={isMobile} embedded={embedded}>
          <SessionTheme
            className={embedded ? "contents" : floatingClass}
            floating={!embedded}
            isMobile={isMobile}
            open={open}
          >
            <WidgetCore {...coreProps} />
          </SessionTheme>
        </SessionGate>
      </SignalzenBackendProvider>
    </SessionProvider>
  );
}

function LiveLauncher(props: {
  open: boolean;
  onClick: () => void;
  label?: string;
  closeLabel?: string;
  icon?: LauncherIconName;
  shape?: LauncherShape;
  shadow?: boolean;
  extraUnread?: number;
}) {
  const { unreadCount } = useBackend();
  const { extraUnread, ...launcherProps } = props;
  const total = (unreadCount ?? 0) + (extraUnread ?? 0);
  return <Launcher {...launcherProps} unread={total} />;
}

function ChatSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden px-4 py-5">
      <div className="flex gap-3">
        <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-border" />
        <div className="space-y-2 pt-0.5">
          <div className="h-2.5 w-14 animate-pulse rounded-full bg-border" />
          <div className="h-10 w-48 animate-pulse rounded-2xl rounded-tl-md bg-border" />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="h-6 w-6 shrink-0" />
        <div className="h-6 w-36 animate-pulse rounded-2xl rounded-tl-md bg-border" />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Gallery — all screens at once                                       */
/* ────────────────────────────────────────────────────────────────── */

export function WidgetGallery() {
  const items: { title: string; sub: string; props: WidgetVariant }[] = useMemo(
    () => [
      {
        title: "Welcome",
        sub: "Greeting, suggestions, search, articles, team status.",
        props: { embedded: true, initialScreen: "welcome", initialTab: "home" },
      },
      {
        title: "Privacy notice",
        sub: "GDPR compliance acceptance before chat begins.",
        props: { embedded: true, initialScreen: "gdpr", initialTab: "home" },
      },
      {
        title: "AI conversation",
        sub: "Markdown, code, lists, article cards, citations, quick replies.",
        props: { embedded: true, initialScreen: "ai-chat", initialTab: "messages" },
      },
      {
        title: "Human takeover",
        sub: "Subtle event line, agent identity, typing indicator, read state.",
        props: { embedded: true, initialScreen: "human-chat", initialTab: "messages" },
      },
      {
        title: "Help Center",
        sub: "Search, categories, popular articles with reading time.",
        props: { embedded: true, initialScreen: "help-center", initialTab: "help" },
      },
      {
        title: "Article",
        sub: "Rich article view with feedback footer.",
        props: { embedded: true, initialScreen: "article", initialTab: "help" },
      },
      {
        title: "Attachments",
        sub: "Drag & drop, files, images, screenshots, upload progress.",
        props: { embedded: true, initialScreen: "attachments", initialTab: "messages" },
      },
      {
        title: "Offline",
        sub: "Calm offline form with expected response time.",
        props: { embedded: true, initialScreen: "offline", initialTab: "home" },
      },
    ],
    [],
  );

  return (
    <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
      {items.map((it) => (
        <div key={it.title}>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">{it.title}</h3>
            <span className="text-xs text-muted-foreground">{it.sub}</span>
          </div>
          <div className="rounded-[28px] border border-border bg-surface p-5">
            <div className="mx-auto" style={{ width: 392 }}>
              <div style={{ height: 640 }}>
                <SignalzenWidget {...it.props} />
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Expanded desktop */}
      <div className="md:col-span-2 xl:col-span-3">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Expanded · desktop power mode
          </h3>
          <span className="text-xs text-muted-foreground">
            Roomier layout for long support conversations.
          </span>
        </div>
        <div className="rounded-[28px] border border-border bg-surface p-5">
          <div className="mx-auto" style={{ width: 720, height: 640 }}>
            <SignalzenWidget
              embedded
              defaultExpanded
              initialScreen="ai-chat"
              initialTab="messages"
            />
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Mobile · full-screen
          </h3>
          <span className="text-xs text-muted-foreground">Native app feel.</span>
        </div>
        <div
          className="rounded-[44px] border border-border bg-foreground p-3 shadow-card mx-auto"
          style={{ width: 320 }}
        >
          <div className="overflow-hidden rounded-[32px] bg-card" style={{ height: 640 }}>
            <SignalzenWidget embedded mobile initialScreen="welcome" />
          </div>
        </div>
      </div>

      {/* Launcher variants */}
      <div className="md:col-span-2">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Launcher</h3>
          <span className="text-xs text-muted-foreground">
            Pill button · unread state · closed state.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-5 rounded-[28px] border border-border bg-surface p-8">
          <Launcher open={false} onClick={() => {}} label="Ask AI" />
          <Launcher open={false} onClick={() => {}} unread={3} label="Need help?" />
          <Launcher open={true} onClick={() => {}} />
        </div>
      </div>
    </div>
  );
}
