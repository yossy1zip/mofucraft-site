import { Link, useLoaderData } from "@remix-run/react";
import { json, MetaFunction } from "@remix-run/node";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins, faClock, faPersonWalking, faGun, faSkull, faBolt } from "@fortawesome/free-solid-svg-icons";
import { getTopNews } from '~/utils/wordpress';
import { decodeHtmlEntities } from '~/utils/htmlDecode';
import { getEvents, Event } from '~/utils/discord';
import { fetchTopMoneyRanking } from '~/utils/money.server';
import { fetchStatRanking, StatRankingEntry } from '~/utils/playerstats.server';
import { fetchDpsRanking, DpsRankingEntry } from '~/utils/dps.server';
import { fetchKillCountRanking, fetchWeaponUsedRanking, PveRankingPeriod, KillCountRankingEntry, WeaponUsedRankingEntry } from '~/utils/pve.server';
import { getAllStaffMembers } from '~/utils/luckperms.server';
import { formatMoney } from '~/utils/money';
import { formatDate } from '~/utils/date';
import { linkifyText } from '~/utils/linkify';
import { usePveMode } from '~/contexts/PveModeContext';

export const meta: MetaFunction = () => [
  { title: "MOFUCRAFT!!!" },
  { name: "description", content: "日本のマインクラフトサーバー「MOFUCRAFT!!!」の公式ウェブサイトです。" }
];

export const loader = async () => {
  let events: Event[] = [];
  let news: any[] = [];
  let moneyRanking: Awaited<ReturnType<typeof fetchTopMoneyRanking>> = [];
  let playTimeRanking: StatRankingEntry[] = [];
  let walkRanking: StatRankingEntry[] = [];
  let dpsRanking: DpsRankingEntry[] = [];
  let killCountRanking: Record<PveRankingPeriod, KillCountRankingEntry[]> = { day: [], week: [], month: [], total: [] };
  let weaponUsedRanking: Record<PveRankingPeriod, WeaponUsedRankingEntry[]> = { day: [], week: [], month: [], total: [] };
  let topStaff: Array<{ uuid: string; username: string | null; staff_role: string | null }> = [];
  try {
    events = await getEvents();
  } catch (error) {
    console.error("Failed to load Discord events:", error);
  }
  try {
    news = await getTopNews(15);
  } catch (error) {
    console.error("Failed to load news:", error);
  }
  try {
    moneyRanking = await fetchTopMoneyRanking(3);
  } catch (error) {
    console.error("Failed to load money ranking:", error);
  }
  try {
    playTimeRanking = await fetchStatRanking("minecraft:custom", "minecraft:play_time", 3);
  } catch (error) {
    console.error("Failed to load play time ranking:", error);
  }
  try {
    walkRanking = await fetchStatRanking("minecraft:custom", "minecraft:walk_one_cm", 3);
  } catch (error) {
    console.error("Failed to load walk ranking:", error);
  }
  try {
    dpsRanking = await fetchDpsRanking(3);
  } catch (error) {
    console.error("Failed to load DPS ranking:", error);
  }
  try {
    killCountRanking = await fetchKillCountRanking(3);
  } catch (error) {
    console.error("Failed to load kill count ranking:", error);
  }
  try {
    weaponUsedRanking = await fetchWeaponUsedRanking(3);
  } catch (error) {
    console.error("Failed to load weapon used ranking:", error);
  }
  try {
    const allStaff = await getAllStaffMembers();
    const rolePriority: Record<string, number> = { owner: 1, admin: 2, staff: 3, helper: 4 };
    const staffMap = new Map<string, { uuid: string; username: string | null; staff_role: string | null }>();
    for (const m of allStaff) {
      if (!m.username || m.username === 'Hisui_c') continue;
      const existing = staffMap.get(m.uuid);
      if (!existing || (rolePriority[m.staff_role ?? ''] ?? 999) < (rolePriority[existing.staff_role ?? ''] ?? 999)) {
        staffMap.set(m.uuid, { uuid: m.uuid, username: m.username, staff_role: m.staff_role });
      }
    }
    topStaff = [...staffMap.values()].sort((a, b) =>
      (rolePriority[a.staff_role ?? ''] ?? 999) - (rolePriority[b.staff_role ?? ''] ?? 999)
    );
  } catch (error) {
    console.error("Failed to load staff:", error);
  }
  return json({ events, news, moneyRanking, playTimeRanking, walkRanking, dpsRanking, killCountRanking, weaponUsedRanking, topStaff }, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
    }
  });
};

