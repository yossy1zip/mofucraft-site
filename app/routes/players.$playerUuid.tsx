import { json, LoaderFunction, MetaFunction } from "@remix-run/node";
import { useLoaderData, Link, useSearchParams, useNavigate } from "@remix-run/react";
import { fetchPunishmentsByPlayer, countPunishmentsByPlayer, checkPlayerActiveBan } from "~/utils/ban.server";
import { fetchPlayerMoney } from "~/utils/money.server";
import { formatMoney } from "~/utils/money";
import { getMyPetDataByUuid } from "~/utils/mypet.server";
import { calculatePetLevel, formatLastUsed, getPetDisplayName, sanitizePetName, getPlainPetName } from "~/utils/mypet";
import { getMcmmoDataByUuid } from "~/utils/mcmmo.server";
import { getStaffRoleByUuid, getDonorRoleByUuid } from "~/utils/luckperms.server";
import { getStaffRoleBadgeInfo, getDonorRoleBadgeInfo } from "~/utils/luckperms";
import { fetchPlayerVotes } from "~/utils/votes.server";
import { resolvePlayerUuid } from "~/utils/player.server";
import { fetchDiscordAccountByUuid } from "~/utils/discordsrv.server";
import { fetchCommunitiesByPlayerUuid } from "~/utils/communities.server";
import { parseMinecraftText, segmentToStyle } from "~/utils/minecraft-color";
import { useEffect, useRef } from "react";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data?.playerName ? `${data.playerName} - プレイヤー情報 - MOFUCRAFT!!!` : "プレイヤー情報 - MOFUCRAFT!!!" }
];

export const loader: LoaderFunction = async ({ request, params }) => {
  const { playerUuid: playerIdentifier } = params;
  
  if (!playerIdentifier) {
    throw new Response("Player identifier is required", { status: 400 });
  }

  try {
    // プレイヤー識別子（UUIDまたはユーザーネーム）を解決
    const playerInfo = await resolvePlayerUuid(playerIdentifier);

    // プレイヤーが見つからない場合はエラーではなくデータとして返す
    if (!playerInfo) {
      return json({
        playerNotFound: true,
        searchedIdentifier: playerIdentifier,
        punishments: [],
        allCounts: { ban: 0, kick: 0, warn: 0, total: 0 },
        filteredCounts: { ban: 0, kick: 0, warn: 0, total: 0 },
        currentPage: 1,
        totalPages: 1,
        currentType: 'all',
        playerUuid: null,
        playerName: null,
        activeBan: null,
        playerMoney: null,
        myPetData: { player: null, pets: [], mostRecentPet: null },
        mcmmoData: null,
        staffRole: null,
        donorRole: null,
        playerVotes: null,
        discordAccount: null,
        playerCommunities: [],
        limit: 30,
        error: null
      });
    }

    const playerUuid = playerInfo.uuid;
    
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const type = url.searchParams.get('type') || 'all';
    const limit = 30;
    
    // プレイヤーの処罰データ、件数、現在のBAN状況、所持金情報、MyPet情報、mcMMO情報、スタッフロール情報、寄付者情報、投票数、Discord認証情報、コミュニティ情報を取得
    const [punishments, allCounts, filteredCounts, activeBan, playerMoney, myPetData, mcmmoData, staffRole, donorRole, playerVotes, discordAccount, playerCommunities] = await Promise.all([
      fetchPunishmentsByPlayer(playerUuid, page, limit, type),
      countPunishmentsByPlayer(playerUuid), // 全体の件数（フィルターボタン用）
      countPunishmentsByPlayer(playerUuid, type), // フィルタされた件数（ページネーション用）
      checkPlayerActiveBan(playerUuid), // アクティブなBAN情報
      fetchPlayerMoney(playerUuid), // 所持金情報
      getMyPetDataByUuid(playerUuid), // MyPet情報
      getMcmmoDataByUuid(playerUuid), // mcMMO情報
      getStaffRoleByUuid(playerUuid), // スタッフロール情報
      getDonorRoleByUuid(playerUuid), // 寄付者情報
      fetchPlayerVotes(playerUuid), // 投票数情報
      fetchDiscordAccountByUuid(playerUuid), // Discord認証情報
      fetchCommunitiesByPlayerUuid(playerUuid) // コミュニティ情報
    ]);
    
    const totalPages = Math.ceil(filteredCounts.total / limit);
    
    // プレイヤー名を取得（処罰データ、所持金データ、または解決時のユーザーネームから）
    const playerName = punishments.length > 0 ? punishments[0].name : 
                      playerMoney?.name || 
                      playerInfo.username || 
                      "Unknown";
    
    return json({
      punishments,
      allCounts,
      filteredCounts,
      currentPage: page,
      totalPages,
      currentType: type,
      playerUuid,
      playerName,
      activeBan, // アクティブなBAN情報
      playerMoney, // 所持金情報
      myPetData, // MyPet情報
      mcmmoData, // mcMMO情報
      staffRole, // スタッフロール情報
      donorRole, // 寄付者情報
      playerVotes, // 投票数情報
      discordAccount, // Discord認証情報
      playerCommunities, // コミュニティ情報
      limit,
      error: null
    }, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
      }
    });
  } catch (error) {
    console.error("プレイヤーデータ取得エラー:", error);
    
    return json({
      punishments: [],
      allCounts: { ban: 0, kick: 0, warn: 0, total: 0 },
      filteredCounts: { ban: 0, kick: 0, warn: 0, total: 0 },
      currentPage: 1,
      totalPages: 1,
      currentType: 'all',
      playerUuid: playerIdentifier, // 元の識別子を保持
      playerName: "Unknown",
      activeBan: null,
      playerMoney: null,
      myPetData: { player: null, pets: [], mostRecentPet: null },
      mcmmoData: null,
      staffRole: null,
      donorRole: null,
      playerVotes: null,
      discordAccount: null,
      playerCommunities: [],
      limit: 30,
      error: "プレイヤーデータの取得に失敗しました"
    });
  }
};

