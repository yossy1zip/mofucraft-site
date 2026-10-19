import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  Link,
  useLocation,
  useMatches,
  useRouteError,
  isRouteErrorResponse,
} from "@remix-run/react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useState, useEffect } from "react";
import NotFound from "~/components/NotFound";
import UnexpectedError from "~/components/UnexpectedError";
import ErrorSidebar from "~/components/ErrorSidebar";
import styles from "~/styles/global.css?url";
import { getTopNews } from "~/utils/wordpress";
import { getWikiMenuSections, getAllWikiPaths } from "~/utils/wikijs.server";
import type { WikiPathEntry } from "~/utils/wikijs.server";
import { getMcServerStatus } from "~/utils/mcquery";
import { getEvents } from "./utils/discord";
import { fetchTopMoneyRanking } from "~/utils/money.server";
import { getGalleries, getPveGalleries } from "~/utils/strapi";
import Header from "./components/Header";
import TopPageFullWidth from "./components/TopPageFullWidth";
import Footer from "./components/Footer";
import WikiSidebar from "./components/WikiSidebar";
import RightSidebarWithToc from "./components/RightSidebarWithToc";
import { PveModeProvider, usePveMode } from "~/contexts/PveModeContext";
import { TranslationProvider } from "~/contexts/TranslationContext";
import { extractTocAndContentWithH1H2Toc } from "~/components/wpRenderer";

const FULL_WIDTH_ROUTES = new Set(["/map", "/about"]);

let cachedData: {
  news: Awaited<ReturnType<typeof getTopNews>>;
  events: Awaited<ReturnType<typeof getEvents>>;
  moneyRanking: Awaited<ReturnType<typeof fetchTopMoneyRanking>>;
  menuSections: Awaited<ReturnType<typeof getWikiMenuSections>>;
  wikiPages: WikiPathEntry[];
  galleries: Awaited<ReturnType<typeof getGalleries>>;
  pveGalleries: Awaited<ReturnType<typeof getPveGalleries>>;
  timestamp: number;
} | null = null;