type MoneyRankingEntry = Awaited<ReturnType<typeof fetchTopMoneyRanking>>[number];
type TopStaffEntry = { uuid: string; username: string | null; staff_role: string | null };

function formatPlayTime(ticks: number): string {
  const totalSeconds = Math.floor(ticks / 20);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const h = hours % 24;
    return `${days}日 ${h}時間`;
  }
  return `${hours}時間 ${minutes}分`;
}

function formatDistance(cm: number): string {
  const km = cm / 100000;
  if (km >= 1) return `${km.toFixed(1)} km`;
  return `${(cm / 100).toFixed(0)} m`;
}

const PVE_RANKING_PERIODS: { id: PveRankingPeriod; label: string }[] = [
  { id: 'day', label: '日次' },
  { id: 'week', label: '週間' },
  { id: 'month', label: '月間' },
  { id: 'total', label: '累計' },
];

const ROLE_INFO: Record<string, { label: string; color: string }> = {
  owner:  { label: '鯖主',       color: 'text-red-500 dark:text-red-400' },
  admin:  { label: '管理者',     color: 'text-orange-500 dark:text-orange-400' },
  staff:  { label: 'スタッフ',   color: 'text-blue-500 dark:text-blue-400' },
  helper: { label: 'お手伝いさん', color: 'text-green-500 dark:text-green-400' },
};

