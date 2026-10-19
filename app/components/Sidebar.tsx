import { Link } from "@remix-run/react";
import { useEffect, useState } from "react";
import { formatDate } from "~/utils/date";
import { getTopNews } from "~/utils/wordpress";
import { getEvents, Event } from "~/utils/discord";
import { McServerStatus } from "~/utils/mcquery";
import { linkifyText } from "~/utils/linkify";
import { usePveMode } from "~/contexts/PveModeContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarXmark } from "@fortawesome/free-solid-svg-icons";
import { hapticTap, hapticToggle } from "~/utils/haptic";

// Xロゴコンポーネント
const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// リンクリストの定義を追加
const links = [
  { title: 'スタッフリスト', url: '/staff', type: 'internal' },
  { title: 'コミュニティリスト', url: '/communities', type: 'internal' },
  { title: 'BANリスト', url: '/punishments/bans', type: 'internal' },
  { title: '所持金ランキング', url: '/miscs/money_ranking', type: 'internal' },
  { title: 'ゲーム内ランキング', url: '/miscs/rankings', type: 'internal' },
  { title: 'ストア', url: '/store', type: 'internal' },
  { title: '非公式Wiki', url: '//mofunotoffi.playing.wiki/d/%a5%c8%a5%c3%a5%d7%a5%da%a1%bc%a5%b8', type: 'external' },
  { title: '公式', url: '//x.com/mofucraft', type: 'external', icon: 'x' },
  { title: '公式YouTubeチャンネル', url: '//youtube.com/@mofucraft', type: 'external' },
  { title: 'minecraft.jp', url: '//minecraft.jp/servers/mofucraft.net', type: 'external' }
] as const;

// Loaderデータ型の定義
type SidebarData = {
  news?: Awaited<ReturnType<typeof getTopNews>>;
  status?: McServerStatus | null;
  events?: Awaited<ReturnType<typeof getEvents>>;
  moneyRanking?: any;
};

