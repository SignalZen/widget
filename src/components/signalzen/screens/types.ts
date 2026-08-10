export type Screen =
  | "welcome"
  | "gdpr"
  | "ai-chat"
  | "human-chat"
  | "help-center"
  | "article"
  | "attachments"
  | "offline";

export type Tab = "home" | "messages" | "help";

export type LauncherIconName =
  "bubble" | "chat" | "sparkle" | "message" | "headset" | "sz-v1" | "sz-v2" | "sz-v3";

/** Button shape of the floating launcher.
 *  circle  — fully round (old widget v1/v2/v3)
 *  rounded — heavily rounded square, default modern style
 *  square  — small-radius square (old widget v4/v5/v6)
 *  tab     — wide horizontal button with label text (old widget v7/v8/v9)
 */
export type LauncherShape = "circle" | "rounded" | "square" | "tab";

export type WidgetVariant = {
  /** Render embedded (no fixed positioning, no launcher) — for the showcase gallery */
  embedded?: boolean;
  /** Force-open a specific screen (used in gallery) */
  initialScreen?: Screen;
  initialTab?: Tab;
  /** Skip the GDPR gate on initial load (used to let gallery chat previews show the chat) */
  initialGdprAccepted?: boolean;
  /** Show as expanded width (desktop power mode) */
  defaultExpanded?: boolean;
  /** Full-screen mobile preview */
  mobile?: boolean;
  /** Optional label override */
  label?: string;
  /** SignalZen App ID (from the install snippet). */
  appId?: string;
  /** Force a specific translation language (e.g. "danish"). Sent as set_language to the backend. */
  language?: string;
  /** Start the widget open regardless of the stored cookie (used for previews). */
  defaultOpen?: boolean;
};

export type Operator = {
  id: string;
  name: string;
  role: string;
  online?: boolean;
  avatarUrl?: string;
  tooltip?: string;
  ai?: boolean;
};

export const OPERATORS: Operator[] = [
  { id: "mira", name: "Mira K", role: "Support engineer", online: true },
  { id: "jonas", name: "Jonas L", role: "Billing", online: true },
  { id: "ada", name: "Ada P", role: "Product", online: false },
];
