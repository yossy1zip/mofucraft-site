import { json, LoaderFunction, MetaFunction } from "@remix-run/node";
import { useLoaderData, useNavigate, Link } from "@remix-run/react";
import { findPunishmentById } from "~/utils/ban.server";
import { useEffect, useState } from "react";

export const meta: MetaFunction<typeof loader> = ({ data, params }) => {
  const typeLabel = params.type === 'ban' ? 'BAN' : params.type === 'kick' ? 'KICK' : 'WARN';
  const playerName = data?.punishment?.name || 'Unknown';
  return [
    { title: `${playerName}の${typeLabel}詳細 - MOFUCRAFT!!!` }
  ];
};

export const loader: LoaderFunction = async ({ params }) => {
  const { type, id } = params;
  
  if (!type || !id) {
    throw new Response("Invalid parameters", { status: 400 });
  }

  if (!['ban', 'kick', 'warn'].includes(type)) {
    throw new Response("Invalid punishment type", { status: 400 });
  }

  try {
    const punishment = await findPunishmentById(id, type);
    if (!punishment) throw new Response("処罰情報が見つかりません", { status: 404 });
    return json({ punishment }, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
      }
    });
  } catch (error) {
    console.error("処罰詳細取得エラー:", error);
    throw new Response("処罰データの取得に失敗しました", { status: 500 });
  }
};

function getPunishmentTypeDisplay(type: string) {
  switch (type) {
    case 'ban':
      return { name: 'BAN', color: 'red' };
    case 'kick':
      return { name: 'KICK', color: 'orange' };
    case 'warn':
      return { name: '警告', color: 'yellow' };
    default:
      return { name: type, color: 'gray' };
  }
}

function getPunishmentDate(punishment: any) {
  return punishment.banned_at || punishment.kicked_at || punishment.warned_at;
}

function getUntilDate(punishment: any) {
  return punishment.until;
}

function getPunishmentExecutor(punishment: any) {
  return {
    name: punishment.banned_by || punishment.kicked_by || punishment.warned_by,
    uuid: punishment.banned_by_uuid || punishment.kicked_by_uuid || punishment.warned_by_uuid
  };
}

