import { LoaderFunction, MetaFunction } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faCrosshairs,
  faDragon,
  faSkull,
  faPersonWalking,
  faBolt,
  faArrowUp,
  faChartBar,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { fetchStatRanking, StatRankingEntry } from "~/utils/playerstats.server";

export const meta: MetaFunction = () => [
  { title: "ゲーム内ランキング - MOFUCRAFT!!!" },
];

// ランキング定義
const RANKING_TABS = [
  {
    id: "play_time",
    label: "プレイタイム",
    section: "minecraft:custom" as const,
    stat: "minecraft:play_time",
    icon: faClock as IconDefinition,
    color: "from-blue-600 to-blue-500",
    darkColor: "dark:from-blue-700 dark:to-blue-600",
    accent: "blue",
    unit: (v: number) => formatPlayTime(v),
    description: "累計プレイ時間ランキング",
  },
  {
    id: "player_kills",
    label: "PvPキル",
    section: "minecraft:custom" as const,
    stat: "minecraft:player_kills",
    icon: faCrosshairs as IconDefinition,
    color: "from-red-600 to-red-500",
    darkColor: "dark:from-red-700 dark:to-red-600",
    accent: "red",
    unit: (v: number) => `${v.toLocaleString()} キル`,
    description: "プレイヤーキル数ランキング",
  },
  {
    id: "mob_kills",
    label: "モブキル",
    section: "minecraft:custom" as const,
    stat: "minecraft:mob_kills",
    icon: faDragon as IconDefinition,
    color: "from-orange-600 to-orange-500",
    darkColor: "dark:from-orange-700 dark:to-orange-600",
    accent: "orange",
    unit: (v: number) => `${v.toLocaleString()} キル`,
    description: "モブキル数ランキング",
  },
  {
    id: "deaths",
    label: "死亡回数",
    section: "minecraft:custom" as const,
    stat: "minecraft:deaths",
    icon: faSkull as IconDefinition,
    color: "from-gray-600 to-gray-500",
    darkColor: "dark:from-gray-700 dark:to-gray-600",
    accent: "gray",
    unit: (v: number) => `${v.toLocaleString()} 回`,
    description: "死亡回数ランキング",
  },
  {
    id: "walk_one_cm",
    label: "歩行距離",
    section: "minecraft:custom" as const,
    stat: "minecraft:walk_one_cm",
    icon: faPersonWalking as IconDefinition,
    color: "from-green-600 to-green-500",
    darkColor: "dark:from-green-700 dark:to-green-600",
    accent: "green",
    unit: (v: number) => formatDistance(v),
    description: "総歩行距離ランキング",
  },
  {
    id: "damage_dealt",
    label: "ダメージ",
    section: "minecraft:custom" as const,
    stat: "minecraft:damage_dealt",
    icon: faBolt as IconDefinition,
    color: "from-purple-600 to-purple-500",
    darkColor: "dark:from-purple-700 dark:to-purple-600",
    accent: "purple",
    unit: (v: number) => `${(v / 10).toLocaleString()} HP`,
    description: "与ダメージ合計ランキング",
  },
  {
    id: "jump",
    label: "ジャンプ",
    section: "minecraft:custom" as const,
    stat: "minecraft:jump",
    icon: faArrowUp as IconDefinition,
    color: "from-yellow-500 to-yellow-400",
    darkColor: "dark:from-yellow-600 dark:to-yellow-500",
    accent: "yellow",
    unit: (v: number) => `${v.toLocaleString()} 回`,
    description: "ジャンプ回数ランキング",
  },
] as const;

type TabId = (typeof RANKING_TABS)[number]["id"];

function formatPlayTime(ticks: number): string {
  const totalSeconds = Math.floor(ticks / 20);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const h = hours % 24;
    return `${days}日 ${h}時間 ${minutes}分`;
  }
  return `${hours}時間 ${minutes}分`;
}

function formatDistance(cm: number): string {
  const km = cm / 100000;
  if (km >= 1) return `${km.toFixed(1)} km`;
  const m = cm / 100;
  return `${m.toFixed(0)} m`;
}

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const tabId = (url.searchParams.get("stat") as TabId) || "play_time";
  const tab = RANKING_TABS.find((t) => t.id === tabId) ?? RANKING_TABS[0];

  try {
    const ranking = await fetchStatRanking(tab.section, tab.stat, 30);
    return Response.json({ ranking, tabId: tab.id, error: null });
  } catch (err) {
    console.error("ランキング取得エラー:", err);
    return Response.json({ ranking: [], tabId: tab.id, error: "ランキングの取得に失敗しました" });
  }
};

