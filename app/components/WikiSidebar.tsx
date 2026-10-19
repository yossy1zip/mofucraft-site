import { Link, useLocation } from "@remix-run/react";
import { useEffect, useState } from "react";
import type { MenuSection, MenuItem } from "~/types/menu";
import type { WikiPathEntry } from "~/utils/wikijs.server";
import type { WpPost } from "~/utils/wordpress";
import { decodeHtmlEntities } from "~/utils/htmlDecode";
import { hapticTap, hapticToggle } from "~/utils/haptic";
import SidebarSearch from "~/components/SidebarSearch";

const COLLAPSED_STORAGE_KEY = "wiki-sidebar-collapsed";

interface Props {
  menuSections: MenuSection[];
  wikiPages?: WikiPathEntry[];
  news?: WpPost[];
  mobileOnly?: boolean;
}

function ItemIcon({ item }: { item: MenuItem }) {
  if (item.icon && item.icon.startsWith("mdi-")) {
    return <i className={`mdi ${item.icon} text-lg shrink-0 leading-none`} />;
  }
  if (item.icon && /^fa[bsrl]?\s+fa-/.test(item.icon)) {
    return <i className={`${item.icon} text-lg shrink-0 leading-none`} />;
  }
  if (item.image && /^https?:\/\//.test(item.image)) {
    return <img src={item.image} alt="" className="w-5 h-5 shrink-0 rounded" />;
  }
  return <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 shrink-0" />;
}

export default function WikiSidebar({ menuSections, wikiPages, news, mobileOnly = false }: Props) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const closeMobile = () => {
    hapticTap();
    setMobileOpen(false);
  };

  const toggleSection = (id: string) => {
    hapticToggle();
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  if (menuSections.length === 0) return null;

  const renderItems = (section: MenuSection) => (
    <ul className="space-y-0.5">
      {section.items.map((item, idx) => {
        const isActive = location.pathname !== "/" && location.pathname === item.slug;
        const isExternal = item.slug.startsWith("http");
        const linkClass = `flex items-center gap-3 px-2 lg:px-3.5 py-2.5 text-[15px] lg:text-sm rounded-lg lg:rounded-md transition-colors ${
          isActive
            ? "bg-amber-500/20 text-amber-700 dark:text-amber-200 font-medium"
            : "text-neutral-700 dark:text-neutral-200 hover:bg-pink-500/20 hover:text-pink-700 dark:hover:text-pink-200 active:bg-pink-500/20"
        }`;
        const content = (
          <>
            <ItemIcon item={item} />
            <span className="truncate flex-1">{decodeHtmlEntities(item.title)}</span>
            {isExternal && (
              <svg className="w-3 h-3 ml-auto opacity-50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            )}
          </>
        );
        const key = `${section.id}-${idx}`;
        return (
          <li key={key}>
            {isExternal ? (
              <a
                href={item.slug}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
                onClick={() => hapticTap()}
              >
                {content}
              </a>
            ) : (
              <Link
                to={item.slug || "/"}
                className={linkClass}
                onClick={() => { hapticTap(); setMobileOpen(false); }}
              >
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Mobile FAB toggle */}
      <button
        type="button"
        onClick={() => { hapticToggle(); setMobileOpen((v) => !v); }}
        className={[
          "lg:hidden fixed bottom-5 left-5 z-50",
          "h-14 w-14 rounded-full",
          "bg-gradient-to-b from-purple-600/70 to-purple-900/80 dark:from-purple-400/60 dark:to-purple-700/80",
          "hover:from-purple-500/80 hover:to-purple-800/90 dark:hover:from-purple-300/70 dark:hover:to-purple-600/90",
          "backdrop-blur-md",
          "text-white dark:text-purple-50",
          "shadow-xl shadow-purple-950/50 dark:shadow-purple-800/60",
          "ring-1 ring-white/30 dark:ring-purple-300/40",
          "[box-shadow:inset_0_1px_1px_rgba(255,255,255,0.35),0_8px_24px_rgba(88,28,135,0.5)]",
          "dark:[box-shadow:inset_0_1px_1px_rgba(255,255,255,0.45),0_8px_24px_rgba(147,51,234,0.6)]",
          "flex items-center justify-center",
          "transition-all duration-300 ease-out active:scale-90",
          mobileOpen ? "scale-95" : "scale-100",
        ].join(" ")}
        aria-label={mobileOpen ? "ナビゲーションを閉じる" : "ナビゲーションを開く"}
        aria-expanded={mobileOpen}
      >
        <svg
          className="h-7 w-7 transition-transform duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {mobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 6h16M4 12h16M4 18h7" />
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      <button
        type="button"
        aria-label="閉じる"
        tabIndex={mobileOpen ? 0 : -1}
        className={[
          "lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm",
          "transition-opacity duration-300 ease-out",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={closeMobile}
      />

      <aside
        className={[
          // Mobile: 常にDOMに残してアニメーションでスライドイン
          "fixed inset-y-0 left-0 z-[45] w-[88vw] max-w-[22rem] overflow-y-auto overscroll-contain",
          "transform-gpu transition-transform duration-300 ease-out will-change-transform",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: 通常のサイドバーとして配置
          mobileOnly
            ? "lg:hidden"
            : "lg:static lg:translate-x-0 lg:block lg:sticky lg:top-20 lg:self-start lg:w-auto lg:max-w-none xl:w-auto lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:z-20 lg:inset-auto lg:overscroll-auto no-scrollbar",
          "shrink-0 px-3 py-4 lg:p-4",
          "bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl",
          "border border-white/40 dark:border-white/10 lg:rounded-2xl shadow-2xl lg:shadow-xl",
          "rounded-r-2xl",
        ].join(" ")}
        aria-hidden={!mobileOpen && mobileOnly ? true : undefined}
      >
        <div className="lg:hidden flex justify-between items-center mb-3 px-2 pb-3 border-b border-neutral-200 dark:border-white/10">
          <h2 className="font-bold text-neutral-800 dark:text-neutral-100">ナビゲーション</h2>
          <button
            type="button"
            onClick={closeMobile}
            aria-label="閉じる"
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors active:scale-90"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {wikiPages && wikiPages.length > 0 && (
          <SidebarSearch wikiPages={wikiPages} news={news ?? []} />
        )}
        <nav className="space-y-3 lg:space-y-2 pb-24 lg:pb-0">
          {menuSections.map((section) => {
            const isCollapsed = collapsed[section.id] ?? false;
            return (
              <div key={section.id}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={!isCollapsed}
                  className="w-full flex items-center gap-2 mb-1.5 px-2 lg:px-3.5 py-1.5 rounded-md text-left transition-colors hover:bg-neutral-200/60 dark:hover:bg-white/5 active:bg-neutral-200/80 dark:active:bg-white/10"
                >
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex-1 truncate">
                    {decodeHtmlEntities(section.title)}
                  </h3>
                  <svg
                    className={`w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0 transition-transform duration-300 ease-out ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}
                >
                  <div className="overflow-hidden">
                    {renderItems(section)}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
