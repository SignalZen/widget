import { useState } from "react";
import type { ApiMessage } from "../../backend";
import { getUserUuid, rateMessage } from "../../backend";
import { useSession } from "../../SessionProvider";
import { Avatar } from "../primitives";
import { StarIcon } from "../../icons";
import { formatTime } from "@/lib/utils/date";

export function RatingMessageItem({
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
  const [localRating, setLocalRating] = useState<number | null>(msg.rating ?? null);
  const [hoverRating, setHoverRating] = useState(0);

  const completedText = localRating
    ? translation.chat_rating_request_completed.replace(/\{.+\}/g, String(localRating))
    : null;

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
          {localRating ? (
            <div className="text-[14px] leading-relaxed text-foreground">
              {completedText || translation.chat_rating_request_completed}
            </div>
          ) : (
            <>
              <div className="mb-2.5 text-[14px] leading-relaxed text-foreground">
                {translation.chat_rating_request}
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={async () => {
                      const userUuid = getUserUuid();
                      if (!appId || !userUuid) return;
                      setLocalRating(n);
                      try {
                        await rateMessage(appId, userUuid, msg.id, n);
                      } catch {
                        setLocalRating(null);
                      }
                    }}
                    className="transition-colors"
                    aria-label={`Rate ${n} out of 5`}
                  >
                    <StarIcon
                      className={`h-5 w-5 ${n <= (hoverRating || localRating || 0) ? "text-foreground" : "text-muted-foreground/40"}`}
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {showTime && time && <div className="mt-1 text-[10px] text-muted-foreground">{time}</div>}
      </div>
    </div>
  );
}
