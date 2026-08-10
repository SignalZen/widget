import { useState } from "react";
import { CheckIcon } from "../icons";
import { LexicalContent } from "./LexicalContent";
import { useSession } from "../SessionProvider";

const DEFAULT_BODY =
  "To provide support, we need to process the personal data you share in this chat.";
const DEFAULT_BUTTON =
  "I understand and agree to the processing of my personal data as described above.";

export function GdprScreen({
  onAccept,
  onBack,
  showBack = true,
  jsonBody,
  body,
  buttonText,
}: {
  onAccept: () => void;
  onBack: () => void;
  showBack?: boolean;
  jsonBody?: string;
  body?: string;
  buttonText?: string;
}) {
  const { translation } = useSession();
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin px-5 py-6">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-foreground text-background">
          <CheckIcon className="h-3 w-3" />
        </span>
        {translation.chat_gdpr_step_label}
      </div>
      <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
        {translation.chat_gdpr_title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{translation.chat_gdpr_subtitle}</p>

      <div className="mt-5 space-y-3 rounded-2xl border border-border bg-card p-4 text-sm text-foreground">
        {jsonBody ? (
          <LexicalContent json={jsonBody} />
        ) : body ? (
          <p className="m-0 leading-relaxed">{body}</p>
        ) : (
          <>
            <p className="m-0 leading-relaxed">{DEFAULT_BODY}</p>
            <ul className="m-0 space-y-2 pl-4 leading-relaxed text-muted-foreground">
              <li className="list-disc">
                Messages and attachments are stored securely and only used to resolve your request.
              </li>
              <li className="list-disc">
                Your data is not sold to third parties or used for advertising.
              </li>
              <li className="list-disc">
                You can request a copy or deletion of your chat history at any time.
              </li>
              <li className="list-disc">
                We may share relevant details with our support tooling providers under strict
                data-processing terms.
              </li>
            </ul>
          </>
        )}
      </div>

      <label className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-subtle/50">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => {
            setAgreed(e.target.checked);
            if (e.target.checked) onAccept();
          }}
          className="accent-accent"
        />
        <span className="text-sm leading-relaxed text-foreground">
          {buttonText || DEFAULT_BUTTON}
        </span>
      </label>

      {showBack && (
        <div className="mt-auto pt-5">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-subtle hover:text-foreground"
          >
            {translation.chat_gdpr_back}
          </button>
        </div>
      )}
    </div>
  );
}
