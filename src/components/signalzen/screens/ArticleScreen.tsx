import { useEffect, useState } from "react";
import { ThumbDownIcon, ThumbUpIcon } from "../icons";
import { type HelpItem, fetchHelp, postHelpReaction } from "../backend";
import { useSession } from "../SessionProvider";
import { LexicalContent } from "./LexicalContent";

export function ArticleScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const { appId, translation } = useSession();
  const [article, setArticle] = useState<HelpItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reaction, setReaction] = useState<"helpful_yes" | "helpful_no" | null>(null);

  useEffect(() => {
    if (!appId || !id) return;
    setLoading(true);
    setError(null);
    setArticle(null);
    setReaction(null);
    fetchHelp(appId, id)
      .then((item) => setArticle(item))
      .catch(() => setError(translation.chat_article_error))
      .finally(() => setLoading(false));
  }, [appId, id]);

  function handleReaction(kind: "helpful_yes" | "helpful_no") {
    if (!appId || !article || reaction !== null) return;
    setReaction(kind);
    postHelpReaction(appId, article.id, kind).catch(() => {
      // fire-and-forget; UI already updated optimistically
    });
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
      {loading && (
        <div className="flex flex-1 items-center justify-center py-10 text-sm text-muted-foreground">
          {translation.chat_loading}
        </div>
      )}
      {error && !loading && <div className="px-5 py-6 text-sm text-muted-foreground">{error}</div>}
      {!loading && !error && article && (
        <>
          <div className="px-5 pb-4 pt-6">
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
              {article.title}
            </h1>
          </div>
          <div className="flex-1 px-5 pb-6">
            {article.json_body ? (
              <LexicalContent json={article.json_body} />
            ) : article.body ? (
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
                {article.body}
              </p>
            ) : (
              <p className="text-[14px] text-muted-foreground">
                {translation.chat_article_no_content}
              </p>
            )}
          </div>
          <div className="border-t border-border bg-card px-5 py-3">
            <div className="text-xs font-medium text-muted-foreground">
              {translation.chat_was_helpful}
            </div>
            {reaction === null ? (
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => handleReaction("helpful_yes")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-subtle"
                >
                  <ThumbUpIcon className="h-3.5 w-3.5" /> {translation.chat_helpful_yes}
                </button>
                <button
                  onClick={() => handleReaction("helpful_no")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-subtle"
                >
                  <ThumbDownIcon className="h-3.5 w-3.5" /> {translation.chat_helpful_no}
                </button>
                <button
                  onClick={onBack}
                  className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {translation.chat_back_to_help}
                </button>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {reaction === "helpful_yes"
                    ? translation.chat_helpful_yes_thanks
                    : translation.chat_helpful_no_thanks}
                </span>
                <button
                  onClick={onBack}
                  className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {translation.chat_back_to_help}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