let cachedStatus: {
  status: Awaited<ReturnType<typeof getMcServerStatus>>;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
const STATUS_CACHE_DURATION = 1000 * 30; // 30 seconds for player count

export const meta = ({ data }: { data: any }) => {
  // isTopPageがtrueならトップページ
  if (data?.isTopPage) {
    return [{ title: "MOFUCRAFT!!!" }];
  }
  // 他ページはタイトル名 - MOFUCRAFT!!!
  return [{ title: `${data?.pageTitle || "＾〜＾"} - MOFUCRAFT!!!` }];
};

export const links = () => [
  { rel: "stylesheet", href: styles },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Raleway:wght@100;400;600;700;900&family=Noto+Sans+JP:wght@100;400;600;700;900&display=swap"
  },
  {
    rel: "stylesheet",
    href: "https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css"
  },
  {
    rel: "stylesheet",
    href: "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.15.4/css/all.min.css"
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const now = Date.now();
  const url = new URL(request.url);
  const isTopPage = url.pathname === "/";

  // Check if we need to refresh the main cached data
  const needsMainRefresh = !cachedData || now - cachedData.timestamp >= CACHE_DURATION;
  // Check if we need to refresh the status (more frequently)
  const needsStatusRefresh = !cachedStatus || now - cachedStatus.timestamp >= STATUS_CACHE_DURATION;

  const isTranslationAvailable = !!process.env.DEEPL_AUTH_KEY;

  // Return cached data if nothing needs refresh
  if (!needsMainRefresh && !needsStatusRefresh) {
    return json({ isTopPage, ...cachedData, status: cachedStatus!.status, isTranslationAvailable });
  }

  // Build list of promises to fetch
  const fetchPromises: Promise<any>[] = [];

  if (needsMainRefresh) {
    fetchPromises.push(
      getTopNews(15).catch((error: any) => {
        console.error("Failed to load news:", error?.message || error);
        return [] as Awaited<ReturnType<typeof getTopNews>>;
      }),
      getEvents().catch((error: any) => {
        console.error("Failed to load Discord events:", error?.message || error);
        return [] as Awaited<ReturnType<typeof getEvents>>;
      }),
      fetchTopMoneyRanking(10).catch((error: any) => {
        console.error("Failed to load money ranking:", error?.message || error);
        return [] as Awaited<ReturnType<typeof fetchTopMoneyRanking>>;
      }),
      getWikiMenuSections().catch((error: any) => {
        console.error("Failed to load menu sections:", error?.message || error);
        return [] as Awaited<ReturnType<typeof getWikiMenuSections>>;
      }),
      getGalleries().catch((error: any) => {
        console.error("Failed to load galleries:", error?.message || error);
        return [] as Awaited<ReturnType<typeof getGalleries>>;
      }),
      getPveGalleries().catch((error: any) => {
        console.error("Failed to load PvE galleries:", error?.message || error);
        return [] as Awaited<ReturnType<typeof getPveGalleries>>;
      }),
      getAllWikiPaths().catch((error: any) => {
        console.error("Failed to load wiki pages:", error?.message || error);
        return [] as WikiPathEntry[];
      }),
    );
  }

  if (needsStatusRefresh) {
    fetchPromises.push(
      getMcServerStatus().catch((error: any) => {
        console.error("Failed to load server status:", error?.message || error);
        return { online: false, players: 0, maxPlayers: 0, version: '', motd: '' } as Awaited<ReturnType<typeof getMcServerStatus>>;
      }),
    );
  }

  const results = await Promise.all(fetchPromises);

  let news, events, moneyRanking, menuSections, galleries, pveGalleries, wikiPages, status;

  if (needsMainRefresh) {
    [news, events, moneyRanking, menuSections, galleries, pveGalleries, wikiPages] = results.slice(0, 7);
    cachedData = {
      news,
      events,
      moneyRanking,
      menuSections,
      wikiPages,
      galleries,
      pveGalleries,
      timestamp: now,
    };
    if (needsStatusRefresh) {
      status = results[7];
      cachedStatus = { status, timestamp: now };
    } else {
      status = cachedStatus!.status;
    }
  } else {
    // Only status needed refresh
    status = results[0];
    cachedStatus = { status, timestamp: now };
    ({ news, events, moneyRanking, menuSections, wikiPages, galleries, pveGalleries } = cachedData!);
  }

  return json({ isTopPage, news, status, events, moneyRanking, menuSections, wikiPages, galleries, pveGalleries, isTranslationAvailable });
}

function AppContent() {
  const data = useLoaderData<typeof loader>();
  const [isDesktop, setIsDesktop] = useState(false);
  const location = useLocation();
  const { isPveMode } = usePveMode();

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // PvEモード時にhtmlにクラスを追加
  useEffect(() => {
    if (isPveMode) {
      document.documentElement.classList.add('pve-mode');
    } else {
      document.documentElement.classList.remove('pve-mode');
    }
  }, [isPveMode]);

  const normalizedPath =
    location.pathname !== "/" ? location.pathname.replace(/\/+$/, "") : "/";
  const isFullWidthPage = FULL_WIDTH_ROUTES.has(normalizedPath);
  const matches = useMatches();
  const isWikiLayout = matches.some(
    (m) => (m.handle as { layout?: string } | undefined)?.layout === "wiki"
  );
  const currentWikiMatch = matches.find(
    (m) => (m.handle as { layout?: string } | undefined)?.layout === "wiki"
  );
  const currentWikiRender = (
    currentWikiMatch?.data as { page?: { render?: string } } | undefined
  )?.page?.render;
  let wikiTocItems: ReturnType<typeof extractTocAndContentWithH1H2Toc>["tocItems"] = [];
  try {
    if (typeof currentWikiRender === "string" && currentWikiRender.length > 0) {
      wikiTocItems = extractTocAndContentWithH1H2Toc(currentWikiRender).tocItems;
    }
  } catch (error) {
    console.error("Failed to extract TOC items:", error);
    wikiTocItems = [];
  }
  return (
    <TranslationProvider isAvailable={data.isTranslationAvailable}>
      <Header menuSections={data.menuSections} />
      {data.isTopPage && <TopPageFullWidth showVideo={true} galleries={data.galleries} pveGalleries={data.pveGalleries} />}
      {isFullWidthPage ? (
        <>
          <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
            <div className="flex-1">
              <Outlet />
            </div>
          </div>
          <WikiSidebar menuSections={data.menuSections} wikiPages={data.wikiPages} news={data.news} mobileOnly />
        </>
      ) : (
        <>
          <div className="grid w-full max-w-[112rem] mx-auto items-start gap-6 px-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:px-6 xl:grid-cols-[18rem_minmax(0,1fr)_18rem] 2xl:grid-cols-[22rem_minmax(0,1fr)_22rem] mt-8">
            <WikiSidebar menuSections={data.menuSections} wikiPages={data.wikiPages} news={data.news} />
            <main className="relative z-0 flex-1 min-w-0">
              <div className="max-w-6xl mx-auto">
                <Outlet />
                {!data.isTopPage && (
                  <div className="mt-12 flex justify-center">
                    <Link
                      to="/"
                      className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow transition-colors hover:bg-gray-50 dark:bg-neutral-800 dark:text-gray-200 dark:hover:bg-neutral-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      ホームへ戻る
                    </Link>
                  </div>
                )}
              </div>
            </main>
            <aside className="relative z-20 hidden xl:block xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-5.5rem)] xl:overflow-y-auto no-scrollbar w-full shrink-0 rounded-2xl bg-white/70 p-4 shadow-xl backdrop-blur-xl border border-white/40 dark:bg-neutral-800/70 dark:border-white/10 dark:text-gray-300">
              <RightSidebarWithToc
                tocItems={wikiTocItems}
                news={data.news}
                status={data.status || null}
                events={data.events}
                moneyRanking={data.moneyRanking}
                bare
              />
            </aside>
          </div>
          {/* xl 未満では右サイドバーを記事下に積む（目次は非表示） */}
          <div className="xl:hidden w-full mx-auto px-4 mt-12 md:max-w-[24rem] md:px-0">
            <RightSidebarWithToc
              tocItems={[]}
              news={data.news}
              status={data.status || null}
              events={data.events}
              moneyRanking={data.moneyRanking}
            />
          </div>
          <div className="mt-20" />
        </>
      )}
      {!isFullWidthPage && <Footer />}
    </TranslationProvider>
  );
}

export default function App() {
  return (
    <html lang="ja" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7015792784625748"
          crossOrigin="anonymous"></script>
        <Meta />
        <Links />
      </head>
      <body className="h-full font-sans">
        <PveModeProvider>
          <AppContent />
        </PveModeProvider>
        <ScrollRestoration />
        <Scripts />
        <script src="https://www.google.com/recaptcha/api.js" async defer></script>
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  return (
    <html lang="ja">
      <head>
        <title>{is404 ? "404 - ページが見つかりません" : "エラーが発生しました"} - MOFUCRAFT!!!</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full font-sans">
        <PveModeProvider>
          <TranslationProvider isAvailable={false}>
            <Header menuSections={[]} />
            <div className="container mx-auto px-4 mt-8 grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8">
                {is404 ? <NotFound /> : <UnexpectedError />}
              </div>
              <div className="md:col-span-4">
                <ErrorSidebar />
              </div>
            </div>
            <div className="mt-20" />
            <Footer />
          </TranslationProvider>
        </PveModeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
