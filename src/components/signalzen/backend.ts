/**
 * SignalZen backend client.
 *
 * Talks to the real SignalZen production API (https://api.signalzen.com) and
 * its socket.io websocket gateway.
 *
 * REST endpoints used:
 *   GET  /guests/accounts/{appId}/session.json?guest[...]=...
 *   POST /guests/accounts/{appId}/session.json
 *   POST /users/accounts/{appId}/users/{uuid}/session.json     (ping after upgrade)
 *   PUT  /users/accounts/{appId}/users/{uuid}.json             (update user attrs)
 *   GET  /users/accounts/{appId}/users/{uuid}/messages.json?direction=DESC&offset=0&limit=10
 *   POST /users/accounts/{appId}/users/{uuid}/messages.json    (send message)
 *   PUT  /users/accounts/{appId}/users/{uuid}/messages/{id}.json (rating / subscribe / disable_bot)
 *
 * Websocket: socket.io Manager at https://api.signalzen.com/websockets/
 *   query: { uuid, accountToken, bl, windowUuid, guestUuid }
 *   namespace: /users
 *   inbound events: message.created, user.deleted, user.updated, client.typing
 *
 * All calls are best-effort: when CORS / appId / network errors happen, the
 * caller falls back to demo data — the widget UI must stay functional.
 */
import { Manager, type Socket } from "socket.io-client";

const API_HOST = import.meta.env.VITE_API_HOST ?? "https://api.signalzen.com";
const CABLE_URL = import.meta.env.VITE_CABLE_URL ?? "wss://api.signalzen.com/websockets/";
// Session endpoints are served by the Node layer in development; fall back to API_HOST when unset.
const SESSION_HOST = import.meta.env.VITE_API_NODE_HOST || API_HOST;

let _cookieAppId: string | undefined;

export function initCookieNamespace(id: string): void {
  _cookieAppId = id;
}

export function cookieKey(name: string): string {
  return _cookieAppId ? `${name}_${_cookieAppId}` : name;
}

function guestUuidKey() {
  return cookieKey("_signalZen_guest_uuid");
}
function userUuidKey() {
  return cookieKey("_signalZen_uuid");
}

export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function destroyCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function writeCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 86400_000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Fallback: RFC4122 v4-ish
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getGuestUuid(): string {
  let id = readCookie(guestUuidKey());
  if (!id) {
    id = uuid();
    writeCookie(guestUuidKey(), id);
  }
  return id;
}

export function getUserUuid(): string | undefined {
  return readCookie(userUuidKey());
}

export function getBrowserLanguage(): string {
  if (typeof navigator === "undefined") return "en";
  return navigator.language || (navigator as { userLanguage?: string }).userLanguage || "en";
}

export function getLocalTime(): string {
  try {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Undefined";
  }
}

export type Client = {
  id: number;
  forename: string;
  surname: string;
  name: string;
  picture_medium_url: string;
  online?: boolean;
  role: string;
  tooltip?: string;
  job_title?: string;
  ai?: boolean;
};

export type Account = {
  id: number;
  name: string;
  welcome_title: string;
  welcome_subtitle: string;
  title: string;
  subtitle: string;
  avg_reply_minutes?: number | null;
  ai_enabled?: boolean;
  ask_gdpr_accept?: boolean;
  allow_gdpr_transcript?: boolean;
  allow_gdpr_destroy?: boolean;
  allow_screenshots?: boolean;
  allow_files?: boolean;
  help_enabled?: boolean;
  rating_enabled?: boolean;
  live_monitoring_enabled?: boolean;
  show_form_only_when_offline?: boolean;
  auto_initiate_after_form?: boolean;
  hide_on_mobile?: boolean;
  hide_widget_when_offline?: boolean;
  blip_on_new_message?: boolean;
  show_avatar_tooltips?: boolean;
  show_only_assigned_operators?: boolean;
  online_status?: "online" | "offline" | "default";
  widget_version?: string;
  captcha?: boolean;
  /** Launcher button style: "v1"–"v9". v1-3=circle, v4-6=square, v7-9=tab. Icon: v*1=solid, v*2=dots-small, v*3=dots-wide. */
  chat_icon_version: string;
  chat_icon_shadow?: boolean;
  /** When true, use chat_icon_*_url images instead of the SVG icon. */
  chat_icon_enabled?: boolean;
  chat_icon_width?: number;
  chat_icon_height?: number;
  chat_icon_closed_url: string;
  chat_icon_open_url: string;
  chat_icon_loading_url: string;
  horizontal_position?: "left" | "right";
  vertical_position?: "top" | "bottom";
  horizontal_offset?: number;
  vertical_offset?: number;
  z_index?: number;
  colors?: Record<string, string>;
  show_ad?: boolean;
};

