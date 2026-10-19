import { useEffect, useState } from "react";
import type { TocItem } from "~/components/wpRenderer";
import Sidebar from "~/components/Sidebar";
import { hapticTap } from "~/utils/haptic";
import type { getTopNews } from "~/utils/wordpress";
import type { getEvents } from "~/utils/discord";
import type { getMcServerStatus } from "~/utils/mcquery";
import type { fetchTopMoneyRanking } from "~/utils/money.server";

type Props = {
  tocItems?: TocItem[];
  news?: Awaited<ReturnType<typeof getTopNews>>;
  status?: Awaited<ReturnType<typeof getMcServerStatus>> | null;
  events?: Awaited<ReturnType<typeof getEvents>>;
  moneyRanking?: Awaited<ReturnType<typeof fetchTopMoneyRanking>>;
  bare?: boolean;
};

export default function RightSidebarWithToc({
  tocItems = [],
  news = [],
  status = null,
  events = [],
  moneyRanking = [],
  bare = false,
}: Props) {
  const [activeTocId, setActiveTocId] = useState<string | null>(null);

  useEffect(() => {
    if (tocItems.length === 0 || typeof IntersectionObserver === "undefined") {
      setActiveTocId(null);
      return;
    }

    let observer: IntersectionObserver | null = null;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          if (visible?.target.id) {
            setActiveTocId(visible.target.id);
          }
        },
        { rootMargin: "-6rem 0px -65% 0px", threshold: 0.01 }
      );
    } catch {
      return;
    }

    tocItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer?.observe(element);
    });

    return () => observer?.disconnect();
  }, [tocItems]);

  return (
    <div
      className={
        bare
          ? "w-full"
          : "w-full rounded-2xl bg-white/70 p-4 shadow-xl backdrop-blur-xl border border-white/40 dark:bg-neutral-800/70 dark:border-white/10 dark:text-gray-300"
      }
    >
      <div className="flex flex-col gap-4">
        {tocItems.length > 0 && (
          <div className="rounded-lg bg-white text-gray-700 shadow transition-colors duration-700 dark:bg-neutral-800 dark:text-gray-300">
            <h2 className="m-0 border-b p-4 font-bold dark:border-neutral-700">記事内目次</h2>
            <ul className="space-y-0.5 p-3">
              {tocItems.map((item) => {
                const isActive = item.id === activeTocId;
                return (
                  <li key={item.id} className={item.level === 2 ? "pl-4" : ""}>
                    <button
                      type="button"
                      className={[
                        "block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                        isActive
                          ? "bg-amber-500/20 font-medium text-amber-700 dark:text-amber-200"
                          : "text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-white/5",
                      ].join(" ")}
                      onClick={() => {
                        hapticTap();
                        document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      <span className="line-clamp-2">{item.text}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <Sidebar news={news} status={status} events={events} moneyRanking={moneyRanking} />
      </div>
    </div>
  );
}
