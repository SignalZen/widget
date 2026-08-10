import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, BookIcon, FileIcon, SearchIcon, XIcon } from "../icons";
import { type HelpItem, fetchHelps, fetchHelp } from "../backend";
import { useSession } from "../SessionProvider";
import { LexicalContent } from "./LexicalContent";

type PathEntry = { item: HelpItem; children: HelpItem[] };

export function HelpCenterScreen({
  onOpenArticle,
  initialCategoryId,
  onConsumedInitialCategory,
}: {
  onOpenArticle: (id: string) => void;
  initialCategoryId?: string | null;
  onConsumedInitialCategory?: () => void;
}) {
  const { appId, translation } = useSession();
  const [items, setItems] = useState<HelpItem[]>([]);
  const [path, setPath] = useState<PathEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<HelpItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const load = async (parentId?: string | number) => {
    if (!appId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchHelps(appId, parentId);
      setItems(res.helps ?? []);
    } catch {
      setError(translation.chat_article_error);
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async (q: string) => {
    if (!appId || !q.trim()) return;
    setSearchLoading(true);
    setError(null);
    try {
      const res = await fetchHelps(appId, undefined, q.trim());
      setSearchResults(res.helps ?? []);
    } catch {
      setError("Search failed.");
    } finally {
      setSearchLoading(false);
    }
  };

  const onQueryChange = (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setSearchResults(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void runSearch(val), 350);
  };

  const clearSearch = () => {
    setQuery("");
    setSearchResults(null);
  };

  useEffect(() => {
    void load();
  }, [appId]);

  useEffect(() => {
    if (!initialCategoryId || !appId) return;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [item, childrenRes] = await Promise.all([
          fetchHelp(appId, initialCategoryId),
          fetchHelps(appId, initialCategoryId),
        ]);
        const children = childrenRes.helps ?? [];
        if (children.length === 0) {
          onOpenArticle(initialCategoryId);
        } else {
          setPath([{ item, children }]);
          setItems(children);
        }
      } catch {
        setError(translation.chat_article_error);
      } finally {
        setLoading(false);
        onConsumedInitialCategory?.();
      }
    })();
  }, [initialCategoryId, appId]);

  const current = path[path.length - 1]?.item;
  const nodes = path.length > 0 ? (path[path.length - 1]?.children ?? []) : items;

  const handleClick = async (item: HelpItem) => {
    if (!item.has_children) {
      onOpenArticle(String(item.id));
      return;
    }
    if (!appId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchHelps(appId, item.id);
      const children = res.helps ?? [];
      if (children.length === 0) {
        onOpenArticle(String(item.id));
        return;
      }
      setPath((p) => [...p, { item, children }]);
      setItems(children);
      setSearchResults(null);
      setQuery("");
    } catch {
      setError(translation.chat_article_error);
    } finally {
      setLoading(false);
    }
  };

  const goTo = async (index: number) => {
    if (index < 0) {
      setPath([]);
      void load();
      return;
    }
    const newPath = path.slice(0, index + 1);
    setPath(newPath);
    setItems(newPath[newPath.length - 1]?.children ?? []);
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
      <div className="px-5 pb-3 pt-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          {current?.title ?? translation.chat_help_center_label}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {translation.chat_help_browse_subtitle}
        </p>
      </div>

      <div className="px-5">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 focus-within:border-foreground/20">
          <SearchIcon className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runSearch(query);
            }}
            placeholder={translation.chat_search_knowledge_placeholder}
            aria-label={translation.chat_search_knowledge_placeholder}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={clearSearch}
              aria-label={translation.chat_cancel_button}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="shrink-0 rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </span>
          )}
        </div>
      </div>

      {!searchResults && (
        <div className="flex items-center gap-1 px-5 pt-4 text-[12px] text-muted-foreground">
          <button
            onClick={() => goTo(-1)}
            className={`rounded-md px-1.5 py-0.5 transition-colors hover:bg-subtle hover:text-foreground ${
              path.length === 0 ? "font-medium text-foreground" : ""
            }`}
          >
            {translation.chat_all_topics}
          </button>
          {path.map((entry, i) => (
            <span key={String(entry.item.id)} className="flex items-center gap-1">
              <ArrowRightIcon className="h-3 w-3 opacity-60" />
              <button
                onClick={() => goTo(i)}
                className={`rounded-md px-1.5 py-0.5 transition-colors hover:bg-subtle hover:text-foreground ${
                  i === path.length - 1 ? "font-medium text-foreground" : ""
                }`}
              >
                {entry.item.title}
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="px-5 pb-6 pt-3">
        {(loading || searchLoading) && (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            {translation.chat_loading}
          </div>
        )}
        {error && !loading && !searchLoading && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            {error}
          </div>
        )}
        {searchResults !== null && !searchLoading && !error && searchResults.length === 0 && (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            {translation.chat_no_results.replace("{{ query }}", query)}
          </div>
        )}
        {!loading && !searchLoading && !error && searchResults === null && nodes.length === 0 && (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            {translation.chat_no_topics}
          </div>
        )}
        {!searchResults && !loading && current && (current.json_body || current.body) && (
          <div className="mb-4 rounded-2xl border border-border bg-card px-5 py-4">
            {current.json_body ? (
              <LexicalContent json={current.json_body} />
            ) : (
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
                {current.body}
              </p>
            )}
          </div>
        )}
        {!loading && !searchLoading && !error && (searchResults ?? nodes).length > 0 && (
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
            {(searchResults ?? nodes).map((item, i) => (
              <button
                key={String(item.id)}
                type="button"
                onClick={() => void handleClick(item)}
                className={`group flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-subtle ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                    item.has_children
                      ? "bg-foreground text-background"
                      : "bg-subtle text-muted-foreground"
                  }`}
                >
                  {item.has_children ? (
                    <BookIcon className="h-3.5 w-3.5" />
                  ) : (
                    <FileIcon className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-foreground">
                    {item.title}
                  </div>
                  <div className="truncate text-[11.5px] text-muted-foreground">
                    {item.has_children
                      ? translation.chat_category_label
                      : translation.chat_article_label}
                  </div>
                </div>
                <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
