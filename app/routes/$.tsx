import type { MetaFunction } from "@remix-run/node";
import { json, LoaderFunction, redirect } from "@remix-run/node";
import { isRouteErrorResponse, Link, useLoaderData, useRouteError } from "@remix-run/react";
import { getWikiPage, type WikiPage } from "~/utils/wikijs.server";
import { extractTocAndContentWithH1H2Toc, TocNav, WikiContentRenderer } from "~/components/wpRenderer";
import { formatDate } from "~/utils/date";
import { decodeHtmlEntities } from "~/utils/htmlDecode";
import { findClosestSlug } from "~/utils/slug-matcher";
import NotFound from "~/components/NotFound";

export const handle = { layout: "wiki" };

const EXCLUDED_SLUGS = new Set([
  "news", "punishments", "players", "staff", "donators",
  "miscs", "weapons", "communities", "store", "map", "about", "guide",
]);

const WIKIJS_BASE = process.env.WIKIJS_URL || "https://wiki.example.com";

function processWikiHtml(html: string, baseUrl: string): string {
  // 相対パスの画像URLを絶対URLに変換
  let processed = html.replace(
    /<img([^>]+?)src=(["'])(?!https?:\/\/|\/\/|data:)([^"']+)\2/gi,
    (match, attrs, quote, src) => {
      const absoluteSrc = src.startsWith("/") ? `${baseUrl}${src}` : `${baseUrl}/${src}`;
      return `<img${attrs}src=${quote}${absoluteSrc}${quote}`;
    }
  );
  // ¶ アンカーリンク（記号のみを含む <a>、または toc-anchor / header-anchor クラス）を削除
  processed = processed
    .replace(/<a\b[^>]*>\s*[¶§]\s*<\/a>/gi, "")
    .replace(/<a[^>]*class=["'][^"']*toc-anchor[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, "")
    .replace(/<a[^>]*class=["'][^"']*header-anchor[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, "");
  // [!TYPE] 形式のblockquote（Visual Editor記法）を is-* クラスに変換
  const alertTypeMap: Record<string, string> = {
    INFO: "is-info", NOTE: "is-info",
    TIP: "is-success", SUCCESS: "is-success",
    WARNING: "is-warning", CAUTION: "is-warning", IMPORTANT: "is-warning",
    DANGER: "is-danger", ERROR: "is-danger",
  };
  processed = processed.replace(
    /<blockquote[^>]*>\s*<p>\s*\[!(INFO|NOTE|TIP|SUCCESS|WARNING|CAUTION|IMPORTANT|DANGER|ERROR)\](?:\s*<br\s*\/?>)?([\s\S]*?)<\/p>([\s\S]*?)<\/blockquote>/gi,
    (_match, type, restOfFirstP, remaining) => {
      const alertClass = alertTypeMap[type.toUpperCase()];
      const firstPRest = restOfFirstP.trim();
      const inner = firstPRest ? `<p>${firstPRest}</p>${remaining}` : remaining;
      return `<blockquote class="${alertClass}">${inner}</blockquote>`;
    }
  );
  return processed;
}

export const loader: LoaderFunction = async ({ params }) => {
  const slug = params["*"];
  if (!slug) throw new Response("Not Found", { status: 404 });

  const firstSegment = slug.split("/")[0];
  if (EXCLUDED_SLUGS.has(firstSegment)) {
    throw new Response("Not Found", { status: 404 });
  }

  let page: WikiPage | null = null;
  try {
    page = await getWikiPage(slug);
  } catch (error) {
    console.error("getWikiPage failed:", error);
  }

  if (!page) {
    try {
      const closestMatch = await findClosestSlug(slug);
      if (closestMatch && closestMatch !== `/${slug}`) {
        return redirect(closestMatch, 301);
      }
    } catch (error) {
      console.error("findClosestSlug failed:", error);
    }
    throw new Response("Not Found", { status: 404 });
  }

  const decodedTitle = decodeHtmlEntities(page.title || "");

  return json(
    {
      page: {
        ...page,
        title: decodedTitle,
        render: processWikiHtml(page.render ?? "", WIKIJS_BASE),
        updatedAt: page.updatedAt ?? "",
      },
      pageTitle: decodedTitle,
      editUrl: `${WIKIJS_BASE}/e/ja/${page.path}`,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  );
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.page) {
    return [{ title: "MOFUCRAFT!!!" }];
  }

  return [
    { title: `${data.page.title} - MOFUCRAFT!!!` },
    { name: "modified", content: data.page.updatedAt },
  ];
};

export default function WikiSplatPage() {
  const { page, editUrl } = useLoaderData<{ page: WikiPage; editUrl: string }>();
  const { tocItems, newHtml } = extractTocAndContentWithH1H2Toc(page?.render);

  return (
    <article className="min-w-0">
      <div className="bg-gradient-to-r from-amber-600 to-orange-500 text-white rounded-t-lg shadow-lg">
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold font-raleway mb-4">
              {page.title}
            </h1>
            <a
              href={editUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm px-3 py-1.5 rounded-md transition-colors backdrop-blur-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Wikiで編集
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-amber-50">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>最終更新: {page.updatedAt ? formatDate(page.updatedAt) : "-"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-b-lg shadow-lg">
        <div className="p-6 md:p-8">
          <TocNav tocItems={tocItems} variant="amber" />
          <WikiContentRenderer content={newHtml} variant="amber" />
        </div>
      </div>
    </article>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  if (is404) {
    return <NotFound />;
  }

  console.error("Wiki page error:", error);

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8 text-center">
      <svg className="mx-auto h-16 w-16 text-amber-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
        ページを読み込めませんでした
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Wiki への接続が一時的に失敗した可能性があります。少し時間を置いてから再度お試しください。
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        ホームへ戻る
      </Link>
    </div>
  );
}