export default function Index() {
  const { events, news, moneyRanking, playTimeRanking, walkRanking, dpsRanking, killCountRanking, weaponUsedRanking, topStaff } = useLoaderData<{ events: Event[]; news: any[]; moneyRanking: MoneyRankingEntry[]; playTimeRanking: StatRankingEntry[]; walkRanking: StatRankingEntry[]; dpsRanking: DpsRankingEntry[]; killCountRanking: Record<PveRankingPeriod, KillCountRankingEntry[]>; weaponUsedRanking: Record<PveRankingPeriod, WeaponUsedRankingEntry[]>; topStaff: TopStaffEntry[] }>();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [pveRankingPeriod, setPveRankingPeriod] = useState<PveRankingPeriod>('total');
  const { isPveMode } = usePveMode();

  // PvEモード時のニュースフィルタリング
  // PvEカテゴリID (WordPressで確認して設定)
  const PVE_CATEGORY_ID = 123; // TODO: 実際のカテゴリIDに変更
  const filteredNews = isPveMode
    ? news.filter(item => item.categories?.includes(PVE_CATEGORY_ID))
    : news;

  // 秒なしの日時フォーマット関数
  const formatDateTime = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${d} ${hh}:${mm}`;
  };

  // 開催中のイベントを判定
  const getOngoingEvents = () => {
    const now = new Date();
    return events.filter(event => {
      const startTime = new Date(event.startAt);
      const endTime = event.endAt ? new Date(event.endAt) : null;

      // 開始時刻以降かつ、終了時刻が設定されていない場合は開催中
      if (now >= startTime && !endTime) {
        return true;
      }

      // 開始時刻以降かつ終了時刻以前の場合は開催中
      if (now >= startTime && endTime && now <= endTime) {
        return true;
      }

      return false;
    });
  };

  // 開催6時間以内のイベントを判定（開催中は除く）
  const getStartingSoonEvents = () => {
    const now = new Date();
    return events.filter(event => {
      const startTime = new Date(event.startAt);
      const endTime = event.endAt ? new Date(event.endAt) : null;

      // すでに開催中の場合は除外
      const isOngoing = now >= startTime && (!endTime || now <= endTime);
      if (isOngoing) return false;

      // 開催6時間以内かどうかを判定
      const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilStart > 0 && hoursUntilStart <= 6;
    });
  };

  const ongoingEvents = getOngoingEvents();
  const startingSoonEvents = getStartingSoonEvents();

  return (
    <div className="space-y-8">
        {/* 開催中イベントの表示 - PvEモード時は非表示 */}
        {!isPveMode && ongoingEvents.length > 0 && (
          <div className="max-w-6xl mx-auto">
            {/* ヘッダーセクション */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-500 dark:from-green-700 dark:to-emerald-600 text-white rounded-t-lg shadow-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-white rounded-full mr-3 animate-pulse"></div>
                  <h1 className="text-5xl font-extrabold font-raleway">開催中のイベント</h1>
                </div>
                <p className="mt-2 font-bold text-green-100 dark:text-green-50">現在開催中のイベント</p>
              </div>
            </div>

            {/* イベントコンテンツ */}
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-b-lg shadow-lg p-6">
              <div className="space-y-6">
                {ongoingEvents.map((event, index) => {
                  const startTime = new Date(event.startAt);
                  const endTime = event.endAt ? new Date(event.endAt) : null;
                  const isExpanded = expandedEventId === String(event.id);

                  return (
                    <article key={event.id} className="bg-white dark:bg-neutral-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                      {/* クリック可能なイベントヘッダー */}
                      <div
                        className="p-6 cursor-pointer"
                        onClick={() => setExpandedEventId(isExpanded ? null : String(event.id))}
                      >
                        {/* ステータスバッジ */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-bold">
                              開催中！
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">#{index + 1}</span>
                            <svg
                              className={`w-6 h-6 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {/* イベント名 */}
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                          {event.name}
                        </h2>

                        {/* 開催時間 */}
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>
                            {formatDateTime(startTime)}
                            {endTime && (
                              <span> 〜 {formatDateTime(endTime)}</span>
                            )}
                          </span>
                        </div>

                      </div>

                      {/* 展開可能な詳細セクション */}
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-0 space-y-4 border-t border-gray-200 dark:border-neutral-600">
                          {/* イベント画像 */}
                          {event.image && (
                            <div className="mt-4 relative overflow-hidden rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 group">
                              <div className="aspect-video bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900">
                                <img
                                  src={event.image}
                                  alt={event.name}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  loading="lazy"
                                />
                              </div>
                              {/* オーバーレイグラデーション */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                          )}

                          {/* 説明 */}
                          {event.description && (
                            <div className="bg-gray-50 dark:bg-neutral-600 rounded-lg p-4">
                              <p className="text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                                {linkifyText(event.description)}
                              </p>
                            </div>
                          )}

                          {/* 場所 */}
                          {event.location && (
                            <div className="flex items-start gap-2">
                              <span className="text-lg">📍</span>
                              <p className="text-gray-700 dark:text-gray-300">
                                <span className="font-semibold">Location:</span> {event.location}
                              </p>
                            </div>
                          )}

                          {/* Discord詳細リンク */}
                          <a
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-bold shadow-md hover:shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            イベント詳細
                          </a>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 開催まもなくのイベント表示 - PvEモード時は非表示 */}
        {!isPveMode && startingSoonEvents.length > 0 && (
          <div className="max-w-6xl mx-auto">
            {/* ヘッダーセクション */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-500 dark:from-amber-700 dark:to-orange-600 text-white rounded-t-lg shadow-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-white rounded-full mr-3"></div>
                  <h1 className="text-5xl font-extrabold font-raleway">まもなく開催</h1>
                </div>
                <p className="mt-2 font-bold text-amber-100 dark:text-amber-50">開催まであと6時間以内のイベント</p>
              </div>
            </div>

            {/* イベントコンテンツ */}
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-b-lg shadow-lg p-6">
              <div className="space-y-6">
                {startingSoonEvents.map((event, index) => {
                  const startTime = new Date(event.startAt);
                  const endTime = event.endAt ? new Date(event.endAt) : null;
                  const isExpanded = expandedEventId === `soon-${event.id}`;
                  const now = new Date();
                  const hoursUntilStart = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60 * 60));
                  const minutesUntilStart = Math.floor(((startTime.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));

                  return (
                    <article key={event.id} className="bg-white dark:bg-neutral-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                      {/* クリック可能なイベントヘッダー */}
                      <div
                        className="p-6 cursor-pointer"
                        onClick={() => setExpandedEventId(isExpanded ? null : `soon-${event.id}`)}
                      >
                        {/* ステータスバッジ */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-3 py-1 rounded-full text-sm font-bold">
                              あと{hoursUntilStart > 0 ? `${hoursUntilStart}時間${minutesUntilStart}分` : `${minutesUntilStart}分`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">#{index + 1}</span>
                            <svg
                              className={`w-6 h-6 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {/* イベント名 */}
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                          {event.name}
                        </h2>

                        {/* 開催時間 */}
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>
                            {formatDateTime(startTime)}
                            {endTime && (
                              <span> 〜 {formatDateTime(endTime)}</span>
                            )}
                          </span>
                        </div>

                      </div>

                      {/* 展開可能な詳細セクション */}
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-0 space-y-4 border-t border-gray-200 dark:border-neutral-600">
                          {/* イベント画像 */}
                          {event.image && (
                            <div className="mt-4 relative overflow-hidden rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 group">
                              <div className="aspect-video bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 dark:from-amber-900 dark:via-orange-900 dark:to-yellow-900">
                                <img
                                  src={event.image}
                                  alt={event.name}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  loading="lazy"
                                />
                              </div>
                              {/* オーバーレイグラデーション */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                          )}

                          {/* 説明 */}
                          {event.description && (
                            <div className="bg-gray-50 dark:bg-neutral-600 rounded-lg p-4">
                              <p className="text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                                {linkifyText(event.description)}
                              </p>
                            </div>
                          )}

                          {/* 場所 */}
                          {event.location && (
                            <div className="flex items-start gap-2">
                              <span className="text-lg">📍</span>
                              <p className="text-gray-700 dark:text-gray-300">
                                <span className="font-semibold">Location:</span> {event.location}
                              </p>
                            </div>
                          )}

                          {/* Discord詳細リンク */}
                          <a
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-bold shadow-md hover:shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            イベント詳細
                          </a>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* News Section */}
        {filteredNews && filteredNews.length > 0 && (
          <div className={`relative w-full overflow-hidden rounded-lg shadow-lg border ${isPveMode ? 'bg-black border-purple-800' : 'bg-white dark:bg-neutral-900 border-transparent dark:border-neutral-800'}`}>
            {/* Header */}
            <div className={`text-white p-6 ${isPveMode ? 'bg-gradient-to-r from-purple-900 to-red-900' : 'bg-gradient-to-r from-blue-950 to-cyan-700 dark:from-blue-900 dark:to-cyan-800'}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl md:text-4xl font-extrabold font-raleway m-0">News</h2>
                <Link
                  to="/news"
                  className={`text-sm md:text-lg px-4 py-2 rounded-lg font-bold transition-colors ${isPveMode ? 'bg-white text-purple-900 hover:bg-purple-50' : 'bg-white text-blue-900 hover:bg-blue-50'}`}
                >
                  ニュース一覧へ →
                </Link>
              </div>
              <p className={`mt-2 m-0 ${isPveMode ? 'text-purple-200' : 'text-blue-100'}`}>MOFUCRAFTの最新情報を随時発信中！</p>
            </div>

            {/* News Grid */}
            <div className={`p-6 ${isPveMode ? 'bg-black' : 'bg-white dark:bg-neutral-900'}`}>
              {/* md以上の場合: グリッド、画像あり */}
              <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNews.slice(0, 6).map((item) => (
                  <Link
                    key={item.id}
                    to={`/news/${item.id}`}
                    className="group block bg-gray-50 dark:bg-neutral-900 dark:border-neutral-700 dark:hover:border-blue-300 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-300"
                  >
                    {/* Featured Image */}
                    <div className="aspect-video overflow-hidden bg-gray-200">
                      {item._embedded?.['wp:featuredmedia']?.[0]?.source_url ? (
                        <img
                          src={item._embedded['wp:featuredmedia'][0].source_url}
                          alt={item.title.rendered}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-neutral-700 dark:to-neutral-800 h-full flex items-center justify-center">
                          <span className="text-6xl font-bold text-gray-300 dark:text-gray-700">NEWS</span>
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-bold text-lg text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors line-clamp-2 mb-2">
                        {decodeHtmlEntities(item.title.rendered)}
                      </h3>
                      {/* Excerpt */}
                      {item.excerpt?.rendered && (
                        <div
                          className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3"
                          dangerouslySetInnerHTML={{
                            __html: item.excerpt.rendered.replace(/<[^>]*>/g, '')
                          }}
                        />
                      )}
                      {/* Date */}
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(item.date)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {/* md未満の場合: リスト形式、画像なし */}
              <ul className="block md:hidden space-y-4">
                {filteredNews.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/news/${item.id}`}
                      className="block bg-gray-50 dark:bg-neutral-800 rounded-lg p-4 border border-gray-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200"
                    >
                      <h3 className="font-bold text-base text-gray-800 dark:text-gray-300 group-hover:text-blue-600 transition-colors mb-1">
                        {decodeHtmlEntities(item.title.rendered)}
                      </h3>
                      {/* Excerpt */}
                      {item.excerpt?.rendered && (
                        <div
                          className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2"
                          dangerouslySetInnerHTML={{
                            __html: item.excerpt.rendered.replace(/<[^>]*>/g, '')
                          }}
                        />
                      )}
                      {/* Date */}
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(item.date)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Rankings Section */}
        {!isPveMode && (
          <div className="relative w-full overflow-hidden rounded-xl shadow-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 dark:from-slate-900 dark:to-slate-800 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold font-raleway m-0">ランキング</h2>
                <p className="text-slate-400 text-xs mt-0.5 m-0">サーバー内 Top 3</p>
              </div>
              <Link
                to="/miscs/rankings"
                className="text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
              >
                全ランキング →
              </Link>
            </div>
            {/* 3 Columns */}
            <div className="bg-white dark:bg-neutral-900 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-neutral-800">
              {/* Money */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                      <FontAwesomeIcon icon={faCoins} className="text-amber-500 text-xs" />
                    </div>
                    <span className="font-bold text-sm text-gray-800 dark:text-gray-100">所持金</span>
                  </div>
                  <Link to="/miscs/money_ranking" className="text-xs text-amber-600 dark:text-amber-400 hover:underline">一覧 →</Link>
                </div>
                <ol className="space-y-1.5">
                  {moneyRanking.slice(0, 3).map((entry, idx) => {
                    const money = formatMoney(entry.balance);
                    return (
                      <li key={entry.uuid}>
                        <Link
                          to={`/players/${entry.uuid}`}
                          className="flex items-center gap-2 hover:bg-amber-50 dark:hover:bg-neutral-800 rounded-lg px-2 py-1.5 transition-colors"
                        >
                          <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200' : 'bg-amber-600 text-white'}`}>
                            {idx + 1}
                          </span>
                          <img
                            src={`https://mc-heads.net/avatar/${entry.uuid}/24`}
                            alt=""
                            className="w-6 h-6 rounded shrink-0"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/24'; }}
                          />
                          <span className="flex-1 text-sm font-medium truncate text-gray-700 dark:text-gray-200">{entry.name}</span>
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap">{money.integer} M</span>
                        </Link>
                      </li>
                    );
                  })}
                  {moneyRanking.length === 0 && (
                    <li className="text-xs text-gray-400 text-center py-3">データなし</li>
                  )}
                </ol>
              </div>
              {/* Play Time */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <FontAwesomeIcon icon={faClock} className="text-blue-500 text-xs" />
                    </div>
                    <span className="font-bold text-sm text-gray-800 dark:text-gray-100">プレイ時間</span>
                  </div>
                  <Link to="/miscs/rankings?stat=play_time" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">一覧 →</Link>
                </div>
                <ol className="space-y-1.5">
                  {playTimeRanking.slice(0, 3).map((entry, idx) => (
                    <li key={entry.uuid}>
                      <Link
                        to={`/players/${entry.uuid}`}
                        className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-neutral-800 rounded-lg px-2 py-1.5 transition-colors"
                      >
                        <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200' : 'bg-amber-600 text-white'}`}>
                          {idx + 1}
                        </span>
                        <img
                          src={`https://mc-heads.net/avatar/${entry.uuid}/24`}
                          alt=""
                          className="w-6 h-6 rounded shrink-0"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/24'; }}
                        />
                        <span className="flex-1 text-sm font-medium truncate text-gray-700 dark:text-gray-200">{entry.name}</span>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tabular-nums whitespace-nowrap">{formatPlayTime(entry.value)}</span>
                      </Link>
                    </li>
                  ))}
                  {playTimeRanking.length === 0 && (
                    <li className="text-xs text-gray-400 text-center py-3">データなし</li>
                  )}
                </ol>
              </div>
              {/* Walk Distance */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                      <FontAwesomeIcon icon={faPersonWalking} className="text-green-500 text-xs" />
                    </div>
                    <span className="font-bold text-sm text-gray-800 dark:text-gray-100">歩行距離</span>
                  </div>
                  <Link to="/miscs/rankings?stat=walk_one_cm" className="text-xs text-green-600 dark:text-green-400 hover:underline">一覧 →</Link>
                </div>
                <ol className="space-y-1.5">
                  {walkRanking.slice(0, 3).map((entry, idx) => (
                    <li key={entry.uuid}>
                      <Link
                        to={`/players/${entry.uuid}`}
                        className="flex items-center gap-2 hover:bg-green-50 dark:hover:bg-neutral-800 rounded-lg px-2 py-1.5 transition-colors"
                      >
                        <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200' : 'bg-amber-600 text-white'}`}>
                          {idx + 1}
                        </span>
                        <img
                          src={`https://mc-heads.net/avatar/${entry.uuid}/24`}
                          alt=""
                          className="w-6 h-6 rounded shrink-0"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/24'; }}
                        />
                        <span className="flex-1 text-sm font-medium truncate text-gray-700 dark:text-gray-200">{entry.name}</span>
                        <span className="text-xs font-bold text-green-600 dark:text-green-400 tabular-nums whitespace-nowrap">{formatDistance(entry.value)}</span>
                      </Link>
                    </li>
                  ))}
                  {walkRanking.length === 0 && (
                    <li className="text-xs text-gray-400 text-center py-3">データなし</li>
                  )}
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* PvE Rankings Section */}
        {isPveMode && (
          <div className="relative w-full overflow-hidden rounded-xl shadow-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-pve-purple to-pve-red text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold font-raleway m-0">PvE ランキング</h2>
                <p className="text-white/70 text-xs mt-0.5 m-0">サーバー内 Top 3(使用武器・討伐数は期間切り替え可)</p>
              </div>
              {/* 期間切り替え */}
              <div className="flex gap-1 bg-black/20 rounded-full p-1">
                {PVE_RANKING_PERIODS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPveRankingPeriod(p.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      pveRankingPeriod === p.id ? 'bg-white text-pve-red' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {/* 3 Columns */}
            <div className="bg-black grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-purple-900/50">
              {/* Weapon Used */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-900/40 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faGun} className="text-purple-400 text-xs" />
                  </div>
                  <span className="font-bold text-sm text-gray-100">使用武器</span>
                </div>
                <ol className="space-y-1.5">
                  {weaponUsedRanking[pveRankingPeriod].slice(0, 3).map((entry, idx) => (
                    <li key={`${entry.weaponName}-${idx}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-700' : 'bg-amber-600 text-white'}`}>
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium truncate text-gray-200">{entry.weaponName}</span>
                      <span className="text-xs font-bold text-purple-400 tabular-nums whitespace-nowrap">{entry.count.toLocaleString()} 回</span>
                    </li>
                  ))}
                  {weaponUsedRanking[pveRankingPeriod].length === 0 && (
                    <li className="text-xs text-gray-500 text-center py-3">データなし</li>
                  )}
                </ol>
              </div>
              {/* Kill Count */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-red-900/40 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faSkull} className="text-red-400 text-xs" />
                  </div>
                  <span className="font-bold text-sm text-gray-100">討伐数</span>
                </div>
                <ol className="space-y-1.5">
                  {killCountRanking[pveRankingPeriod].slice(0, 3).map((entry, idx) => (
                    <li key={entry.uuid}>
                      <Link
                        to={`/players/${entry.uuid}`}
                        className="flex items-center gap-2 hover:bg-white/5 rounded-lg px-2 py-1.5 transition-colors"
                      >
                        <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-700' : 'bg-amber-600 text-white'}`}>
                          {idx + 1}
                        </span>
                        <img
                          src={`https://mc-heads.net/avatar/${entry.uuid}/24`}
                          alt=""
                          className="w-6 h-6 rounded shrink-0"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/24'; }}
                        />
                        <span className="flex-1 text-sm font-medium truncate text-gray-200">{entry.name}</span>
                        <span className="text-xs font-bold text-red-400 tabular-nums whitespace-nowrap">{entry.count.toLocaleString()} 体</span>
                      </Link>
                    </li>
                  ))}
                  {killCountRanking[pveRankingPeriod].length === 0 && (
                    <li className="text-xs text-gray-500 text-center py-3">データなし</li>
                  )}
                </ol>
              </div>
              {/* Max DPS */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-900/40 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faBolt} className="text-amber-400 text-xs" />
                  </div>
                  <span className="font-bold text-sm text-gray-100">最大DPS</span>
                </div>
                <ol className="space-y-1.5">
                  {dpsRanking.slice(0, 3).map((entry, idx) => (
                    <li key={entry.uuid}>
                      <Link
                        to={`/players/${entry.uuid}`}
                        className="flex items-center gap-2 hover:bg-white/5 rounded-lg px-2 py-1.5 transition-colors"
                      >
                        <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-700' : 'bg-amber-600 text-white'}`}>
                          {idx + 1}
                        </span>
                        <img
                          src={`https://mc-heads.net/avatar/${entry.uuid}/24`}
                          alt=""
                          className="w-6 h-6 rounded shrink-0"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/Steve/24'; }}
                        />
                        <span className="flex-1 text-sm font-medium truncate text-gray-200">{entry.name}</span>
                        <span className="text-xs font-bold text-amber-400 tabular-nums whitespace-nowrap">{entry.maxDps.toFixed(1)} DPS</span>
                      </Link>
                    </li>
                  ))}
                  {dpsRanking.length === 0 && (
                    <li className="text-xs text-gray-500 text-center py-3">データなし</li>
                  )}
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Staff Section */}
        {!isPveMode && topStaff.length > 0 && (
          <div className="relative w-full overflow-hidden rounded-xl shadow-lg">
            {/* Header */}
            <div className="relative px-6 py-5 bg-gradient-to-r from-indigo-900 via-blue-800 to-violet-800 overflow-hidden">
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
              <div className="relative flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl md:text-3xl font-extrabold font-raleway text-white m-0">運営チーム</h2>
                  <p className="mt-1 text-blue-200 text-sm m-0">MOFUCRAFTを支えるスタッフたち</p>
                </div>
                <Link
                  to="/staff"
                  className="shrink-0 text-sm px-4 py-2 rounded-lg font-semibold bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-colors backdrop-blur-sm"
                >
                  全員を見る →
                </Link>
              </div>
            </div>

            {/* Staff Body Renders */}
            <div className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl border-x border-b border-white/40 dark:border-white/10 rounded-b-xl px-4 py-6 md:px-8 md:py-8 overflow-x-auto">
              <div className="flex flex-wrap md:flex-nowrap justify-center items-end gap-2 md:gap-1 min-w-0">
                {topStaff.map((member) => {
                  const role = ROLE_INFO[member.staff_role ?? ''];
                  return (
                    <Link
                      key={member.uuid}
                      to={`/players/${member.uuid}`}
                      className="group flex flex-col items-center gap-1 shrink-0 md:flex-1 md:min-w-0"
                    >
                      <div className="h-20 sm:h-24 md:h-24 flex items-end justify-center">
                        <img
                          src={`https://mc-heads.net/body/${member.uuid}/128`}
                          alt={member.username ?? ''}
                          className="h-full w-auto drop-shadow-md group-hover:scale-110 group-hover:-translate-y-1 group-hover:drop-shadow-xl transition-all duration-300 ease-out"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://mc-heads.net/body/Steve/128'; }}
                        />
                      </div>
                      {role && (
                        <p className={`text-[9px] sm:text-[10px] font-medium ${role.color}`}>
                          {role.label}
                        </p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
