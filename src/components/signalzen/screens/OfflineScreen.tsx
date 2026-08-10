import { SendIcon, SparkleIcon } from "../icons";
import { useSession } from "../SessionProvider";

export function OfflineScreen() {
  const { translation } = useSession();
  return (
    <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin px-5 py-6">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
        {translation.chat_offline_label}
      </div>
      <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
        {translation.chat_offline_title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {translation.chat_offline_body || "Our team will get back to you as soon as possible."}
      </p>

      <div className="mt-5 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-foreground">
            {translation.chat_offline_name_label}
          </span>
          <input
            placeholder={translation.chat_offline_name_placeholder}
            className="block w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/20 focus:outline-none focus:ring-4 focus:ring-subtle"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-foreground">
            {translation.chat_offline_email_label}
          </span>
          <input
            placeholder={translation.chat_offline_email_placeholder}
            className="block w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/20 focus:outline-none focus:ring-4 focus:ring-subtle"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-foreground">
            {translation.chat_offline_message_label}
          </span>
          <textarea
            rows={4}
            placeholder={translation.chat_offline_message_placeholder}
            className="block w-full resize-none rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/20 focus:outline-none focus:ring-4 focus:ring-subtle"
          />
        </label>
      </div>

      <button className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90">
        {translation.chat_offline_send_button}
        <SendIcon className="h-3.5 w-3.5" />
      </button>

      <div className="mt-6 rounded-2xl border border-border bg-subtle/60 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <SparkleIcon className="h-3.5 w-3.5 text-accent" />
          {translation.chat_offline_ai_prompt}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{translation.chat_offline_ai_subtitle}</p>
      </div>
    </div>
  );
}
