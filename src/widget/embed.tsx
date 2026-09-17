/**
 * SignalZen embeddable widget entry.
 *
 * Builds to a single IIFE bundle (public/signalzen.js) that exposes
 * `window.SignalZen`. The install snippet:
 *
 *   <script>
 *     var _sz=_sz||{};_sz.appId="...";
 *     (function(){
 *       var e=document.createElement("script");
 *       e.src="https://<host>/signalzen.js"; e.async=true;
 *       document.documentElement.firstChild.appendChild(e);
 *       var t=setInterval(function(){
 *         if (typeof SignalZen !== "undefined") {
 *           clearInterval(t); new SignalZen(_sz).load();
 *         }
 *       },10);
 *     })();
 *   </script>
 *
 * Mounts the widget inside a Shadow DOM root so no host-page CSS can leak in,
 * and no widget CSS can leak out.
 */
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { SignalzenWidget } from "@/components/signalzen/Widget";
import {
  setUserData,
  fetchGuestSession,
  pingUserSession,
  setPrefetchedSession,
  consumePrefetchedSession,
  getUserUuid,
  getGuestUuid,
  getBrowserLanguage,
  getLocalTime,
  initCookieNamespace,
} from "@/components/signalzen/backend";
import cssText from "./widget.css?inline";

const CDN_WIDGET_URL =
  (import.meta.env.VITE_CDN_WIDGET_V1_URL as string) ?? "https://cdn.signalzen.com/v1/signalzen.js";
const NEW_WIDGET_VERSION = "v2";

// Capture the script src while the IIFE is executing — document.currentScript
// is only available synchronously during script evaluation.
const _scriptSrc: string =
  typeof document !== "undefined" && document.currentScript instanceof HTMLScriptElement
    ? document.currentScript.src
    : "";

// Allow a custom window property name so multiple widget instances can coexist
// on the same page (e.g. a preview widget alongside the site's own support widget).
// Load as signalzen.js?_global=SzPreview and wait for window.SzPreview instead
// of window.SignalZen.
const _globalName: string = (() => {
  try {
    return new URL(_scriptSrc).searchParams.get("_global") ?? "SignalZen";
  } catch {
    return "SignalZen";
  }
})();

type Config = {
  appId?: string;
  language?: string;
  defaultOpen?: boolean;
  userData?: Record<string, unknown>;
  invisible?: boolean;
  renderInContainerId?: string;
  // When renderInContainerId is set, embedded defaults to true (chat-panel only).
  // Pass embedded: false to render the full floating widget (launcher icon + panel)
  // inside the container — the container must have a CSS transform so that
  // position:fixed children are contained within it rather than the viewport.
  embedded?: boolean;
  // When true, the v1 widget renders at its natural size (not filling the container)
  // positioned within it — used by the widget-settings preview panel.
  preview?: boolean;
};

const HOST_ID = _globalName === "SignalZen" ? "signalzen-root" : `signalzen-root-${_globalName}`;
const FONT_LINK_ID = "signalzen-font";

// Stored so show() / hide() can target it regardless of mode.
let _hostEl: HTMLElement | null = null;

// Per-appId in-flight promise — concurrent load() calls share one fetch.
const _prefetchPromises = new Map<string, Promise<string | undefined>>();

function prefetchSession(appId: string, language?: string): Promise<string | undefined> {
  const cached = _prefetchPromises.get(appId);
  if (cached) return cached;
  initCookieNamespace(appId);
  const promise = (async () => {
    try {
      const windowUuid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Math.random());
      const userUuid = getUserUuid();
      const session = userUuid
        ? await pingUserSession(appId, userUuid, {
            guest_uuid: getGuestUuid(),
            window_uuid: windowUuid,
            last_url: typeof window !== "undefined" ? window.location.href : "",
            bl: getBrowserLanguage(),
            local_time: getLocalTime(),
            ...(language ? { sl: language } : {}),
          })
        : await fetchGuestSession(appId, windowUuid, false, language);
      setPrefetchedSession(session);
      return session?.account?.widget_version as string | undefined;
    } catch {
      return undefined;
    }
  })();
  _prefetchPromises.set(appId, promise);
  return promise;
}

