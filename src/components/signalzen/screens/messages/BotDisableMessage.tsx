import { useState } from "react";
import type { ApiMessage } from "../../backend";
import { getUserUuid, disableBotViaMessage } from "../../backend";
import { useSession } from "../../SessionProvider";
import { Avatar } from "../primitives";
import { formatTime } from "@/lib/utils/date";

export function BotDisableMessageItem({
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
  const [botDisabled, setBotDisabled] = useState(!!msg.disabled_bot);

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
          {botDisabled ? (
            <div className="text-[14px] leading-relaxed text-foreground">
              {translation.chat_ai_disabled_text}
            </div>
          ) : (
            <button
              type="button"
              onClick={async () => {
                if (!appId) return;
                const userUuid = getUserUuid();
                if (!userUuid) return;
                try {
                  await disableBotViaMessage(appId, userUuid, msg.id);
                  setBotDisabled(true);
                } catch {
                  /* noop */
                }
              }}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-subtle"
            >
              {translation.chat_ai_disable_button_text}
            </button>
          )}
        </div>
        {showTime && time && <div className="mt-1 text-[10px] text-muted-foreground">{time}</div>}
      </div>
    </div>
  );
}
