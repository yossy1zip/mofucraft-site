import { LoaderFunction, MetaFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { fetchMoneyRanking } from "~/utils/money.server";
import { formatMoney } from "~/utils/money";

export const meta: MetaFunction = () => [
  { title: "所持金ランキング - MOFUCRAFT!!!" }
];

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = 30;
    
    const ranking = await fetchMoneyRanking(limit);
    
    return Response.json({ 
      ranking,
      currentPage: page,
      totalPages: 1, // 現在は1ページのみ
      limit,
      error: null 
    });
  } catch (error) {
    console.error("所持金ランキング取得エラー:", error);
    return Response.json({ 
      ranking: [],
      currentPage: 1,
      totalPages: 1,
      limit: 30,
      error: "所持金ランキングの取得に失敗しました" 
    });
  }
};

export default function MoneyRankingPage() {
  const { ranking, error } = useLoaderData<typeof loader>();

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h2 className="text-xl font-bold text-red-800 dark:text-red-200">エラーが発生しました</h2>
              <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto text-gray-900 dark:text-gray-100">
        {/* ヘッダーセクション */}
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 dark:from-yellow-700 dark:to-yellow-600 text-white rounded-t-lg shadow-lg">
          <div className="p-6">
            <h1 className="text-5xl font-extrabold font-raleway">所持金ランキング</h1>
            <p className="mt-2 font-bold text-yellow-100 dark:text-yellow-200">MOFUCRAFTサーバーのプレイヤー所持金ランキング</p>
          </div>
        </div>

        {/* 所持金ランキングコンテンツ */}
        <div className="bg-gray-50 dark:bg-neutral-800 rounded-b-lg shadow-lg p-6">
          {/* 注意事項 */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-1">ランキングについて</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>サーバー内の経済システムによる所持金を基にランキング化しています</li>
                  <li>データは定期的に更新されます</li>
                  <li>プレイヤー名が表示されない場合は、履歴データから取得しています</li>
                </ul>
              </div>
            </div>
          </div>

          {ranking.length > 0 ? (
            <div className="bg-white dark:bg-neutral-700 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-neutral-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        順位
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        プレイヤー
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        所持金
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-neutral-600">
                    {ranking.map((player: any) => (
                      <tr
                        key={player.id}
                        className="hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-lg font-bold ${
                              player.rank === 1 ? 'text-yellow-600 dark:text-yellow-400' :
                              player.rank === 2 ? 'text-gray-500 dark:text-gray-400' :
                              player.rank === 3 ? 'text-amber-600 dark:text-amber-500' :
                              'text-gray-700 dark:text-gray-200'
                            }`}>
                              {player.rank}位
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <img
                              src={`https://mc-heads.net/avatar/${player.uuid || "Steve"}/32`}
                              alt={player.name}
                              className="w-8 h-8 rounded-md shadow-sm"
                            />
                            <div>
                              <Link
                                to={`/players/${player.uuid}`}
                                className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                              >
                                {player.name || "Unknown"}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            {(() => {
                              const money = formatMoney(player.balance);
                              return (
                                <>
                                  {money.integer}
                                  <span className="text-sm text-green-400 dark:text-green-500">.{money.decimal}</span>
                                  {' '}MOFU
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-700 rounded-lg p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
                所持金データがありません
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                データが準備でき次第、ランキングが表示されます
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}