function loadLegacyWidget(cfg: Config) {
  if (typeof window !== "undefined") {
    const prefetchedSession = consumePrefetchedSession();
    (window as Record<string, unknown>)._sz = {
      appId: cfg.appId,
      ...(cfg.language ? { language: cfg.language } : {}),
      ...(cfg.userData ? { userData: cfg.userData } : {}),
      ...(cfg.renderInContainerId ? { renderInContainerId: cfg.renderInContainerId } : {}),
      ...(cfg.invisible ? { invisible: cfg.invisible } : {}),
      ...(cfg.preview ? { preview: cfg.preview } : {}),
    };
    const script = document.createElement("script");
    // When loading as a preview widget (e.g. _globalName='SignalZenPreview'), pass
    // ?_global= so the v1 IIFE registers itself on the correct window property and
    // uses a separate singleton variable, keeping it fully isolated from the
    // production "Get Support" widget on window.SignalZen.
    script.src =
      _globalName !== "SignalZen" ? `${CDN_WIDGET_URL}?_global=${_globalName}` : CDN_WIDGET_URL;
    // Set __szNextGlobal as a reliable fallback for the v1 bundle's _globalName
    // detection.  document.currentScript can be null inside async-loaded scripts
    // in some browser/context combinations; reading this window property is not
    // subject to that constraint.
    if (_globalName !== "SignalZen") {
      (window as Record<string, unknown>).__szNextGlobal = _globalName;
    }
    script.async = true;
    // Capture window.SignalZen now (already restored by WidgetPreview's v2 onload)
    // so we can fix it after the v1 UMD wrapper overwrites it below.
    const savedSignalZen =
      _globalName !== "SignalZen" ? (window as Record<string, unknown>).SignalZen : undefined;
    script.onload = () => {
      // The v1 UMD wrapper always writes window.SignalZen = <v1 class>.
      // For non-default instances restore it so the production GS widget is unaffected.
      if (_globalName !== "SignalZen") {
        if (savedSignalZen !== undefined) {
          window.SignalZen = savedSignalZen as typeof window.SignalZen;
        } else {
          delete (window as Record<string, unknown>).SignalZen;
        }
      }
      const Sz = (window as Record<string, unknown>)[_globalName] as
        typeof window.SignalZen | undefined;
      if (!Sz) return;
      new Sz((window as Record<string, unknown>)._sz as Config).load();
      // Push the prefetched session via the old widget's public API so it can
      // skip its own first fetch — same pattern as pushUserData / expand etc.
      if (prefetchedSession) Sz.setPrefetchedSession(prefetchedSession);
    };
    document.documentElement.firstChild!.appendChild(script);
  }
}

function ensureFontLink() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
}

function attachShadowAndRender(host: HTMLElement, cfg: Config, embedded: boolean) {
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = cssText;
  shadow.appendChild(style);

  const appRoot = document.createElement("div");
  appRoot.style.pointerEvents = "auto";
  if (embedded) {
    appRoot.style.width = "100%";
    appRoot.style.height = "100%";
  }
  shadow.appendChild(appRoot);

  const root: Root = createRoot(appRoot);
  root.render(
    <React.StrictMode>
      <SignalzenWidget
        appId={cfg.appId}
        language={cfg.language}
        defaultOpen={cfg.defaultOpen}
        embedded={embedded}
        instanceId={_globalName}
        preview={cfg.preview}
      />
    </React.StrictMode>,
  );
}