export default function PlayerPage() {
  const data = useLoaderData<typeof loader>();
  const { punishments, allCounts, filteredCounts, currentPage, totalPages, currentType, playerUuid, playerName, activeBan, playerMoney, myPetData, mcmmoData, staffRole, donorRole, playerVotes, discordAccount, error } = data;
  const playerCommunities = 'playerCommunities' in data ? (data.playerCommunities as any[]) : [];
  const playerNotFound = 'playerNotFound' in data ? data.playerNotFound : false;
  const searchedIdentifier = 'searchedIdentifier' in data ? data.searchedIdentifier : '';
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scrollPositionRef = useRef<number>(0);

  // Minecraftカラーコードと改行に対応したペット名レンダリング
  const renderPetName = (name: string) => {
    if (!name) return <span>名前なし</span>;

    const sanitized = sanitizePetName(name);
    // 改行を処理（\nを実際の改行として扱う）
    const lines = sanitized.split(/\\n/);

    return (
      <span className="inline">
        {lines.map((line, lineIndex) => {
          const segments = parseMinecraftText(line);
          return (
            <span key={lineIndex}>
              {lineIndex > 0 && <br />}
              {segments.map((segment, segIndex) => {
                const style = segmentToStyle(segment);
                return (
                  <span key={segIndex} style={style}>
                    {segment.text}
                  </span>
                );
              })}
            </span>
          );
        })}
      </span>
    );
  };

  // スクロール位置を保存・復元
  useEffect(() => {
    // ページ読み込み後にスクロール位置を復元
    if (typeof window === 'undefined') return;

    const timeoutId = setTimeout(() => {
      if (scrollPositionRef.current > 0) {
        window.scrollTo(0, scrollPositionRef.current);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [currentType]);

  // フィルター変更関数
  const changeFilter = (type: string) => {
    // 現在のスクロール位置を保存
    if (typeof window !== 'undefined') {
      scrollPositionRef.current = window.scrollY;
    }

    try {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('type', type);
      newSearchParams.delete('page'); // フィルター変更時はページをリセット
      setSearchParams(newSearchParams);
    } catch (error) {
      // フォールバック: 直接ナビゲーション
      if (typeof window !== 'undefined') {
        window.location.href = `${window.location.pathname}?type=${type}`;
      }
    }
  };

  // ページネーション関数
  const goToPage = (page: number) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', page.toString());
    setSearchParams(newSearchParams);
  };

  // Note: RemixのloaderとuseLoaderDataを使用しているため、
  // 手動でのデータ再取得は不要です。ページ遷移時に自動的に再取得されます。

  // プレイヤーが見つからない場合の表示
  if (playerNotFound) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-8 text-center">
          <svg className="mx-auto h-16 w-16 text-amber-400 dark:text-amber-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-2">
            プレイヤーが見つかりませんでした
          </h2>
          <p className="text-amber-700 dark:text-amber-300 mb-6">
            「{searchedIdentifier}」に一致するプレイヤーは見つかりませんでした。<br />
            最終ログインが古い可能性があります。
          </p>

          {/* プレイヤー検索フォーム */}
          <div className="max-w-md mx-auto bg-white dark:bg-neutral-700 rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              他のプレイヤーを検索
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const searchTerm = formData.get('playerSearch') as string;
                if (searchTerm?.trim()) {
                  navigate(`/players/${encodeURIComponent(searchTerm.trim())}`);
                }
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                name="playerSearch"
                placeholder="プレイヤー名またはUUIDを入力"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-600 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
                autoComplete="off"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-neutral-700"
              >
                検索
              </button>
            </form>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              ※ プレイヤー名（大文字小文字を区別）またはUUID（ハイフンありなし両対応）で検索できます
            </p>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="bg-gradient-to-r from-blue-900 to-blue-600 dark:from-blue-950 dark:to-blue-800 text-white rounded-t-lg shadow-lg">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <img
                src={`https://mc-heads.net/avatar/${playerUuid}/64`}
                alt={playerName}
                className="w-16 h-16 rounded-lg shadow-sm"
              />
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-extrabold font-raleway">{playerName}</h1>
                </div>
                <p className="my-2 text-xs font-bold text-blue-100 dark:text-blue-200">UUID: <span className="uuid-text">{playerUuid}</span></p>
                <div className="flex flex-wrap gap-2 items-center">
                  {staffRole?.is_staff && staffRole.staff_role && (() => {
                    const badgeInfo = getStaffRoleBadgeInfo(staffRole.staff_role);
                    if (!badgeInfo) return null;
                    return (
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${badgeInfo.bgColor} ${badgeInfo.textColor} shadow-lg`}>
                        {badgeInfo.label}
                      </span>
                    );
                  })()}
                  {donorRole?.is_donor && donorRole.donor_role && (() => {
                    const badgeInfo = getDonorRoleBadgeInfo(donorRole.donor_role);
                    if (!badgeInfo) return null;
                    return (
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${badgeInfo.bgColor} ${badgeInfo.textColor} shadow-lg`}>
                        {badgeInfo.label}
                      </span>
                    );
                  })()}
                </div>
                {discordAccount && discordAccount.isLinked && (
                  <div className="mt-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-100 dark:text-blue-200" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span className="text-sm font-medium text-blue-100 dark:text-blue-200">Discord認証済み</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* プレイヤー情報コンテンツ */}
        <div className="bg-gray-50 dark:bg-neutral-800 rounded-b-lg shadow-lg p-6">

          {/* BANアラート */}
          {activeBan && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-sm text-red-800 dark:text-red-200">
                  <p className="font-semibold mb-2">このプレイヤーは現在BANされています</p>
                  <div className="space-y-1">
                    <p><span className="font-medium">処罰理由:</span> {activeBan.reason || "（理由の記載なし）"}</p>
                    <p><span className="font-medium">処罰日時:</span> {new Date(activeBan.banned_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                    <p><span className="font-medium">実行者:</span> {activeBan.banned_by || "Unknown"}</p>
                    <p>
                      <span className="font-medium">期限:</span> {activeBan.expires_at ? (
                        <span className="text-orange-600 dark:text-orange-400">
                          {new Date(activeBan.expires_at).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-bold">永久BAN</span>
                      )}
                    </p>
                    {activeBan.ipban && (
                      <p className="text-red-700 dark:text-red-300 font-medium">IP BANが有効です</p>
                    )}
                  </div>
                  <div className="mt-3 pt-2 border-t border-red-200 dark:border-red-700">
                    <p className="text-xs text-red-600 dark:text-red-300">
                      処罰についてのお問い合わせは、MOFUCRAFT!!!公式Discordサーバーまたはお問い合わせフォームから運営チームにお問い合わせください
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 投票情報 */}
          <div className="bg-white dark:bg-neutral-700 rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                投票情報
              </h3>
              {playerVotes ? (
                <div className="space-y-4">
                  {/* メイン統計 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{playerVotes.allTimeTotal.toLocaleString()}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">累計投票</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{playerVotes.monthTotal.toLocaleString()}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">今月</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{playerVotes.weeklyTotal.toLocaleString()}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">今週</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{playerVotes.dailyTotal.toLocaleString()}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">今日</div>
                    </div>
                  </div>

                  {/* ストリーク情報 */}
                  <div className="border-t dark:border-neutral-600 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">投票ストリーク</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{playerVotes.dayVoteStreak}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">日間ストリーク</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">最高: {playerVotes.bestDayVoteStreak}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{playerVotes.weekVoteStreak}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">週間ストリーク</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">最高: {playerVotes.bestWeekVoteStreak}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{playerVotes.monthVoteStreak}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">月間ストリーク</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">最高: {playerVotes.bestMonthVoteStreak}</div>
                      </div>
                    </div>
                  </div>

                  {/* その他の統計 */}
                  <div className="border-t dark:border-neutral-600 pt-4 grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">隠し投票ポイント</h4>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-yellow-500 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{playerVotes.points.toLocaleString()}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">マイルストーン</h4>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-lg font-bold text-red-600 dark:text-red-400">{playerVotes.mileStoneCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* 最高記録 */}
                  <div className="border-t dark:border-neutral-600 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">最高記録</h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-gray-50 dark:bg-neutral-600 rounded p-2 text-center">
                        <div className="font-bold text-gray-700 dark:text-gray-200">{playerVotes.highestDailyTotal}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">日間最高</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-neutral-600 rounded p-2 text-center">
                        <div className="font-bold text-gray-700 dark:text-gray-200">{playerVotes.highestWeeklyTotal}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">週間最高</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-neutral-600 rounded p-2 text-center">
                        <div className="font-bold text-gray-700 dark:text-gray-200">{playerVotes.highestMonthlyTotal}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">月間最高</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <p>投票データがありません</p>
                </div>
              )}
            </div>

          {/* プレイヤー統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* 所持金情報 */}
            <div className="bg-white dark:bg-neutral-700 rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                所持金情報
              </h3>
              {playerMoney ? (
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {(() => {
                      const money = formatMoney(playerMoney.balance);
                      return (
                        <>
                          {money.integer}
                          <span className="text-xl text-green-400 dark:text-green-500">.{money.decimal}</span>
                          {' '}MOFU
                        </>
                      );
                    })()}
                  </div>
                  <Link
                    to="/miscs/money_ranking"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                  >
                    所持金ランキングを見る
                  </Link>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <p>所持金データがありません</p>
                </div>
              )}
            </div>

            {/* mcMMO情報 */}
            <div className="bg-white dark:bg-neutral-700 rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                mcMMO情報
              </h3>
              {mcmmoData ? (
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                    {mcmmoData.total_level.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    パワーレベル
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <p>mcMMOデータがありません</p>
                </div>
              )}
            </div>

            {/* MyPet情報 */}
            <div className="bg-white dark:bg-neutral-700 rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                MyPet情報
              </h3>
              {myPetData.pets.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{myPetData.pets.length}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">所有ペット数</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {myPetData.pets.reduce((max: number, pet: any) => Math.max(max, calculatePetLevel(pet.exp)), 0)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">最高レベル</div>
                    </div>
                  </div>
                  {myPetData.mostRecentPet && (
                    <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                      <div className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-3">最後にアクティブだったペット</div>
                      <div className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                        <p><span className="font-medium">名前:</span> {renderPetName(myPetData.mostRecentPet.name)}</p>
                        <p><span className="font-medium">種類:</span> {getPetDisplayName(myPetData.mostRecentPet.type)}</p>
                        <p><span className="font-medium">レベル:</span> {calculatePetLevel(myPetData.mostRecentPet.exp)}</p>
                        <p><span className="font-medium">体力:</span> {myPetData.mostRecentPet.health}</p>
                        <p><span className="font-medium">最終使用:</span> {formatLastUsed(myPetData.mostRecentPet.last_used)}</p>
                      </div>
                    </div>
                  )}

                  {/* ペット一覧表示（3匹以上の場合） */}
                  {myPetData.pets.length > 2 && (
                    <div className="mt-4">
                      <div className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-2">全てのペット</div>
                      <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                        {myPetData.pets.slice(0, 10).map((pet: any, index: number) => (
                          <div key={pet.uuid} className="p-2 bg-white dark:bg-neutral-600 rounded border dark:border-neutral-700">
                            <div className="text-xs text-gray-700 dark:text-gray-200">
                              <span className="font-medium">{renderPetName(pet.name)}</span>
                              <span className="text-gray-500 dark:text-gray-400 ml-1">
                                (Lv.{calculatePetLevel(pet.exp)} {getPetDisplayName(pet.type)})
                              </span>
                            </div>
                          </div>
                        ))}
                        {myPetData.pets.length > 10 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                            ...他{myPetData.pets.length - 10}匹
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <p>ペットを飼っていません</p>
                </div>
              )}
            </div>

          </div>

          {/* コミュニティ情報 */}
          {playerCommunities.length > 0 && (
            <div className="bg-white dark:bg-neutral-700 rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                所属コミュニティ ({playerCommunities.length})
              </h3>
              <div className="space-y-3">
                {playerCommunities.map((community: any) => {
                  const segments = parseMinecraftText(community.prefix);
                  const getRoleLabel = (role: string) => {
                    const roleMap: { [key: string]: { label: string; bgColor: string; textColor: string } } = {
                      'OWNER': { label: 'オーナー', bgColor: 'bg-red-100 dark:bg-red-900/40', textColor: 'text-red-800 dark:text-red-300' },
                      'MOD': { label: 'モデレーター', bgColor: 'bg-orange-100 dark:bg-orange-900/40', textColor: 'text-orange-800 dark:text-orange-300' },
                      'MEMBER': { label: 'メンバー', bgColor: 'bg-blue-100 dark:bg-blue-900/40', textColor: 'text-blue-800 dark:text-blue-300' },
                    };
                    return roleMap[role.toUpperCase()] || { label: role, bgColor: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-800 dark:text-gray-300' };
                  };
                  const roleInfo = getRoleLabel(community.role);

                  return (
                    <Link
                      key={community.id}
                      to={`/communities/${community.slug}`}
                      className="block p-4 bg-gray-50 dark:bg-neutral-600 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-500 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-bold bg-neutral-200 dark:bg-neutral-700">
                            {segments.map((segment, index) => {
                              const style = segmentToStyle(segment);
                              if (!segment.color) {
                                style.color = 'currentColor';
                              }
                              return (
                                <span key={index} style={style} className={!segment.color ? 'text-neutral-700 dark:text-neutral-200' : ''}>
                                  {segment.text}
                                </span>
                              );
                            })}
                          </span>
                          <span className="font-bold text-gray-900 dark:text-gray-100">{community.name}</span>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleInfo.bgColor} ${roleInfo.textColor}`}>
                          {roleInfo.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 処罰履歴セクション */}
          <div className="bg-white dark:bg-neutral-700 rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">処罰履歴</h3>

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
                    currentType === 'all'
                      ? 'bg-gray-800 dark:bg-gray-700 text-white'
                      : 'bg-white dark:bg-neutral-600 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-600'
                  }`}
                >
                  すべて ({allCounts.total})
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    changeFilter('ban');
                  }}
                  type="button"
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentType === 'ban'
                      ? 'bg-red-600 dark:bg-red-700 text-white'
                      : 'bg-white dark:bg-neutral-600 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30'
                  }`}
                >
                  BAN ({allCounts.ban})
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    changeFilter('kick');
                  }}
                  type="button"
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentType === 'kick'
                      ? 'bg-orange-600 dark:bg-orange-700 text-white'
                      : 'bg-white dark:bg-neutral-600 text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                  }`}
                >
                  KICK ({allCounts.kick})
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    changeFilter('warn');
                  }}
                  type="button"
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentType === 'warn'
                      ? 'bg-yellow-600 dark:bg-yellow-700 text-white'
                      : 'bg-white dark:bg-neutral-600 text-yellow-600 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'
                  }`}
                >
                  警告 ({allCounts.warn})
                </button>
              </div>
            </div>

            {punishments.length > 0 ? (
              <div className="bg-white dark:bg-neutral-700 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 dark:bg-neutral-600">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                          処罰タイプ
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                          処罰日時
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                          理由
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                          実行者
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                          詳細
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-neutral-600">
                      {punishments.map((punishment: any) => (
                        <tr
                          key={`${punishment.type}-${punishment.id}`}
                          className="hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                punishment.type === 'ban' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                punishment.type === 'kick' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' :
                                'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              }`}>
                                {punishment.type === 'ban' ? 'BAN' : punishment.type === 'kick' ? 'KICK' : '警告'}
                              </span>
                              {punishment.type === 'ban' && !punishment.active && (
                                <>
                                  {punishment.removed_by_name ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                      手動解除
                                    </span>
                                  ) : punishment.expires_at ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                      期限切れ
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                      無効
                                    </span>
                                  )}
                                </>
                              )}
                              {punishment.type === 'warn' && !punishment.active && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                  取り消し
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700 dark:text-gray-200">
                              {new Date(punishment.banned_at || punishment.kicked_at || punishment.warned_at).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700 dark:text-gray-200 max-w-xs truncate">
                              {punishment.reason || "（理由の記載なし）"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700 dark:text-gray-200">
                              {punishment.banned_by || punishment.kicked_by || punishment.warned_by || "Unknown"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Link
                              to={`/punishments/${punishment.type}/${punishment.id}`}
                              className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
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
              <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-12 text-center">
                <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
                  {currentType === 'all'
                    ? 'このプレイヤーに処罰履歴はありません'
                    : `このプレイヤーに${currentType === 'ban' ? 'BAN' : currentType === 'kick' ? 'KICK' : '警告'}履歴はありません`}
                </p>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  {currentType === 'all'
                    ? 'クリーンな記録を保っています'
                    : 'フィルターを変更して他の処罰タイプを確認してください'}
                </p>
              </div>
            )}

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-neutral-600 border border-gray-300 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-600 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  前のページ
                </button>

                <div className="flex gap-1">
                  {/* ページ番号ボタン */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg ${
                          pageNum === currentPage
                            ? 'bg-blue-600 dark:bg-blue-700 text-white'
                            : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-neutral-600 border border-gray-300 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-600 hover:text-gray-900 dark:hover:text-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-neutral-600 border border-gray-300 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-600 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  次のページ
                </button>
              </div>
            )}

            {/* ページ情報 */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-300 mt-4">
              {filteredCounts.total}件中 {(currentPage - 1) * 30 + 1}〜{Math.min(currentPage * 30, filteredCounts.total)}件を表示
              {totalPages > 1 && ` (${currentPage}/${totalPages}ページ)`}
            </div>
          </div>
        </div>

        {/*プレイヤー名けんさく */}
        <div className="mt-8 bg-gray-50 dark:bg-neutral-800 rounded-lg shadow-lg p-6">
          {/* プレイヤー検索セクション */}
          <div className="bg-white dark:bg-neutral-700 rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              他のプレイヤーを検索
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const searchTerm = formData.get('playerSearch') as string;
                if (searchTerm?.trim()) {
                  navigate(`/players/${encodeURIComponent(searchTerm.trim())}`);
                }
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                name="playerSearch"
                placeholder="プレイヤー名またはUUIDを入力"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-600 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
                autoComplete="off"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-neutral-700"
              >
                検索
              </button>
            </form>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              ※ プレイヤー名（大文字小文字を区別）またはUUID（ハイフンありなし両対応）で検索できます
            </p>
          </div>
        </div>
      </div>
    </>
  );
}