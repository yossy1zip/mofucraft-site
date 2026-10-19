import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getNewsPostById, WpPost, getTopNews } from "~/utils/wordpress";
import { formatDate } from "~/utils/date";
import { decodeHtmlEntities } from "~/utils/htmlDecode";
import { extractTocAndContentWithH1H2Toc, WpContentRenderer } from "~/components/wpRenderer";
import { getMcServerStatus } from "~/utils/mcquery";
import { getEvents } from "~/utils/discord";
import { fetchTopMoneyRanking } from "~/utils/money.server";
import type { MetaFunction } from "@remix-run/node";

export const handle = { layout: "wiki" };

export const loader: LoaderFunction = async ({ params }) => {
  const { newsId } = params;
  if (!newsId) throw new Response("Not Found", { status: 404 });

  const post = await getNewsPostById(Number(newsId));
  if (!post) throw new Response("Not Found", { status: 404 });

  const [news, status, events, moneyRanking] = await Promise.all([
    getTopNews(15).catch(() => []),
    getMcServerStatus().catch(() => null),
    getEvents().catch(() => []),
    fetchTopMoneyRanking(10).catch(() => []),
  ]);
  const { tocItems, newHtml } = extractTocAndContentWithH1H2Toc(post.content?.rendered ?? "");

  return json({ post, news, status, events, moneyRanking, page: { render: post.content?.rendered ?? "", tocItems, newHtml } });
};

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  {
    title: data?.post
      ? `${decodeHtmlEntities(data.post.title.rendered)} - MOFUCRAFT!!!`
      : "ニュース - MOFUCRAFT!!!"
  }
];

export default function NewsArticle() {
  const { post } = useLoaderData<{ post: WpPost }>();
  const { newHtml } = extractTocAndContentWithH1H2Toc(post.content?.rendered ?? "");

  return (
    <article className="min-w-0">
      {/* ヘッダーセクション */}
      <div className="bg-gradient-to-r from-blue-950 to-cyan-700 text-white rounded-t-lg shadow-lg">
        <div className="p-6">
          {/* カテゴリ */}
          {post._embedded?.["wp:term"]?.[0]?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post._embedded["wp:term"][0].map((cat) => (
                <span key={cat.id} className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-white/20 text-white">
                  {cat.name}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-2xl md:text-3xl font-extrabold font-raleway mb-4">
            {decodeHtmlEntities(post.title.rendered)}
          </h1>

          {/* メタ情報 */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-blue-100">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>投稿日: {formatDate(post.date)}</span>
            </div>

            {post.modified !== post.date && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>更新日: {formatDate(post.modified)}</span>
              </div>
            )}

            {post._embedded?.author?.[0] && (
              <div className="flex items-center gap-2">
                {post._embedded.author[0].avatar_urls?.["24"] ? (
                  <img
                    src={post._embedded.author[0].avatar_urls["24"]}
                    alt={post._embedded.author[0].name}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7-7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                <span>投稿者: {post._embedded.author[0].name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* コンテンツセクション */}
      <div className="bg-white dark:bg-neutral-800 rounded-b-lg shadow-lg">
        {/* 記事本文 */}
        <div className="p-6 md:p-8">
          {/* ページ内容 */}
          <WpContentRenderer content={newHtml} variant="blue" />
        </div>
      </div>
    </article>
  );
}