function mount(cfg: Config) {
  if (typeof document === "undefined") return;
  if (_hostEl) return; // idempotent

  if (cfg.userData && Object.keys(cfg.userData).length > 0) {
    setUserData(cfg.userData);
  }

  ensureFontLink();

  if (cfg.renderInContainerId) {
    const container = document.getElementById(cfg.renderInContainerId);
    if (!container) return;

    const isEmbedded = cfg.embedded !== false;
    const host = document.createElement("div");
    const fontDecls: Array<[string, string]> = [
      [
        "font-family",
        '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      ],
      ["font-size", "14px"],
      ["font-weight", "400"],
      ["font-style", "normal"],
      ["line-height", "1.5"],
      ["color", "#18181b"],
      ["text-align", "left"],
      ["text-transform", "none"],
      ["letter-spacing", "normal"],
      ["text-indent", "0"],
      ["direction", "ltr"],
    ];
    if (isEmbedded) {
      const inlineDecls: Array<[string, string]> = [
        ["width", "100%"],
        ["height", "100%"],
        ...fontDecls,
      ];
      for (const [k, v] of inlineDecls) host.style.setProperty(k, v, "important");
    } else {
      // Floating-in-container: cover the container with pointer-events:none so the
      // widget's position:fixed launcher/panel are contained by the container's
      // CSS transform rather than the viewport.
      const inlineDecls: Array<[string, string]> = [
        ["position", "absolute"],
        ["top", "0"],
        ["left", "0"],
        ["right", "0"],
        ["bottom", "0"],
        ["pointer-events", "none"],
        ["z-index", "2147483000"],
        ...fontDecls,
      ];
      for (const [k, v] of inlineDecls) host.style.setProperty(k, v, "important");
    }
    if (cfg.invisible) host.style.setProperty("display", "none", "important");
    container.appendChild(host);
    _hostEl = host;
    attachShadowAndRender(host, cfg, isEmbedded);
    return;
  }

  // Default: floating overlay appended to body.
  if (document.getElementById(HOST_ID)) return;
  const host = document.createElement("div");
  host.id = HOST_ID;
  // Use explicit !important declarations so host-page `* { ... }` rules can't
  // override them. Inheritable props listed so they cascade into the shadow.
  const decls: Array<[string, string]> = [
    ["position", "fixed"],
    ["top", "0"],
    ["left", "0"],
    ["right", "0"],
    ["bottom", "0"],
    ["width", "auto"],
    ["height", "auto"],
    ["margin", "0"],
    ["padding", "0"],
    ["border", "0"],
    ["pointer-events", "none"],
    ["z-index", "2147483000"],
    [
      "font-family",
      '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    ],
    ["font-size", "14px"],
    ["font-weight", "400"],
    ["font-style", "normal"],
    ["line-height", "1.5"],
    ["color", "#18181b"],
    ["text-align", "left"],
    ["text-transform", "none"],
    ["letter-spacing", "normal"],
    ["text-indent", "0"],
    ["direction", "ltr"],
    ["background", "transparent"],
  ];
  document.body.appendChild(host);
  for (const [k, v] of decls) host.style.setProperty(k, v, "important");
  if (cfg.invisible) host.style.setProperty("display", "none", "important");
  _hostEl = host;
  attachShadowAndRender(host, cfg, false);
}

class SignalZen {
  private cfg: Config;
  constructor(cfg: Config = {}) {
    this.cfg = cfg ?? {};
  }
  async load() {
    if (this.cfg.appId) {
      const version = await prefetchSession(this.cfg.appId, this.cfg.language);
      if (version !== undefined && version !== NEW_WIDGET_VERSION) {
        loadLegacyWidget(this.cfg);
        return;
      }
    }
    mount(this.cfg);
  }
  show() {
    SignalZen.show();
  }
  hide() {
    SignalZen.hide();
  }
  expand() {
    SignalZen.expand();
  }
  suspend() {
    SignalZen.suspend();
  }
  static show() {
    if (_hostEl) _hostEl.style.removeProperty("display");
  }
  static hide() {
    if (_hostEl) _hostEl.style.setProperty("display", "none", "important");
  }
  static expand() {
    if (typeof document !== "undefined")
      document.dispatchEvent(
        new CustomEvent(
          _globalName === "SignalZen" ? "signalzen.expand" : `signalzen.expand.${_globalName}`,
        ),
      );
  }
  static suspend() {
    if (typeof document !== "undefined")
      document.dispatchEvent(
        new CustomEvent(
          _globalName === "SignalZen" ? "signalzen.suspend" : `signalzen.suspend.${_globalName}`,
        ),
      );
  }
  pushUserData(data: Record<string, unknown>) {
    SignalZen.pushUserData(data);
  }
  static pushUserData(data: Record<string, unknown>) {
    setUserData(data);
    if (typeof document !== "undefined") {
      document.dispatchEvent(new CustomEvent("signalzen.pushUserData", { detail: data }));
    }
  }
  static triggerProActiveMessage(shortcut: string) {
    document.dispatchEvent(
      new CustomEvent("signalzen.triggerProActiveMessage", { detail: { shortcut } }),
    );
  }
}

declare global {
  interface Window {
    SignalZen: typeof SignalZen;
    _sz?: Config;
  }
}

if (typeof window !== "undefined") {
  (window as Record<string, unknown>)[_globalName] = SignalZen;
}

export default SignalZen;
export { SignalZen };
