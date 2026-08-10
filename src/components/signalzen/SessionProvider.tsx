import { createContext, useContext, useMemo } from "react";
import {
  type Account,
  type Client,
  type Field,
  type ProActiveMessage,
  type ProActiveClient,
  type SessionResponse,
  type Translation,
} from "./backend";
import { defaultTranslation } from "./defaultTranslation";
import type { Operator } from "./screens/types";

export type SessionStatus = "loading" | "live" | "error";

export type SessionState = {
  status: SessionStatus;
  appId: string | undefined;
  windowUuid: string;
  account: Account | undefined;
  operators: Operator[];
  anyOnline: boolean;
  fields: Field[];
  translation: Translation;
  proActiveMessages: ProActiveMessage[];
  proActiveMessageClient: ProActiveClient | null;
  locale: string | undefined;
  /** True once a user session (POST) has been established — false for pure guest sessions. */
  isUserSession: boolean;
  applySession: (session: SessionResponse) => void;
};

const SessionContext = createContext<SessionState>({
  status: "loading",
  appId: undefined,
  windowUuid: "",
  account: undefined,
  operators: [],
  anyOnline: false,
  fields: [],
  translation: defaultTranslation,
  proActiveMessages: [],
  proActiveMessageClient: null,
  locale: undefined,
  isUserSession: false,
  applySession: () => {},
});

export function useSession(): SessionState {
  return useContext(SessionContext);
}

function clientToOperator(c: Client, defaultRole: string): Operator {
  const name = c.name || [c.forename, c.surname].filter(Boolean).join(" ").trim() || "Operator";
  return {
    id: String(c.id),
    name,
    role: c.job_title || defaultRole,
    online: Boolean(c.online),
    avatarUrl: c.picture_medium_url,
    tooltip: c.tooltip,
    ai: Boolean(c.ai),
  };
}

export function SessionProvider({
  session,
  status,
  applySession,
  appId,
  windowUuid,
  language,
  children,
}: {
  session: SessionResponse | undefined;
  status: SessionStatus;
  applySession: (session: SessionResponse) => void;
  appId?: string;
  windowUuid: string;
  language?: string;
  children: React.ReactNode;
}) {
  const translation = session?.translation ?? defaultTranslation;

  const operators = useMemo(() => {
    const defaultRole =
      translation.chat_operator_default_role ?? defaultTranslation.chat_operator_default_role;
    return (session?.clients ?? []).map((c) => clientToOperator(c, defaultRole));
  }, [session?.clients, translation.chat_operator_default_role]);

  const account = useMemo(
    () =>
      session
        ? session.colors
          ? { ...session.account, colors: session.colors }
          : session.account
        : undefined,
    [session],
  );

  const value = useMemo<SessionState>(
    () => ({
      status,
      appId,
      windowUuid,
      account,
      operators,
      anyOnline: Boolean(session?.any_online),
      fields: session?.fields ?? [],
      translation,
      proActiveMessages: session?.pro_active_messages ?? [],
      proActiveMessageClient: session?.pro_active_message_client ?? null,
      locale: language,
      // User sessions always include the `email` key (even when null).
      // Guest sessions never include it — use this to distinguish the two.
      isUserSession: session !== undefined && "email" in session,
      applySession,
    }),
    [status, appId, windowUuid, account, operators, session, translation, language, applySession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