export type ApiFile = {
  id?: number;
  url: string;
  filename: string;
  name: string;
  content_type: string;
  download_url: string;
};

export type ApiMessage = {
  id: number | string;
  body: string;
  json_body?: unknown;
  type: string;
  sender_type?: "User" | "Client" | string;
  sender?: { forename: string; picture_medium_url?: string };
  created_at: string;
  rating?: number | null;
  disabled_bot?: boolean;
  subscribed?: boolean;
  email?: string | null;
  files?: ApiFile[];
};

export type Translation = {
  chat_title: string;
  chat_subtitle: string;
  chat_type_text: string;
  chat_gdpr_body: string;
  chat_gdpr_json_body?: string;
  chat_gdpr_button: string;
  chat_gdpr_step_label: string;
  chat_gdpr_title: string;
  chat_gdpr_subtitle: string;
  chat_gdpr_back: string;
  chat_rating_request: string;
  chat_rating_request_completed: string;
  chat_subscribe_text: string;
  chat_subscribe_button: string;
  chat_subscribe_success: string;
  chat_pre_type_email_text: string;
  chat_ai_disabled_text: string;
  chat_ai_disable_button_text: string;
  chat_initiated: string;
  chat_icon_label: string;
  chat_destroy_link: string;
  chat_destroy_success: string;
  chat_transcript_link: string;
  chat_transcript_success: string;
  chat_attachment_link: string;
  chat_send_transcript_button: string;
  chat_transcript_email_input_placeholder: string;
  chat_greeting: string;
  chat_greeting_subtitle: string;
  chat_status_online: string;
  chat_status_ai_only: string;
  chat_status_offline: string;
  chat_reply_instant: string;
  chat_ask_ai_title: string;
  chat_ask_ai_subtitle: string;
  chat_suggested_label: string;
  chat_help_center_label: string;
  chat_browse_all: string;
  chat_search_articles_placeholder: string;
  chat_reading_time: string;
  chat_teammates_label: string;
  chat_ai_teammates_label: string;
  chat_team_online_label: string;
  chat_ai_sender_name: string;
  chat_copy_button: string;
  chat_regenerate_button: string;
  chat_agents_offline_notice: string;
  chat_loading: string;
  chat_article_error: string;
  chat_article_no_content: string;
  chat_was_helpful: string;
  chat_helpful_yes: string;
  chat_helpful_no: string;
  chat_back_to_help: string;
  chat_helpful_yes_thanks: string;
  chat_helpful_no_thanks: string;
  chat_help_browse_subtitle: string;
  chat_search_knowledge_placeholder: string;
  chat_all_topics: string;
  chat_no_results: string;
  chat_no_topics: string;
  chat_category_label: string;
  chat_article_label: string;
  chat_offline_label: string;
  chat_offline_title: string;
  chat_offline_name_label: string;
  chat_offline_name_placeholder: string;
  chat_offline_email_label: string;
  chat_offline_email_placeholder: string;
  chat_offline_message_label: string;
  chat_offline_message_placeholder: string;
  chat_offline_send_button: string;
  chat_offline_ai_prompt: string;
  chat_offline_ai_subtitle: string;
  chat_composer_placeholder: string;
  chat_transcript_title: string;
  chat_transcript_sent: string;
  chat_transcript_description: string;
  chat_cancel_button: string;
  chat_sending_label: string;
  chat_destroy_title: string;
  chat_destroy_description: string;
  chat_destroy_confirm_button: string;
  chat_emoji_panel_title: string;
  chat_close_button: string;
  chat_ai_paused_status: string;
  chat_agents_offline_status: string;
  chat_ai_paused_badge: string;
  chat_ai_on_badge: string;
  chat_team_on_conversation: string;
  chat_operator_count_label: string;
  chat_ai_assistant_label: string;
  chat_ai_paused_by_operator: string;
  chat_ai_auto_replying: string;
  chat_operator_status_online: string;
  chat_operator_default_role: string;
  chat_operator_status_away: string;
  chat_ai_status_on: string;
  chat_ai_status_off: string;
  chat_tab_home: string;
  chat_tab_messages: string;
  chat_tab_help: string;
  chat_system_subscribe_label: string;
  chat_system_subscribed_label: string;
  chat_system_subscribed_body: string;
  chat_system_rating_label: string;
  chat_system_offline_label: string;
  chat_system_no_answer_label: string;
  chat_system_ai_on_label: string;
  chat_system_chat_started: string;
  chat_system_summary_label: string;
  chat_attach_drop: string;
  chat_attach_release: string;
  chat_attach_hint: string;
  chat_attach_image: string;
  chat_attach_file: string;
  chat_attach_screenshot: string;
  chat_attach_selected: string;
  chat_attach_size_error: string;
  chat_attach_send: string;
  chat_attach_uploading: string;
  chat_attach_upload_error: string;
  chat_attach_title: string;
  chat_attach_subtitle: string;
  chat_expand_button: string;
  chat_minimize_button: string;
  chat_no_internet: string;
};

