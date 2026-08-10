import type { ApiMessage } from "../../backend";
import { formatTime } from "@/lib/utils/date";
import { extractLexicalText } from "../LexicalContent";
import { MessageFiles } from "./MessageFiles";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { LinkedText } from "./LinkedText";
import { useLinkPreview } from "@/lib/hooks/useLinkPreview";

export function UserMessage({ msg, showTime = true }: { msg: ApiMessage; showTime?: boolean }) {
  const time = msg.created_at ? formatTime(msg.created_at) : "";
  const hasText = !!(msg.json_body || msg.body);
  const files = msg.files ?? [];
  const plainText = msg.json_body ? extractLexicalText(msg.json_body) : (msg.body ?? "");
  const preview = useLinkPreview(plainText);

  return (
    <div className="animate-sz-msg-right flex justify-end">
      <div className="max-w-[80%]">
        {hasText && (
          <div className="rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-[14px] leading-relaxed text-accent-foreground">
            <LinkedText
              text={msg.json_body ? extractLexicalText(msg.json_body) : (msg.body ?? "")}
              linkClassName="underline decoration-accent-foreground/50 underline-offset-2 hover:decoration-accent-foreground"
            />
          </div>
        )}
        {preview && <LinkPreviewCard preview={preview} align="right" />}
        {files.length > 0 && <MessageFiles files={files} align="right" />}
        {showTime && time && (
          <div className="mt-1 text-right text-[10px] text-muted-foreground">{time}</div>
        )}
      </div>
    </div>
  );
}
