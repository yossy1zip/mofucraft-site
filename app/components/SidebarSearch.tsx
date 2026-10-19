import { Link, useNavigate } from "@remix-run/react";
import { useState, useEffect, useRef, useMemo } from "react";
import type { WikiPathEntry } from "~/utils/wikijs.server";
import type { WpPost } from "~/utils/wordpress";
import { decodeHtmlEntities } from "~/utils/htmlDecode";
import { hapticTap } from "~/utils/haptic";

type SearchResult =
  | { kind: "wiki"; title: string; path: string }
  | { kind: "news"; title: string; id: number };

interface Props {
  wikiPages: WikiPathEntry[];
  news: WpPost[];
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-200 dark:bg-amber-700/60 text-inherit rounded-[2px] px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SidebarSearch({ wikiPages, news }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];

    const wikiHits: SearchResult[] = wikiPages
      .filter((p) => {
        const t = (p.title || p.path).toLowerCase();
        return t.includes(q) || p.path.toLowerCase().includes(q);
      })
      .slice(0, 6)
      .map((p) => ({ kind: "wiki", title: p.title || p.path, path: p.path }));

    const newsHits: SearchResult[] = news
      .filter((n) => decodeHtmlEntities(n.title.rendered).toLowerCase().includes(q))
      .slice(0, 4)
      .map((n) => ({ kind: "news", title: decodeHtmlEntities(n.title.rendered), id: n.id }));

    return [...wikiHits, ...newsHits].slice(0, 8);
  }, [query, wikiPages, news]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const hit = results[activeIndex];
      hapticTap();
      navigate(hit.kind === "wiki" ? `/${hit.path}` : `/news/${hit.id}`);
      setOpen(false);
      setQuery("");
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const clear = () => {
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const selectResult = (r: SearchResult) => {
    hapticTap();
    setOpen(false);
    setQuery("");
  };

  const showDropdown = open && results.length > 0;
  const wikiResults = results.filter((r) => r.kind === "wiki");
  const newsResults = results.filter((r) => r.kind === "news");

  return (
    <div ref={containerRef} className="relative mb-3">
      {/* 入力フィールド */}
      <div className="relative">
        <i
          className={`fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none transition-colors duration-150 ${
            focused ? "text-amber-500" : "text-neutral-400 dark:text-neutral-500"
          }`}
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="検索..."
          autoComplete="off"
          className="w-full pl-8 pr-7 py-2 text-sm rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-white/10 placeholder-neutral-400 dark:placeholder-neutral-500 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400/40 transition-[box-shadow,border-color] duration-150"
        />
        {/* クリアボタン */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); clear(); }}
          aria-label="クリア"
          className={`absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-white/10 transition-all duration-150 ${
            query ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ドロップダウン */}
      <div
        className={`absolute z-50 mt-1.5 w-full rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 shadow-2xl shadow-neutral-900/10 dark:shadow-black/40 overflow-hidden transition-all duration-150 ease-out origin-top ${
          showDropdown
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
        }`}
      >
        {/* Wiki セクション */}
        {wikiResults.length > 0 && (
          <>
            <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              <i className="fas fa-book text-[9px]" />
              Wiki
            </div>
            {wikiResults.map((r, localIdx) => {
              const globalIdx = results.indexOf(r);
              const isActive = globalIdx === activeIndex;
              return (
                <Link
                  key={`wiki-${localIdx}`}
                  to={`/${r.path}`}
                  onClick={() => selectResult(r)}
                  className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-75 ${
                    isActive
                      ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                      : "text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5"
                  }`}
                >
                  <i className={`fas fa-file-alt text-xs shrink-0 ${isActive ? "text-amber-500" : "text-neutral-400"}`} />
                  <span className="truncate">{highlight(r.title, query.trim())}</span>
                </Link>
              );
            })}
          </>
        )}

        {/* ニュース セクション */}
        {newsResults.length > 0 && (
          <>
            <div className={`px-3 pb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 ${wikiResults.length > 0 ? "pt-2 border-t border-neutral-100 dark:border-white/5 mt-1" : "pt-2.5"}`}>
              <i className="fas fa-newspaper text-[9px]" />
              ニュース
            </div>
            {newsResults.map((r, localIdx) => {
              const globalIdx = results.indexOf(r);
              const isActive = globalIdx === activeIndex;
              return (
                <Link
                  key={`news-${localIdx}`}
                  to={`/news/${r.id}`}
                  onClick={() => selectResult(r)}
                  className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-75 ${
                    isActive
                      ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                      : "text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5"
                  }`}
                >
                  <i className={`fas fa-rss text-xs shrink-0 ${isActive ? "text-amber-500" : "text-neutral-400"}`} />
                  <span className="truncate">{highlight(r.title, query.trim())}</span>
                </Link>
              );
            })}
          </>
        )}

        <div className="h-1" />
      </div>
    </div>
  );
}
