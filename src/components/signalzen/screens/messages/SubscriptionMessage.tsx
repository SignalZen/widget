import { useState } from "react";
import type { ApiMessage } from "../../backend";
import { getUserUuid, updateUser, subscribeViaMessage } from "../../backend";
import { useSession } from "../../SessionProvider";
import { Avatar } from "../primitives";
import { formatTime } from "@/lib/utils/date";

export function SubscriptionMessageItem({
  msg,
  continued = false,
  showTime = true,
}: {
  msg: ApiMessage;
  continued?: boolean;
  showTime?: boolean;
}) {
  const { appId, translation } = useSession();
  const time = msg.created_at ? formatTime(msg.created_at) : "";
  const senderName = msg.sender?.forename ?? "Agent";
  const [localMsg, setLocalMsg] = useState(msg);
  const [emailInput, setEmailInput] = useState("");

  return (
    <div className="animate-sz-msg-left flex gap-3">
      <div className="w-6 shrink-0">
        {!continued && <Avatar name={senderName} size={24} src={msg.sender?.picture_medium_url} />}
      </div>
      <div className="min-w-0 max-w-[80%]">
        {!continued && (
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">{senderName}</div>
        )}
        <div className="rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-3">
          {localMsg.subscribed ? (
            <div className="text-[14px] leading-relaxed text-foreground">
              {translation.chat_subscribe_success.replace(/\{.+\}/g, localMsg.email ?? "")}
            </div>
          ) : (
            <>
              <div className="mb-2.5 text-[14px] leading-relaxed text-foreground">
                {translation.chat_subscribe_text}
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={translation.chat_pre_type_email_text}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!emailInput || !appId) return;
                    const userUuid = getUserUuid();
                    if (!userUuid) return;
                    try {
                      await updateUser(appId, userUuid, { email: emailInput });
                      await subscribeViaMessage(appId, userUuid, msg.id);
                    } catch {
                      /* noop */
                    }
                    setLocalMsg((prev) => ({ ...prev, subscribed: true, email: emailInput }));
                  }}
                  className="shrink-0 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background hover:bg-foreground/90"
                >
                  {translation.chat_subscribe_button}
                </button>
              </div>
            </>
          )}
        </div>
        {showTime && time && <div className="mt-1 text-[10px] text-muted-foreground">{time}</div>}
      </div>
    </div>
  );
}
