import type { ApiMessage } from "../../backend";
import { Avatar } from "../primitives";
import { formatTime } from "@/lib/utils/date";
import { LexicalContent, extractLexicalText } from "../LexicalContent";
import { MessageFiles } from "./MessageFiles";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { LinkedText } from "./LinkedText";
import { useLinkPreview } from "@/lib/hooks/useLinkPreview";

export function OperatorMessage({
  msg,
  continued = false,
  showTime = true,
}: {
  msg: ApiMessage;
  continued?: boolean;
  showTime?: boolean;
}) {
  const time = msg.created_at ? formatTime(msg.created_at) : "";
  const senderName = msg.sender?.forename ?? "Agent";
  const hasText = !!(msg.json_body || msg.body);
  const files = msg.files ?? [];
  const plainText = msg.json_body ? extractLexicalText(msg.json_body) : (msg.body ?? "");
  const preview = useLinkPreview(plainText);

  return (
    <div className="animate-sz-msg-left flex gap-3">
      <div className="w-6 shrink-0">
        {!continued && <Avatar name={senderName} size={24} src={msg.sender?.picture_medium_url} />}
      </div>
      <div className="min-w-0 max-w-[80%]">
        {!continued && (
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">{senderName}</div>
        )}
        {hasText && (
          <div className="inline-block rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-2 text-[14px] leading-relaxed text-foreground">
            {msg.json_body ? (
              <LexicalContent json={msg.json_body} />
            ) : (
              <LinkedText
                text={msg.body ?? ""}
                linkClassName="underline decoration-muted-foreground underline-offset-2 hover:text-accent"
              />
            )}
          </div>
        )}
        {preview && <LinkPreviewCard preview={preview} align="left" />}
        {files.length > 0 && <MessageFiles files={files} align="left" />}
        {showTime && time && <div className="mt-1 text-[10px] text-muted-foreground">{time}</div>}
      </div>
    </div>
  );
}