export default function PunishmentDetailPage() {
  const initial = useLoaderData<typeof loader>();
  const [punishment, setPunishment] = useState(initial.punishment);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLatest = async () => {
      const res = await fetch(window.location.pathname);
      if (res.ok) {
        const latest = await res.json();
        if (JSON.stringify(latest.punishment) !== JSON.stringify(punishment)) {
          setPunishment(latest.punishment);
        }
      }
    };
    fetchLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeDisplay = getPunishmentTypeDisplay(punishment.type);
  const punishmentDate = getPunishmentDate(punishment);
  const executor = getPunishmentExecutor(punishment);

  // 処罰タイプに応じた具体的なクラス名を設定
  const getHeaderClasses = () => {
    switch (punishment.type) {
      case 'ban':
        return 'bg-gradient-to-r from-red-900 to-red-600 dark:from-red-950 dark:to-red-700 text-white rounded-t-lg shadow-lg';
      case 'kick':
        return 'bg-gradient-to-r from-orange-900 to-orange-600 dark:from-orange-950 dark:to-orange-700 text-white rounded-t-lg shadow-lg';
      case 'warn':
        return 'bg-gradient-to-r from-yellow-900 to-yellow-600 dark:from-yellow-950 dark:to-yellow-700 text-white rounded-t-lg shadow-lg';
      default:
        return 'bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-950 dark:to-gray-700 text-white rounded-t-lg shadow-lg';
    }
  };

  const getButtonClasses = () => {
    switch (punishment.type) {
      case 'ban':
        return 'inline-flex items-center gap-2 text-red-100 dark:text-red-50 hover:text-white mb-4 transition-colors';
      case 'kick':
        return 'inline-flex items-center gap-2 text-orange-100 dark:text-orange-50 hover:text-white mb-4 transition-colors';
      case 'warn':
        return 'inline-flex items-center gap-2 text-yellow-100 dark:text-yellow-50 hover:text-white mb-4 transition-colors';
      default:
        return 'inline-flex items-center gap-2 text-gray-100 dark:text-gray-50 hover:text-white mb-4 transition-colors';
    }
  };

  const getPlayerInfoClasses = () => {
    switch (punishment.type) {
      case 'ban':
        return 'mt-2 font-bold text-red-100 dark:text-red-50';
      case 'kick':
        return 'mt-2 font-bold text-orange-100 dark:text-orange-50';
      case 'warn':
        return 'mt-2 font-bold text-yellow-100 dark:text-yellow-50';
      default:
        return 'mt-2 font-bold text-gray-100 dark:text-gray-50';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* ヘッダーセクション */}
      <div className={getHeaderClasses()}>
        <div className="p-6">
          <Link
            to="/punishments/bans"
            className={getButtonClasses()}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            処罰リストに戻る
          </Link>
          <h1 className="text-4xl font-extrabold font-raleway">この{typeDisplay.name}の詳細</h1>
        </div>
      </div>

      {/* 詳細情報 */}
      <div className="bg-gray-50 dark:bg-neutral-800 rounded-b-lg shadow-lg p-6">
        {/* プレイヤー情報カード */}
        <div className="bg-white dark:bg-neutral-700 rounded-lg p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4 mb-4">
            <img
              src={`https://mc-heads.net/avatar/${punishment.uuid || "Steve"}/64`}
              alt={punishment.name || "Unknown"}
              className="w-16 h-16 rounded-lg shadow-sm"
            />
            <div>
              <Link
                to={`/players/${punishment.uuid}`}
                className="text-2xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
              >
                {punishment.name || "Unknown"}
              </Link>
              <p className="mt-2 font-bold text-gray-600 dark:text-gray-300">UUID: <span className="uuid-text">{punishment.uuid || "N/A"}</span></p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  punishment.type === 'ban' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' :
                  punishment.type === 'kick' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200' :
                  'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
                }`}>
                  {typeDisplay.name}
                </span>
                {punishment.type === 'ban' && !punishment.active && (
                  <>
                    {(punishment.expires_at > 0 && punishment.expires_at < Date.now()) ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">
                        期限切れ
                      </span>
                    ) : punishment.removed_by_name ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                        手動解除
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        無効
                      </span>
                    )}
                  </>
                )}
                {punishment.type === 'warn' && !punishment.active && (
                  <>
                    {(punishment.until > 0 && punishment.until < Date.now()) ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">
                        期限切れ
                      </span>
                    ) : punishment.removed_by_name ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                        手動取り消し
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        無効
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p><span className="font-medium">処罰日時:</span> {new Date(punishmentDate).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>

        {/* ステータス情報 (BANと警告の場合) */}
        {(punishment.type === 'ban' || punishment.type === 'warn') && (
          <div className={`grid gap-6 mb-6 ${punishment.type === 'ban' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            <div className="bg-white dark:bg-neutral-700 rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {punishment.type === 'ban' ? 'BAN期限' : '累積加算期限'}
                </h3>
              </div>
              <p className="text-gray-700 dark:text-gray-200">
                {punishment.type === 'ban' ? (
                  <>
                    {punishment.expires_at > 0 ? (
                      <span className="text-gray-700 dark:text-gray-200 font-medium">
                        {new Date(punishment.expires_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        まで
                      </span>
                    ) : (
                      <span className="text-red-700 dark:text-red-400 font-bold">永久BAN</span>
                    )}
                  </>
                ) : (
                  <>
                    {punishment.until > 0 ? (
                      <>
                        <span className="text-gray-700 dark:text-gray-200 font-medium">
                          {new Date(punishment.until).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          まで
                        </span>
                        <br />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          警告回数での累積システムについて（準備中）
                        </span>
                      </>
                    ) : (
                      <span className="text-red-700 dark:text-red-400 font-bold">永久警告</span>
                    )}
                  </>
                )}
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-700 rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M13 5l7 7-7 7" />
                </svg>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">ステータス</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-200">
                <span className={`inline-flex items-center gap-1 font-medium ${
                  punishment.active ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={punishment.active ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                  </svg>
                  {punishment.active ? '有効' :
                    ((punishment.expires_at > 0 && punishment.expires_at < Date.now()) || (punishment.until > 0 && punishment.until < Date.now())) ? '期限切れ' :
                    punishment.removed_by_name ? (punishment.type === 'ban' ? '手動解除済み' : '手動取り消し済み') :
                    'その他'}
                </span>
              </p>
            </div>

            {punishment.type === 'ban' && (
              <div className="bg-white dark:bg-neutral-700 rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">IP BAN</h3>
                </div>
                <p className="text-gray-700 dark:text-gray-200">
                  {punishment.ipban ? (
                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      有効
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      無効
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* 解除情報（BANや警告で解除済みの場合のみ表示） */}
        {(punishment.type === 'ban' || punishment.type === 'warn') && !punishment.active && punishment.removed_by_name && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-bold text-green-800 dark:text-green-300">
                {punishment.type === 'ban' ? 'BAN解除情報' : '警告取り消し情報'}
              </h3>
            </div>
            <div className="grid gap-4 text-green-700 dark:text-green-200">
              <div>
                <span className="font-medium">
                  {punishment.type === 'ban' ? '解除者:' : '取り消し者:'}
                </span> {punishment.removed_by_name}
              </div>
              {punishment.removed_by_date && (
                <div>
                  <span className="font-medium">
                    {punishment.type === 'ban' ? '解除日時:' : '取り消し日時:'}
                  </span> {new Date(punishment.removed_by_date).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
              {punishment.removed_by_reason && (
                <div>
                  <span className="font-medium">
                    {punishment.type === 'ban' ? '解除理由:' : '取り消し理由:'}
                  </span> {punishment.removed_by_reason}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 処罰理由 */}
        <div className="bg-white dark:bg-neutral-700 rounded-lg p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">処罰理由</h3>
          </div>
          <p className="text-gray-700 dark:text-gray-200 text-lg">{punishment.reason || "（理由の記載なし）"}</p>
        </div>

        {/* 実行者情報 */}
        <div className="bg-white dark:bg-neutral-700 rounded-lg p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">実行者</h3>
          </div>
          <div className="flex items-center gap-4">
            <img
              src={`https://mc-heads.net/avatar/${executor.uuid || "Steve"}/48`}
              alt={executor.name || "Unknown"}
              className="w-12 h-12 rounded-lg shadow-sm"
            />
            <div>
              {executor.uuid ? (
                <Link
                  to={`/players/${executor.uuid}`}
                  className="font-medium text-lg text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                >
                  {executor.name}
                </Link>
              ) : (
                <p className="font-medium text-lg text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors">{executor.name}</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}