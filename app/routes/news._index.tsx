import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { getNewsPosts, WpPost } from "~/utils/wordpress";
import { formatDate } from "~/utils/date";
import { decodeHtmlEntities } from "~/utils/htmlDecode";
import type { MetaFunction } from "@remix-run/node";

interface LoaderData {
  news: WpPost[];
  page: number;
  totalPages: number;
}

const isUpdatedWithinWeek = (dateString: string) => {
  const updatedAt = new Date(dateString);
  if (Number.isNaN(updatedAt.getTime())) {
    return false;
  }
  const now = Date.now();
  const diff = now - updatedAt.getTime();
  const weekInMs = 7 * 24 * 60 * 60 * 1000;
  return diff >= 0 && diff <= weekInMs;
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const pageParam = Number(url.searchParams.get("page"));
  const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : Math.floor(pageParam);
  const perPage = 20;

  try {
    const { posts: news, totalPages } = await getNewsPosts(perPage, page);
    return json({ news, page, totalPages });
  } catch {
    const fallback = await getNewsPosts(perPage, 1);
    return json({ news: fallback.posts, page: 1, totalPages: fallback.totalPages });
  }
};

export const meta: MetaFunction = () => [
  { title: "ニュース一覧 - MOFUCRAFT!!!" }
];

