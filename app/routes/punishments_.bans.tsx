import { json, LoaderFunction, MetaFunction } from "@remix-run/node";
import { useLoaderData, Link, useSearchParams } from "@remix-run/react";
import { fetchAllPunishments, countAllPunishments } from "~/utils/ban.server";
import { useEffect, useRef } from "react";
import { hapticTap } from "~/utils/haptic";

export const meta: MetaFunction = () => [
  { title: "処罰履歴 - MOFUCRAFT!!!" }
];

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const type = url.searchParams.get('type') || 'all';
    const limit = 30;

    const [punishments, allCounts, filteredCounts] = await Promise.all([
      fetchAllPunishments(page, limit, type),
      countAllPunishments(),
      countAllPunishments(type)
    ]);
    const totalPages = Math.ceil(filteredCounts.total / limit);

    return json(
      { punishments, allCounts, filteredCounts, currentPage: page, totalPages, currentType: type, limit, error: null },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
        }
      }
    );
  } catch (error) {
    console.error("処罰データ取得エラー:", error);
    return json({ punishments: [], allCounts: { ban: 0, kick: 0, warn: 0, total: 0 }, filteredCounts: { ban: 0, kick: 0, warn: 0, total: 0 }, currentPage: 1, totalPages: 1, currentType: 'all', limit: 30, error: "処罰データの取得に失敗しました" });
  }
};