export type ProActiveClient = {
  id: number;
  forename: string;
  surname: string;
  picture_medium_url: string;
};

export type ProActiveMessage = {
  id: number;
  when: "online" | "offline" | "always";
  kind: "first_visit" | "first_open" | "javascript";
  disabled: boolean;
  delay_seconds: number;
  body: string;
  json_body?: unknown;
  path: string;
  shortcut?: string | null;
  once_per_cycle?: boolean;
  client?: ProActiveClient | null;
};

export type SessionResponse = {
  account: Account;
  clients?: Client[];
  any_online?: boolean;
  fields?: Field[];
  pro_active_messages?: ProActiveMessage[];
  pro_active_message_client?: ProActiveClient | null;
  last_message?: ApiMessage;
  visible?: boolean;
  user?: { uuid: string };
  translation?: Translation;
  email?: string | null;
  colors?: Record<string, string>;
};

async function jsonRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  body?: unknown,
): Promise<T> {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(url, init);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`SignalZen ${method} ${url} -> ${res.status}: ${txt.slice(0, 200)}`);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return (await res.json()) as T;
}

function buildGuestParams(windowUuid: string, firstPing: boolean, language?: string) {
  const params: Record<string, string | boolean> = {
    guest_uuid: getGuestUuid(),
    account_token: "",
    bl: getBrowserLanguage(),
    window_uuid: windowUuid,
    last_url: typeof window !== "undefined" ? window.location.href : "",
    local_time: getLocalTime(),
    referrer: typeof document !== "undefined" ? document.referrer : "",
    hit: !firstPing,
  };
  if (language) params.sl = language;
  return params;
}