const ACCENT_COLORS: Record<string, { value: string; medal: (r: number) => string; badge: string }> = {
  blue:   { value: "text-blue-600 dark:text-blue-400",   medal: medalColor, badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  red:    { value: "text-red-600 dark:text-red-400",     medal: medalColor, badge: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  orange: { value: "text-orange-600 dark:text-orange-400", medal: medalColor, badge: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" },
  gray:   { value: "text-gray-600 dark:text-gray-400",   medal: medalColor, badge: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" },
  green:  { value: "text-green-600 dark:text-green-400", medal: medalColor, badge: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
  purple: { value: "text-purple-600 dark:text-purple-400", medal: medalColor, badge: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" },
  yellow: { value: "text-yellow-600 dark:text-yellow-400", medal: medalColor, badge: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" },
};

function medalColor(rank: number): string {
  if (rank === 1) return "text-yellow-500 dark:text-yellow-400";
  if (rank === 2) return "text-gray-400 dark:text-gray-300";
  if (rank === 3) return "text-amber-600 dark:text-amber-500";
  return "text-gray-500 dark:text-gray-400";
}

function medalBg(rank: number): string {
  if (rank === 1) return "bg-yellow-50 dark:bg-yellow-900/20";
  if (rank === 2) return "bg-gray-50 dark:bg-gray-700/30";
  if (rank === 3) return "bg-amber-50 dark:bg-amber-900/20";
  return "";
}

function medalLabel(rank: number): string {
  return `${rank}`;
}

export default function RankingsPage() {
  const { ranking, tabId, error } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  const currentTab = RANKING_TABS.find((t) => t.id === tabId) ?? RANKING_TABS[0];
  const accentColors = ACCENT_COLORS[currentTab.accent] ?? ACCENT_COLORS.blue;

  return (
    <div className="max-w-6xl mx-auto text-gray-900 dark:text-gray-100">
      {/* ヘッダー */}
      <div className={`bg-gradient-to-r ${currentTab.color} ${currentTab.darkColor} text-white rounded-t-lg shadow-lg`}>
        <div className="p-6">
          <h1 className="text-5xl font-extrabold font-raleway flex items-center gap-4">
            <FontAwesomeIcon icon={currentTab.icon} className="w-9 h-9 opacity-90" />
            ゲーム内ランキング
          </h1>
          <p className="mt-2 font-bold text-white/80">{currentTab.description}</p>
        </div>

        {/* タブ */}
        <div className="px-6 pb-0 flex flex-wrap gap-1">
          {RANKING_TABS.map((tab) => (
            <Link
              key={tab.id}
              to={`?stat=${tab.id}`}
              className={`px-3 py-2 rounded-t-lg text-sm font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                tab.id === tabId
                  ? "bg-white text-gray-800 shadow"
                  : "text-white/80 hover:bg-white/20"
              }`}
            >
              <FontAwesomeIcon icon={tab.icon} className="w-3.5 h-3.5" />
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="bg-gray-50 dark:bg-neutral-800 rounded-b-lg shadow-lg p-6">
        {error ? (
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
        ) : ranking.length > 0 ? (
          <>
            {/* TOP 3 カード */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {ranking.slice(0, 3).map((entry: StatRankingEntry) => (
                <Link
                  key={entry.uuid}
                  to={`/players/${entry.uuid}`}
                  className={`relative rounded-xl shadow p-5 flex flex-col items-center text-center hover:shadow-md transition-shadow ${medalBg(entry.position)} bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 ${entry.position === 1 ? 'ring-2 ring-yellow-400 dark:ring-yellow-500' : ''}`}
                >
                  <div className={`text-2xl font-black mb-2 ${medalColor(entry.position)}`}>{medalLabel(entry.position)}</div>
                  <img
                    src={`https://mc-heads.net/avatar/${entry.uuid}/64`}
                    alt={entry.name}
                    className="w-16 h-16 rounded-lg shadow mb-3"
                  />
                  {entry.online && (
                    <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-green-400 rounded-full ring-2 ring-white dark:ring-neutral-700" title="オンライン" />
                  )}
                  <p className="font-bold text-gray-800 dark:text-gray-100 truncate w-full">{entry.name}</p>
                  <p className={`text-sm font-semibold mt-1 ${accentColors.value}`}>
                    {currentTab.unit(entry.value)}
                  </p>
                </Link>
              ))}
            </div>

            {/* 全リスト */}
            {ranking.length > 3 && (
              <div className="bg-white dark:bg-neutral-700 rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-neutral-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-16">順位</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">プレイヤー</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{currentTab.label}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-neutral-600">
                    {ranking.slice(3).map((entry: StatRankingEntry) => (
                      <tr key={entry.uuid} className="hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-base font-bold text-gray-500 dark:text-gray-400">
                            {entry.position}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={`https://mc-heads.net/avatar/${entry.uuid}/32`}
                                alt={entry.name}
                                className="w-8 h-8 rounded-md shadow-sm"
                              />
                              {entry.online && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full ring-1 ring-white dark:ring-neutral-700" />
                              )}
                            </div>
                            <Link
                              to={`/players/${entry.uuid}`}
                              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {entry.name}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className={`font-bold ${accentColors.value}`}>
                            {currentTab.unit(entry.value)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-neutral-700 rounded-lg p-12 text-center">
            <FontAwesomeIcon icon={faChartBar} className="text-6xl text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">データがありません</p>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              PlayerStats APIが設定されていないか、まだデータがありません
            </p>
          </div>
        )}

        {/* 注意事項 */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p className="font-semibold">ランキングについて</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Minecraftのバニラ統計データをもとにしています</li>
                <li>データは定期的に更新されます（約5分ごと）</li>
                <li>緑の点はオンラインプレイヤーを示しています</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