export default function Sidebar({ news = [], status = null, events = [], moneyRanking = [] }: SidebarData) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { isPveMode } = usePveMode();

  // Discordウィジェット（iframe）はSSRとCSRで内容が異なるため、
  // マウント後（ハイドレーション完了後）にのみ描画してミスマッチを防ぐ
  useEffect(() => {
    setIsClient(true);
  }, []);

  // イベントを開催日時が近い順でソート（同じ開始日時の場合は終了が早いものが上）
  const sortedEvents = [...events].sort((a, b) => {
    const startA = new Date(a.startAt).getTime();
    const startB = new Date(b.startAt).getTime();
    if (startA !== startB) {
      return startA - startB;
    }
    // 開始時刻が同じ場合は終了時刻で比較
    const endA = a.endAt ? new Date(a.endAt).getTime() : Infinity;
    const endB = b.endAt ? new Date(b.endAt).getTime() : Infinity;
    return endA - endB;
  });


  // PvEモード時のカードスタイル（トランジション付き）
  const cardBgClass = isPveMode
    ? 'bg-pve-purple-dark text-gray-100 transition-colors duration-700'
    : 'bg-white dark:bg-neutral-800 transition-colors duration-700';

  const cardHeaderClass = isPveMode
    ? 'text-gray-100 border-purple-700 transition-colors duration-700'
    : 'text-gray-700 dark:text-gray-300 dark:border-neutral-700 transition-colors duration-700';

  const cardTextClass = isPveMode
    ? 'text-gray-200 transition-colors duration-700'
    : 'text-gray-700 dark:text-gray-300 transition-colors duration-700';

  return (
    <div className="space-y-4 sticky top-20 self-start">

      {/* サーバー情報 */}
      <div className={`${cardBgClass} rounded-lg shadow`}>
        <h2 className={`p-4 font-bold border-b m-0 ${cardHeaderClass}`}>サーバー情報</h2>
        <div className="p-4 space-y-3">
          <p className={`m-0 ${cardTextClass}`}>
            サーバーアドレス:{" "}
            <code className={`font-mono px-2 py-1 rounded text-sm ${isPveMode ? 'bg-purple-900' : 'bg-gray-100 dark:bg-neutral-700'}`}>
              mofucraft.net
            </code>
          </p>
          <p className={`m-0 ${cardTextClass}`}>おすすめMinecraftバージョン: 26.2</p>

          <div>
            <p className={`text-sm font-semibold mb-2 ${isPveMode ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>現在のステータス</p>
            {status ? (
              status.online ? (
                <div className="space-y-1">
                  <div className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs font-bold w-fit">
                    <svg className="w-3 h-3 mr-1 fill-green-500" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="4" />
                    </svg>
                    オンライン
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 m-0">
                    <span className="font-semibold">プレイヤー:</span> {status.players} / {status.maxPlayers}
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                    <svg className="w-3 h-3 mr-1 fill-red-500" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="4" />
                    </svg>
                    オフライン
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">メンテナンス中の可能性があります</span>
                </div>
              )
            ) : (
              <div className="flex items-center space-x-2 text-gray-400">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                <span>取得中...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* イベント - PvEモード時は非表示 */}
      {!isPveMode && (
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow">
        <h2 className="p-4 font-bold border-b dark:border-neutral-700 m-0 text-gray-700 dark:text-gray-300">イベントスケジュール</h2>
        <div className="p-4 space-y-2">
          {sortedEvents && sortedEvents.length > 0 ? (
            sortedEvents.map((event: Event) => {
              const startTime = new Date(event.startAt);
              const endTime = event.endAt ? new Date(event.endAt) : null;
              const isExpanded = expandedEventId === String(event.id);
              const now = new Date();

              // 当日かどうかを判定
              const isToday = startTime.toDateString() === now.toDateString();

              // 開催中かどうかを判定
              const isOngoing = now >= startTime && (!endTime || now <= endTime);

              // 開催6時間以内かどうかを判定
              const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
              const isStartingSoon = !isOngoing && hoursUntilStart > 0 && hoursUntilStart <= 6;

              // YYYY/MM/DD HH:mm（秒なし）のローカル日時表記
              function formatNoSeconds(date: Date) {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                const hh = String(date.getHours()).padStart(2, '0');
                const mm = String(date.getMinutes()).padStart(2, '0');
                return `${y}/${m}/${d} ${hh}:${mm}`;
              }

              // 日付表示のフォーマット（当日の場合は「本日」表記）
              function formatEventDate(date: Date) {
                const hh = String(date.getHours()).padStart(2, '0');
                const mm = String(date.getMinutes()).padStart(2, '0');
                if (isToday) {
                  return `本日 ${hh}:${mm}`;
                }
                return formatNoSeconds(date);
              }

              return (
                <div key={event.id} className={`border-b border-gray-100 dark:border-neutral-700 pb-2 last:border-b-0 ${isOngoing ? 'bg-green-50 dark:bg-green-900/20 rounded-lg' : isStartingSoon ? 'bg-amber-50 dark:bg-amber-900/20 rounded-lg' : isToday ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg' : ''}`}>
                  {/* クリック可能なイベントヘッダー */}
                  <div
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-700 rounded p-2 -m-2 transition-colors"
                    onClick={() => { hapticToggle(); setExpandedEventId(isExpanded ? null : String(event.id)); }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isOngoing && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full animate-pulse whitespace-nowrap">
                            開催中
                          </span>
                        )}
                        {isStartingSoon && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full whitespace-nowrap">
                            まもなく
                          </span>
                        )}
                        {isToday && !isOngoing && !isStartingSoon && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full whitespace-nowrap">
                            本日
                          </span>
                        )}
                        <p className="font-semibold m-0 text-gray-700 dark:text-gray-300">{event.name}</p>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <p className={`text-sm mt-1 m-0 ${isOngoing ? 'text-green-700 dark:text-green-300 font-semibold' : isStartingSoon ? 'text-amber-700 dark:text-amber-300 font-semibold' : isToday ? 'text-blue-700 dark:text-blue-300 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                      {formatEventDate(startTime)}
                      {endTime && (
                        <span> 〜 {isToday && endTime.toDateString() === now.toDateString() ? `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}` : formatNoSeconds(endTime)}</span>
                      )}
                    </p>
                  </div>

                  {/* 展開可能な詳細セクション */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-neutral-600 space-y-3">
                      {/* イベント画像 */}
                      {event.image && (
                        <div className="relative overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                          <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-neutral-700 dark:to-neutral-800">
                            <img
                              src={event.image}
                              alt={event.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        </div>
                      )}

                      {/* 説明 */}
                      {event.description && (
                        <div className="bg-gray-50 dark:bg-neutral-700 rounded p-3">
                          <p className="text-sm text-gray-700 dark:text-gray-300 m-0 whitespace-pre-wrap">
                            {linkifyText(event.description)}
                          </p>
                        </div>
                      )}

                      {/* 場所 */}
                      {event.location && (
                        <div className="flex items-start gap-2">
                          <span className="text-base">📍</span>
                          <p className="text-sm text-gray-700 dark:text-gray-300 m-0">
                            <span className="font-semibold">Location:</span> {event.location}
                          </p>
                        </div>
                      )}

                      {/* Discord詳細リンク */}
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => hapticTap()}
                        className="block w-full text-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm"
                      >
                        Discordイベント詳細
                      </a>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center py-6 text-gray-400 dark:text-gray-500">
              <FontAwesomeIcon icon={faCalendarXmark} className="w-10 h-10 mb-3 opacity-60" />
              <p className="m-0 text-sm font-medium">現在予定されているイベントはありません</p>
              <p className="m-0 text-xs mt-1">新しいイベントをお楽しみに！</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* News */}
      <div className={`rounded-lg shadow transition-colors duration-700 ${isPveMode ? 'bg-pve-purple-dark text-gray-100' : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300'}`}>
        <h2 className={`p-4 font-bold border-b m-0 ${isPveMode ? 'border-purple-700' : 'dark:border-neutral-700'}`}>
          <Link to="/news" className={`transition-colors text-decoration-none ${isPveMode ? 'hover:text-pve-red' : 'hover:text-blue-500'}`}>News</Link>
        </h2>
        <div className="p-4 space-y-2">
          {news && news.length > 0 ? (
            news.slice(0, 8).map((item) => (
              <div key={item.id} className="mb-2">
                <Link
                  to={`/news/${item.id}`}
                  onClick={() => hapticTap()}
                  className={`hover:scale-105 transform transition-all duration-200 no-underline hover:no-underline focus:outline-none ${isPveMode ? 'text-gray-200 hover:text-pve-red' : 'text-gray-800 dark:text-gray-300 hover:text-pink-500 dark:hover:text-pink-300'}`}
                >
                  {item.title.rendered}
                </Link>
                <span className={`block text-xs ${isPveMode ? 'text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {formatDate(item.date)}
                </span>
              </div>
            ))
          ) : (
            <div className={`text-center ${isPveMode ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>ニュースはありません</div>
          )}
        </div>
      </div>

      {/* Links */}
      <div className={`rounded-lg shadow transition-colors duration-700 ${isPveMode ? 'bg-pve-purple-dark text-gray-100' : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300'}`}>
        <h2 className={`p-4 font-bold border-b m-0 ${isPveMode ? 'border-purple-700' : 'dark:border-neutral-700'}`}>Links</h2>
        <div className="p-4 space-y-3 text-center">
          {links.map((link, index) => {
            // Card Style for external links
            if (link.type === 'external') {
              return (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => hapticTap()}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 group ${isPveMode ? 'border-purple-600 hover:border-pve-red hover:bg-purple-900' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900'}`}
                >
                  <span className={`font-medium flex items-center gap-1 ${isPveMode ? 'text-gray-200 group-hover:text-pve-red' : 'text-gray-700 group-hover:text-blue-600 dark:text-gray-300 dark:group-hover:text-blue-300'}`}>
                    {link.title}
                    {'icon' in link && link.icon === 'x' && (
                      <XLogo className={`w-4 h-4 inline-block ${isPveMode ? 'fill-gray-200 group-hover:fill-pve-red' : 'fill-gray-700 group-hover:fill-blue-600 dark:fill-gray-300 dark:group-hover:fill-blue-300'}`} />
                    )}
                  </span>
                  <svg className={`w-4 h-4 transition-colors ${isPveMode ? 'text-gray-400 group-hover:text-pve-red' : 'text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              );
            }
            // Button Style for internal links
            if (link.type === 'internal') {
              return (
                <Link
                  key={index}
                  to={link.url}
                  onClick={() => hapticTap()}
                  className={`block w-full text-left px-4 py-3 text-white rounded-lg transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg ${isPveMode ? 'bg-gradient-to-r from-pve-purple to-pve-red hover:from-purple-700 hover:to-red-700' : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'}`}
                >
                  {link.title}
                </Link>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Discord */}
      <div className={`rounded-lg shadow transition-colors duration-700 ${isPveMode ? 'bg-pve-purple-dark text-gray-100' : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300'}`}>
        <div className="p-4">
          {/*
            Discord widget theme (light/dark) is set based on current color scheme.
            Uses useEffect + useState to handle SSR and dynamic switching.
            PvEモード時は常にダークテーマ
          */}
          {!isClient ? null : (
            <iframe
              src={`https://discord.com/widget?id=416316636979658763&theme=${
                isPveMode || (window.matchMedia &&
                window.matchMedia('(prefers-color-scheme: dark)').matches)
                  ? 'dark'
                  : 'light'
              }`}
              width="100%"
              height="500"
              allowTransparency={true}
              frameBorder={0}
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            ></iframe>
          )}
        </div>
      </div>

      {/* Solo Server - PvEモード時は非表示 */}
      {!isPveMode && (
      <div id="solo" className="bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-lg shadow">
        <h2 className="p-4 font-bold border-b dark:border-neutral-700 m-0">Solo Server</h2>
        <div className="p-4 text-center">
          <p>シングルプレイなマルチプレイ！？</p>
          <div id="solo-icon" className="my-4">
            <a href="https://solo.mofucraft.net" target="_blank" rel="noopener noreferrer">
              <img src="//mofucraft.net/image/Grass.png" alt="Solo Server" className="mx-auto" />
            </a>
          </div>
          <p>↑↑ 気になったらクリック！ ↑↑</p>
        </div>
      </div>
      )}
    </div>
  );
}