function qs(obj: Record<string, unknown>, prefix?: string): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      const key = prefix ? `${prefix}[${k}]` : k;
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`;
    })
    .join("&");
}

export async function fetchGuestSession(
  appId: string,
  windowUuid: string,
  firstPing: boolean,
  language?: string,
): Promise<SessionResponse> {
  const params = buildGuestParams(windowUuid, firstPing, language);
  delete (params as Record<string, unknown>).account_token; // server takes it from path
  const query = qs(params, "guest");
  return jsonRequest<SessionResponse>(
    "GET",
    `${SESSION_HOST}/guests/accounts/${encodeURIComponent(appId)}/session.json?${query}`,
  );
}

// ---------------------------------------------------------------------------
// Prefetched session — set by embed.tsx version check, consumed once by Widget
// ---------------------------------------------------------------------------

let _prefetchedSession: SessionResponse | undefined;

export function setPrefetchedSession(session: SessionResponse) {
  _prefetchedSession = session;
}

export function consumePrefetchedSession(): SessionResponse | undefined {
  const s = _prefetchedSession;
  _prefetchedSession = undefined;
  return s;
}

// ---------------------------------------------------------------------------
// Visitor metadata store — populated from _sz.userData or pushUserData()
// ---------------------------------------------------------------------------

let _userData: Record<string, unknown> = {};

export function setUserData(data: Record<string, unknown>) {
  _userData = { ..._userData, ...data };
}

export function getUserData(): Record<string, unknown> {
  return _userData;
}

// ---------------------------------------------------------------------------

const STATIC_USER_KEYS = new Set(["email", "name", "reference", "captcha_token"]);

function buildUserPayload(attrs: Record<string, unknown>): Record<string, unknown> {
  const user: Record<string, unknown> = {};
  const userAttributes: Array<{ name: string; value: unknown }> = [];

  for (const [key, value] of Object.entries(attrs)) {
    if (STATIC_USER_KEYS.has(key.toLowerCase())) {
      user[key.toLowerCase()] = value;
    } else {
      userAttributes.push({ name: key, value });
    }
  }

  if (userAttributes.length > 0) user.user_attributes = userAttributes;
  return user;
}

export async function createUser(
  appId: string,
  attrs: Record<string, unknown> = {},
): Promise<{ uuid: string }> {
  const user = await jsonRequest<{ uuid: string; id: number }>(
    "POST",
    `${API_HOST}/users/accounts/${encodeURIComponent(appId)}/users.json`,
    {
      user: {
        ...buildUserPayload(attrs),
        guest_uuid: getGuestUuid(),
        last_url: typeof window !== "undefined" ? window.location.href : "",
        local_time: getLocalTime(),
        referrer: typeof document !== "undefined" ? document.referrer : "",
      },
    },
  );
  writeCookie(userUuidKey(), user.uuid);
  return user;
}

export async function pingUserSession(
  appId: string,
  userUuid: string,
  user: Record<string, unknown>,
): Promise<SessionResponse> {
  return jsonRequest<SessionResponse>(
    "POST",
    `${SESSION_HOST}/users/accounts/${encodeURIComponent(appId)}/users/${encodeURIComponent(userUuid)}/session.json`,
    { user },
  );
}

export async function loadMessages(
  appId: string,
  userUuid: string,
  limit = 20,
  offset = 0,
): Promise<{ messages: ApiMessage[] }> {
  return jsonRequest<{ messages: ApiMessage[] }>(
    "GET",
    `${API_HOST}/users/accounts/${encodeURIComponent(appId)}/users/${encodeURIComponent(userUuid)}/messages.json?direction=DESC&offset=${offset}&limit=${limit}`,
  );
}

export async function loadMessage(
  appId: string,
  userUuid: string,
  messageId: number,
): Promise<ApiMessage> {
  return jsonRequest<ApiMessage>(
    "GET",
    `${API_HOST}/users/accounts/${encodeURIComponent(appId)}/users/${encodeURIComponent(userUuid)}/messages/${messageId}.json`,
  );
}

export type ProActivePayloadItem = {
  id: number;
  client_id?: number;
  created_at: string;
  bl: string;
};

export function getStoredAutoInvitations(): ProActivePayloadItem[] {
  const raw = readCookie(cookieKey("_signalZen_auto_invitations"));
  if (!raw) return [];
  try {
    const stored = JSON.parse(decodeURIComponent(raw)) as Array<{
      id: number;
      clientId: number | null;
      createdAt: string;
      closed: boolean;
    }>;
    const bl = typeof navigator !== "undefined" ? navigator.language || "en" : "en";
    return stored
      .filter((s) => !s.closed)
      .map((s) => ({
        id: s.id,
        ...(s.clientId != null ? { client_id: s.clientId } : {}),
        created_at: s.createdAt,
        bl,
      }));
  } catch {
    return [];
  }
}

export async function postProActiveMessageTrigger(
  appId: string,
  userUuid: string,
  proActiveMessageId: number,
): Promise<ApiMessage> {
  const bl = typeof navigator !== "undefined" ? navigator.language || "en" : "en";
  return jsonRequest<ApiMessage>(
    "POST",
    `${API_HOST}/users/accounts/${encodeURIComponent(appId)}/users/${encodeURIComponent(userUuid)}/pro_active_messages.json`,
    { pro_active_message_id: proActiveMessageId, bl },
  );
}

export async function postMessage(
  appId: string,
  userUuid: string,
  body: string,
  proActiveMessages?: ProActivePayloadItem[],
): Promise<ApiMessage> {
  return jsonRequest<ApiMessage>(
    "POST",
    `${API_HOST}/users/accounts/${encodeURIComponent(appId)}/users/${encodeURIComponent(userUuid)}/messages.json`,
    {
      message: {
        body,
        ...(proActiveMessages?.length ? { pro_active_messages: proActiveMessages } : {}),
      },
    },
  );
}

/** Upload one or more files as a multipart message. Uses XHR so upload progress is available. */
export function postMessageWithFiles(
  appId: string,
  userUuid: string,
  files: File[],
  onProgress?: (pct: number) => void,
  proActiveMessages?: ProActivePayloadItem[],
): Promise<ApiMessage> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    for (const file of files) {
      fd.append("message[files][][file]", file);
    }
    if (proActiveMessages?.length) {
      for (const p of proActiveMessages) {
        fd.append("message[pro_active_messages][][id]", String(p.id));
        if (p.client_id != null) {
          fd.append("message[pro_active_messages][][client_id]", String(p.client_id));
        }
        fd.append("message[pro_active_messages][][created_at]", p.created_at);
        if (p.bl) fd.append("message[pro_active_messages][][bl]", p.bl);
      }
    }

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `${API_HOST}/users/accounts/${encodeURIComponent(appId)}/users/${encodeURIComponent(userUuid)}/messages.json`,
    );

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as ApiMessage);
        } catch {
          reject(new Error("Invalid JSON response"));
        }
      } else {
        reject(new Error(`Upload failed (HTTP ${xhr.status})`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.send(fd);
  });
}

export type FieldOption = {
  id: number;
  title: string;
  default?: boolean;
};

export type Field = {
  id: number;
  kind: "text" | "email" | "textarea" | "checkbox" | "selectbox";
  title: string;
  required?: boolean;
  options?: FieldOption[];
};

export type HelpItem = {
  id: number | string;
  title: string;
  has_children: boolean;
  body: string;
  json_body?: unknown;
  position?: number;
  suggested?: boolean;
  pinned?: boolean;
};

export async function fetchSuggestedHelps(appId: string): Promise<HelpItem[]> {
  const query = `sort=position&direction=ASC&suggested=true&bl=${encodeURIComponent(getBrowserLanguage())}&limit=5&offset=0`;
  const { helps } = await jsonRequest<{ helps: HelpItem[] }>(
    "GET",
    `${API_HOST}/guests/accounts/${encodeURIComponent(appId)}/helps.json?${query}`,
  );
  return helps;
}

export async function fetchPinnedHelps(appId: string): Promise<HelpItem[]> {
  const query = `sort=position&direction=ASC&pinned=true&bl=${encodeURIComponent(getBrowserLanguage())}&limit=5&offset=0`;
  const { helps } = await jsonRequest<{ helps: HelpItem[] }>(
    "GET",
    `${API_HOST}/guests/accounts/${encodeURIComponent(appId)}/helps.json?${query}`,
  );
  return helps;
}

export async function fetchHelps(
  appId: string,
  parentId?: string | number,
  query?: string,
): Promise<{ helps: HelpItem[] }> {
  const params: Record<string, string> = {
    offset: "0",
    sort: "position",
    direction: "ASC",
    limit: "100",
    bl: getBrowserLanguage(),
  };
  if (parentId !== undefined) params.parent_id = String(parentId);
  if (query) params.query = query;
  const qstring = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return jsonRequest<{ helps: HelpItem[] }>(
    "GET",
    `${API_HOST}/guests/accounts/${encodeURIComponent(appId)}/helps.json?${qstring}`,
  );
}

export async function fetchHelp(appId: string, id: string | number): Promise<HelpItem> {
  return jsonRequest<HelpItem>(
    "GET",
    `${API_HOST}/guests/accounts/${encodeURIComponent(appId)}/helps/${encodeURIComponent(String(id))}.json?limit=100`,
  );
}

export async function postHelpReaction(
  appId: string,
  helpId: string | number,
  kind: "helpful_yes" | "helpful_no",
): Promise<void> {
  await jsonRequest(
    "POST",
    `${API_HOST}/guests/accounts/${encodeURIComponent(appId)}/helps/${encodeURIComponent(String(helpId))}/reactions.json`,
    { reaction: { kind } },
  );
}

export async function postMessageReaction(
  appId: string,
  userUuid: string,
  messageId: string | number,
  kind: "helpful_yes" | "helpful_no",
): Promise<void> {
  await jsonRequest(
    "POST",
    `${API_HOST}/users/accounts/${encodeURIComponent(appId)}/users/${encodeURIComponent(userUuid)}/messages/${encodeURIComponent(String(messageId))}/reactions.json`,
    { reaction: { kind } },
  );
}

export async function rateMessage(
  appId: string,
  userUuid: string,
  messageId: string | number,
  rating: number,
): Promise<unknown> {
  return jsonRequest(
    "PUT",
    `${API_HOST}/users/accounts/${encodeURIComponent(appId)}/users/${encodeURIComponent(userUuid)}/messages/${encodeURIComponent(String(messageId))}.json`,
    { rating },
  );
}

export async function postInitiateMessage(appId: string, userUuid: string): Promise<ApiMessage> {
  return jsonRequest<ApiMessage>(
    "POST",
    `${API_HOST}/users/accounts/${encodeURIComponent(appId)}/users/${encodeURIComponent(userUuid)}/messages.json`,
    { message: { initiate: true, type: "InitiateMessage" } },
  );
}

export async function updateUser(
  appId: string,
  userUuid: string,
  attrs: Record<string, unknown>,
): Promise<void> {
  await jsonRequest(
    "PUT",
    `${API_HOST}/users/accounts/${encodeURIComponent(appId)}/users/${encodeURIComponent(userUuid)}.json`,
    { user: attrs },
  );
}

export async function updateUserData(
  appId: string,
  userUuid: string,
  data: Record<string, unknown>,
): Promise<void> {
  await jsonRequest(
    "PUT",
    `${API_HOST}/users/accounts/${encodeURIComponent(appId)}/users/${encodeURIComponent(userUuid)}.json`,
    { user: buildUserPayload(data) },
  );
}

export async function subscribeViaMessage(
  appId: string,
  userUuid: string,
  messageId: string | number,
): Promise<ApiMessage> {
  return jsonRequest<ApiMessage>(
    "PUT",
    `${API_HOST}/users/accounts/${encodeURIComponent(appId)}/users/${encodeURIComponent(userUuid)}/messages/${encodeURIComponent(String(messageId))}.json`,
    { subscribed: true },
  );
}

export async function disableBotViaMessage(
  appId: string,
  userUuid: string,
  messageId: string | number,
): Promise<unknown> {
  return jsonRequest(
    "PUT",
    `${API_HOST}/users/accounts/${encodeURIComponent(appId)}/users/${encodeURIComponent(userUuid)}/messages/${encodeURIComponent(String(messageId))}.json`,
    { message: { disabled_bot: true } },
  );
}

export type LinkPreview = {
  url: string;
  title: string;
  description: string;
  image: string;
  site_name: string;
};

export async function fetchLinkPreview(appId: string, url: string): Promise<LinkPreview | null> {
  try {
    const res = await fetch(
      `${API_HOST}/guests/accounts/${encodeURIComponent(appId)}/link_previews?url=${encodeURIComponent(url)}`,
    );
    if (!res.ok || res.status === 204) return null;
    return (await res.json()) as LinkPreview;
  } catch {
    return null;
  }
}

export async function deleteUser(appId: string, userUuid: string): Promise<void> {
  await jsonRequest(
    "DELETE",
    `${API_HOST}/users/accounts/${encodeURIComponent(appId)}/users/${encodeURIComponent(userUuid)}.json`,
  );
}

export function clearUserSession(): void {
  destroyCookie(userUuidKey());
  destroyCookie(guestUuidKey());
  destroyCookie(cookieKey("_signalZen_opened"));
  destroyCookie(cookieKey("_signalZen_expanded"));
  destroyCookie(cookieKey("_signalZen_gdpr_accepted"));
  destroyCookie(cookieKey("_signalZen_auto_invitations"));
  destroyCookie(cookieKey("_signalZen_first_visit"));
  destroyCookie(cookieKey("_signalZen_first_open"));
}

export async function requestTranscript(appId: string, userUuid: string): Promise<void> {
  await jsonRequest(
    "POST",
    `${API_HOST}/users/accounts/${encodeURIComponent(appId)}/users/${encodeURIComponent(userUuid)}/transcripts.json`,
  );
}

export type SocketCallbacks = {
  onMessageCreated?: (payload: { id?: number; message?: ApiMessage; play_blip?: boolean }) => void;
  onUserUpdated?: () => void;
  onUserDeleted?: () => void;
  onClientTyping?: (payload: { is_typing: boolean; client_id: number }) => void;
};

export type SocketHandle = {
  socket: Socket;
  close: () => void;
};

export function connectUserSocket(
  appId: string,
  userUuid: string,
  windowUuid: string,
  cb: SocketCallbacks,
  language?: string,
): SocketHandle {
  const query: Record<string, string> = {
    uuid: userUuid,
    accountToken: appId,
    bl: getBrowserLanguage(),
    windowUuid,
    guestUuid: getGuestUuid(),
  };
  if (language) query.sl = language;

  // Use Manager so engine.io-client extracts the path (/websockets/) from CABLE_URL,
  // then connect to the /users namespace — mirrors the old widget's
  // `new Manager(CABLE_URL, opts)` + `cable.socket("/users")` pattern.
  const manager = new Manager(CABLE_URL, {
    transports: ["websocket"],
    withCredentials: true,
    reconnectionDelayMax: 10000,
    query,
  });
  const socket = manager.socket("/users");

  const wrap =
    <T>(fn?: (data: T) => void) =>
    (raw: unknown) => {
      if (!fn) return;
      try {
        const data = typeof raw === "string" ? JSON.parse(raw) : raw;
        fn(data as T);
      } catch {
        /* ignore malformed payload */
      }
    };

  // message.created params for operator messages: { id, message: ApiMessage, play_blip }
  // params for user's own messages: {} (empty) — onMessageCreated called with undefined message
  socket.on(
    "message.created",
    wrap<{ params: { id?: number; message?: ApiMessage; play_blip?: boolean } }>((d) =>
      cb.onMessageCreated?.(d.params),
    ),
  );
  socket.on(
    "user.updated",
    wrap(() => cb.onUserUpdated?.()),
  );
  socket.on(
    "user.deleted",
    wrap(() => cb.onUserDeleted?.()),
  );
  socket.on(
    "client.typing",
    wrap<{ params: { is_typing: boolean; client_id: number } }>((d) =>
      cb.onClientTyping?.(d.params),
    ),
  );

  return {
    socket,
    close: () => {
      try {
        socket.removeAllListeners();
        socket.disconnect();
      } catch {
        /* noop */
      }
    },
  };
}