export default function News() {
  const { news, page, totalPages } = useLoaderData<LoaderData>();
  const safeTotalPages = Math.max(1, totalPages || 1);
  const hasPrev = page > 1;
  const hasNext = page < safeTotalPages;
  const showFeatured = page === 1 && news.length > 0;
  const gridItems = showFeatured ? news.slice(1) : news;

  return (
    <>
      <div className="w-full text-gray-900 dark:text-gray-100">
        {/* ヘッダーセクション */}
        <div className="bg-gradient-to-r from-blue-950 to-cyan-700 dark:from-blue-950 dark:to-cyan-900 text-white rounded-t-lg shadow-lg">
          <div className="p-6">
            <h1 className="text-5xl font-extrabold font-raleway text-white">News</h1>
            <p className="m-0 font-bold text-blue-50 dark:text-blue-100">運営チームよりMOFUCRAFTの最新情報をお届け！</p>
          </div>
        </div>

        {/* ニュースグリッド */}
        <div className="bg-gray-50 dark:bg-neutral-800 rounded-b-lg shadow-lg p-6">
          {news.length > 0 ? (
            <div className="space-y-6">
              {/* 最新記事 - フル幅 */}
              {showFeatured && news[0] && (
                <Link
                  key={news[0].id}
                  to={`/news/${news[0].id}`}
                  className="group block"
                >
                  <article className="bg-white dark:bg-neutral-700 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                    <div className="md:flex">
                      {/* 左側 - 画像エリア */}
                      <div className="md:w-1/3 relative">
                        {news[0]._embedded?.["wp:featuredmedia"]?.[0]?.source_url ? (
                          <img 
                            src={news[0]._embedded["wp:featuredmedia"][0].source_url}
                            alt={news[0]._embedded["wp:featuredmedia"][0].alt_text || ""}
                            className="w-full h-full object-cover min-h-[250px]"
                          />
                        ) : (
                          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 h-full min-h-[250px] flex items-center justify-center">
                            <span className="text-8xl font-bold text-white/20">NEWS</span>
                          </div>
                        )}
                        <div className="absolute top-4 left-4">
                          <span className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                            最新記事
                          </span>
                        </div>
                      </div>

                      {/* 右側 - コンテンツ */}
                      <div className="md:w-2/3 p-8">
                        {/* 日付と作成者 */}
                        <div className="text-sm text-gray-500 dark:text-gray-300 mb-4">
                          <div className="flex items-center gap-4 mb-1">
                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-200">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {formatDate(news[0].date)}
                            </span>
                            {news[0].modified !== news[0].date && (
                              <span className="flex items-center gap-1 text-blue-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {formatDate(news[0].modified)}
                              </span>
                            )}
                          </div>
                          {news[0]._embedded?.author?.[0] && (
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                              {news[0]._embedded.author[0].avatar_urls?.["24"] ? (
                                <img 
                                  src={news[0]._embedded.author[0].avatar_urls["24"]}
                                  alt={news[0]._embedded.author[0].name}
                                  className="w-5 h-5 rounded-full"
                                />
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              )}
                              <span>{news[0]._embedded.author[0].name}</span>
                            </div>
                          )}
                        </div>

                        {/* カテゴリ */}
                        {news[0]._embedded?.["wp:term"]?.[0]?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {news[0]._embedded["wp:term"][0].map((cat) => (
                              <span key={cat.id} className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                                {cat.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* タイトル */}
                        <h2 className="text-lg md:text-2xl font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-4">
                          {decodeHtmlEntities(news[0].title.rendered)}
                        </h2>

                        {/* 抜粋 */}
                        {news[0].excerpt && news[0].excerpt.rendered && (
                          <p className="text-gray-600 dark:text-gray-300 line-clamp-4 mb-6">
                            {decodeHtmlEntities(news[0].excerpt.rendered.replace(/<[^>]*>/g, ''))}
                          </p>
                        )}

                        {/* 続きを読むリンク */}
                        <div className="flex items-center text-blue-600 dark:text-blue-500 font-medium group-hover:text-blue-700 dark:group-hover:text-blue-300 align-middle">
                          <span className="flex items-center h-5">続きを読む</span>
                          <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform flex-shrink-0 self-center" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              )}

              {/* 2番目以降の記事 - 2列 */}
              {gridItems.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2">
                  {gridItems.map((item, index) => {
                    const placeholderNumber = showFeatured ? index + 2 : index + 1;
                    const showUpdateBadge =
                      item.modified !== item.date && isUpdatedWithinWeek(item.modified);
                    return (
                      <Link
                        key={item.id}
                        to={`/news/${item.id}`}
                        className="group"
                      >
                        <article className="h-full bg-white dark:bg-neutral-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                        {/* 記事番号バッジ */}
                        <div className="relative h-48 overflow-hidden">
                          {item._embedded?.["wp:featuredmedia"]?.[0]?.source_url ? (
                            <img 
                              src={item._embedded["wp:featuredmedia"][0].source_url}
                              alt={item._embedded["wp:featuredmedia"][0].alt_text || ""}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 h-full flex items-center justify-center">
                              <span className="text-6xl font-bold text-gray-300 dark:text-gray-700">#{placeholderNumber}</span>
                            </div>
                          )}
                          {showUpdateBadge && (
                            <div className="absolute top-2 right-2">
                              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                                更新
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="p-5">
                          {/* 日付と作成者 */}
                          <div className="text-sm text-gray-500 dark:text-gray-300 mb-3">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-200">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(item.date)}
                              </span>
                              {item.modified !== item.date && (
                                <span className="flex items-center gap-1 text-blue-500 dark:text-blue-300">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  {formatDate(item.modified)}
                                </span>
                              )}
                            </div>
                            {item._embedded?.author?.[0] && (
                              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                {item._embedded.author[0].avatar_urls?.["24"] ? (
                                  <img 
                                    src={item._embedded.author[0].avatar_urls["24"]}
                                    alt={item._embedded.author[0].name}
                                    className="w-5 h-5 rounded-full"
                                  />
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7-7h14a7 7 0 00-7-7z" />
                                  </svg>
                                )}
                                <span>{item._embedded.author[0].name}</span>
                              </div>
                            )}
                          </div>

                          {/* カテゴリ */}
                          {item._embedded?.["wp:term"]?.[0]?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {item._embedded["wp:term"][0].map((cat) => (
                                <span key={cat.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                                  {cat.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* タイトル */}
                          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                            {decodeHtmlEntities(item.title.rendered)}
                          </h2>

                          {/* 抜粋 */}
                          {item.excerpt && item.excerpt.rendered && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                              {decodeHtmlEntities(item.excerpt.rendered.replace(/<[^>]*>/g, ''))}
                            </p>
                          )}

                          {/* 続きを読むリンク */}
                          <div className="mt-4 flex items-center text-blue-600 dark:text-blue-500 font-medium text-sm group-hover:text-blue-700 dark:group-hover:text-blue-300">
                            <span>続きを読む</span>
                            <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </article>
                    </Link>
                  );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600 dark:text-gray-300">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <p className="mt-4 text-gray-500 dark:text-gray-300">まだニュースがありません</p>
            </div>
          )}
        </div>

        {/* ページネーション */}
        <div className="mt-6 flex justify-center">
          <nav className="flex items-center gap-2">
            {hasPrev ? (
              <Link
                to={`?page=${page - 1}`}
                prefetch="intent"
                className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
              >
                前へ
              </Link>
            ) : (
              <span className="px-4 py-2 bg-gray-200 dark:bg-neutral-700 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed">
                前へ
              </span>
            )}
            <span className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white dark:text-blue-100 rounded-lg">
              {page} / {safeTotalPages}
            </span>
            {hasNext ? (
              <Link
                to={`?page=${page + 1}`}
                prefetch="intent"
                className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
              >
                次へ
              </Link>
            ) : (
              <span className="px-4 py-2 bg-gray-200 dark:bg-neutral-700 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed">
                次へ
              </span>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