export default function PunishmentsPage() {
  const data = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollPositionRef = useRef<number>(0);

  // スクロール位置を保存・復元
  useEffect(() => {
    // ページ読み込み後にスクロール位置を復元
    const timeoutId = setTimeout(() => {
      if (scrollPositionRef.current > 0) {
        window.scrollTo(0, scrollPositionRef.current);
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [data.currentType]);

  // フィルター変更関数
  const changeFilter = (type: string) => {
    hapticTap();
    // 現在のスクロール位置を保存
    scrollPositionRef.current = window.scrollY;
    
    try {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('type', type);
      newSearchParams.delete('page'); // フィルター変更時はページをリセット
      setSearchParams(newSearchParams);
    } catch (error) {
      // フォールバック: 直接ナビゲーション
      window.location.href = `${window.location.pathname}?type=${type}`;
    }
  };

  // ページネーション関数
  const goToPage = (page: number) => {
    hapticTap();
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', page.toString());
    setSearchParams(newSearchParams);
  };

  if (data.error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h2 className="text-xl font-bold text-red-800 dark:text-red-300">エラーが発生しました</h2>
              <p className="text-red-700 dark:text-red-400 mt-1">{data.error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto">
        {/* ヘッダーセクション */}
        <div className="bg-gradient-to-r from-red-900 to-red-600 dark:from-red-950 dark:to-red-700 text-white rounded-t-lg shadow-lg">
          <div className="p-6">
            <h1 className="text-5xl font-extrabold font-raleway">処罰リスト</h1>
            <p className="mt-2 font-bold text-red-100 dark:text-red-50">MOFUCRAFT!!!全サーバーの処罰履歴を確認できます。</p>
          </div>
        </div>

        {/* 処罰リストコンテンツ */}
        <div className="bg-gray-50 dark:bg-neutral-800 rounded-b-lg shadow-lg p-6">

          {/* フィルターボタン */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  changeFilter('all');
                }}
                type="button"
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  data.currentType === 'all'
                    ? 'bg-gray-800 dark:bg-gray-700 text-white'
                    : 'bg-white dark:bg-neutral-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-600'
                }`}
              >
                すべて ({data.allCounts.total})
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  changeFilter('ban');
                }}
                type="button"
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  data.currentType === 'ban'
                    ? 'bg-red-600 dark:bg-red-700 text-white'
                    : 'bg-white dark:bg-neutral-700 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30'
                }`}
              >
                BAN ({data.allCounts.ban})
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  changeFilter('kick');
                }}
                type="button"
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  data.currentType === 'kick'
                    ? 'bg-orange-600 dark:bg-orange-700 text-white'
                    : 'bg-white dark:bg-neutral-700 text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                }`}
              >
                KICK ({data.allCounts.kick})
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  changeFilter('warn');
                }}
                type="button"
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  data.currentType === 'warn'
                    ? 'bg-yellow-600 dark:bg-yellow-700 text-white'
                    : 'bg-white dark:bg-neutral-700 text-yellow-600 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'
                }`}
              >
                警告 ({data.allCounts.warn})
              </button>
            </div>
          </div>

          {/* 注意事項 */}
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-semibold mb-1">処罰に関する注意</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>処罰への異議申し立ては、公式Discordサーバーにて運営チームにお問い合わせください。</li>
                  <li>IP BANが有効な場合は、同じIPアドレスからの接続が全て拒否されます。</li>
                </ul>
              </div>
            </div>
          </div>

          {data.punishments.length > 0 ? (
            <div className="bg-white dark:bg-neutral-700 rounded-lg shadow overflow-hidden mt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-neutral-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        被プレイヤー
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        種類
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        日時
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        詳細
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-neutral-600">
                    {data.punishments.map((punishment: any) => (
                      <tr
                        key={`${punishment.type}-${punishment.id}`}
                        className="hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors"
                      >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <img
                                src={`https://mc-heads.net/avatar/${punishment.uuid || "Steve"}/32`}
                                alt={punishment.name || "Unknown"}
                                className="w-8 h-8 rounded-md shadow-sm"
                              />
                              <div>
                                <Link
                                  to={`/players/${punishment.uuid}`}
                                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                                >
                                  {punishment.name || "Unknown"}
                                </Link>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              punishment.type === 'ban' ? 'bg-white dark:bg-neutral-800 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700' :
                              punishment.type === 'kick' ? 'bg-white dark:bg-neutral-800 text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-700' :
                              'bg-white dark:bg-neutral-800 text-yellow-600 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700'
                            }`}>
                              {punishment.type === 'ban' ? 'BAN' : punishment.type === 'kick' ? 'KICK' : '警告'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700 dark:text-gray-200">
                              <div>
                                {new Date(punishment.banned_at || punishment.kicked_at || punishment.warned_at).toLocaleDateString('ja-JP', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              <div className="mt-1">
                                {punishment.type === 'ban' && (
                                  <>
                                    {punishment.active ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200">
                                        有効
                                      </span>
                                    ) : (punishment.expires_at > 0 && punishment.expires_at < Date.now()) ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">
                                        期限切れ
                                      </span>
                                    ) : punishment.removed_by_name ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                                        手動解除
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                        無効
                                      </span>
                                    )}
                                  </>
                                )}
                                {punishment.type === 'kick' && (
                                  <span className="text-gray-500 dark:text-gray-400">
                                    -
                                  </span>
                                )}
                                {punishment.type === 'warn' && (
                                  <>
                                    {punishment.active ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200">
                                        有効
                                      </span>
                                    ) : (punishment.until > 0 && punishment.until < Date.now()) ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">
                                        期限切れ
                                      </span>
                                    ) : punishment.removed_by_name ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                                        手動取り消し
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                        無効
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Link
                              to={`/punishments/${punishment.type}/${punishment.id}`}
                              className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-700 rounded-lg p-12 text-center mt-6">
              <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
                {data.currentType === 'all'
                  ? '現在処罰されているプレイヤーはいません'
                  : `現在${data.currentType === 'ban' ? 'BAN' : data.currentType === 'kick' ? 'KICK' : '警告'}されているプレイヤーはいません`}
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {data.currentType === 'all'
                  ? '健全なサーバー環境が保たれています'
                  : 'フィルターを変更して他の処罰タイプを確認してください'}
              </p>
            </div>
          )}

          {/* ページネーション */}
          {data.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => goToPage(data.currentPage - 1)}
                disabled={data.currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-600 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                前のページ
              </button>

              <div className="flex gap-1">
                {/* ページ番号ボタン */}
                {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                  let pageNum;
                  if (data.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (data.currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (data.currentPage >= data.totalPages - 2) {
                    pageNum = data.totalPages - 4 + i;
                  } else {
                    pageNum = data.currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg ${
                        pageNum === data.currentPage
                          ? 'bg-blue-600 dark:bg-blue-700 text-white'
                          : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-600 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => goToPage(data.currentPage + 1)}
                disabled={data.currentPage === data.totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-600 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次のページ
              </button>
            </div>
          )}

          {/* ページ情報 */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-300 mt-4">
            {data.filteredCounts.total}件中 {(data.currentPage - 1) * 30 + 1}〜{Math.min(data.currentPage * 30, data.filteredCounts.total)}件を表示
            {data.totalPages > 1 && ` (${data.currentPage}/${data.totalPages}ページ)`}
          </div>
        </div>
      </div>
    </>
  );
}