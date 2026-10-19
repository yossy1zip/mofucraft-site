import { json, LoaderFunction, MetaFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useState, useMemo } from "react";
import { fetchAllCommunities, Community } from "~/utils/communities.server";
import { parseMinecraftText, segmentToStyle } from "~/utils/minecraft-color";

export const meta: MetaFunction = () => [
  { title: "コミュニティ一覧 - MOFUCRAFT!!!" }
];

interface LoaderData {
  communities: Community[];
}

type SortOrder = "date_desc" | "date_asc" | "members_desc" | "members_asc";
type JoinModeFilter = "all" | "public" | "invite_only";

export const loader: LoaderFunction = async () => {
  try {
    // 全コミュニティを取得（公開・非公開を問わず）
    // 運営上、非公開コミュニティも一覧に表示することで、プレイヤーが存在を知ることができる
    const communities = await fetchAllCommunities();

    return json({ communities });
  } catch (error) {
    console.error("コミュニティデータ取得エラー:", error);
    return json({ communities: [] });
  }
};

export default function CommunitiesPage() {
  const { communities } = useLoaderData<LoaderData>();

  // ソート順とフィルター状態
  const [sortOrder, setSortOrder] = useState<SortOrder>("date_desc");
  const [joinModeFilter, setJoinModeFilter] = useState<JoinModeFilter>("all");

  /**
   * 日付を yyyy/MM/dd 形式でフォーマット
   */
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  /**
   * join_mode に応じたタグスタイルを返す
   */
  const getJoinModeTag = (joinMode: string) => {
    if (joinMode === 'PUBLIC') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
          公開
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300">
          招待制
        </span>
      );
    }
  };

  /**
   * メンバー数の表示（max_members = 0 の場合は無制限）
   */
  const getMemberCountDisplay = (memberCount: number, maxMembers: number) => {
    if (maxMembers === 0) {
      return `${memberCount} / 無制限`;
    }
    return `${memberCount} / ${maxMembers}`;
  };

  /**
   * Minecraft カラーコード付き prefix を表示用にレンダリング
   */
  const renderPrefix = (prefix: string) => {
    const segments = parseMinecraftText(prefix);
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-bold shadow-sm bg-neutral-50 dark:bg-neutral-900/30">
        {segments.map((segment, index) => {
          const style = segmentToStyle(segment);
          // カラーコードが指定されていない場合は、デフォルトの色を設定
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
    );
  };

  /**
   * フィルタリング・ソート済みコミュニティリスト
   */
  const filteredAndSortedCommunities = useMemo(() => {
    let result = [...communities];

    // フィルタリング
    if (joinModeFilter === "public") {
      result = result.filter(c => c.join_mode === "PUBLIC");
    } else if (joinModeFilter === "invite_only") {
      result = result.filter(c => c.join_mode === "INVITE_ONLY");
    }

    // ソート
    result.sort((a, b) => {
      switch (sortOrder) {
        case "date_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "members_desc":
          return b.member_count - a.member_count;
        case "members_asc":
          return a.member_count - b.member_count;
        default:
          return 0;
      }
    });

    return result;
  }, [communities, sortOrder, joinModeFilter]);

  return (
    <>
      <div className="max-w-6xl mx-auto">
        {/* ヘッダーセクション */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-500 text-white rounded-t-lg shadow-lg">
          <div className="p-6">
            <h1 className="text-3xl md:text-5xl font-extrabold font-raleway">コミュニティ</h1>
            <p className="m-0 font-bold text-emerald-100">MOFUCRAFTのコミュニティ一覧</p>
          </div>
        </div>

        {/* コミュニティリストコンテンツ */}
        <div className="bg-gray-50 dark:bg-neutral-800 rounded-b-lg shadow-lg p-6">
          {/* 説明セクション */}
          <div className="mb-6">
            <p className="text-gray-700 dark:text-gray-300">
              MOFUCRAFTサーバー内で活動するコミュニティの一覧です。
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              気になるコミュニティがあれば、ゲーム内で参加してみましょう！
            </p>
          </div>

          {/* 注意事項 */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-1">コミュニティについて</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>コミュニティはプレイヤー同士のグループ活動を支援する機能です</li>
                  <li>「公開」コミュニティは誰でも参加できます</li>
                  <li>「招待制」コミュニティは既存メンバーからの招待が必要です</li>
                  <li>ゲーム内コマンドで参加・脱退が可能です</li>
                </ul>
              </div>
            </div>
          </div>

          {/* フィルター・ソートコントロール */}
          <div className="bg-white dark:bg-neutral-700 rounded-lg shadow-md p-4 mb-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* ソート順選択 */}
              <div>
                <label htmlFor="sort-order" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  並び替え
                </label>
                <select
                  id="sort-order"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                >
                  <option value="date_desc">作成日が新しい順</option>
                  <option value="date_asc">作成日が古い順</option>
                  <option value="members_desc">メンバー数が多い順</option>
                  <option value="members_asc">メンバー数が少ない順</option>
                </select>
              </div>

              {/* 公開・招待制フィルター */}
              <div>
                <label htmlFor="join-mode-filter" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  公開設定でフィルター
                </label>
                <select
                  id="join-mode-filter"
                  value={joinModeFilter}
                  onChange={(e) => setJoinModeFilter(e.target.value as JoinModeFilter)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                >
                  <option value="all">すべて表示</option>
                  <option value="public">公開のみ</option>
                  <option value="invite_only">招待制のみ</option>
                </select>
              </div>
            </div>

            {/* 結果数表示 */}
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold">{filteredAndSortedCommunities.length}</span> 件のコミュニティを表示中
              {communities.length !== filteredAndSortedCommunities.length && (
                <span className="text-gray-500 dark:text-gray-400 ml-2">
                  （全 {communities.length} 件）
                </span>
              )}
            </div>
          </div>

          {/* コミュニティ一覧 */}
          {filteredAndSortedCommunities.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              {filteredAndSortedCommunities.map((community) => (
                <div
                  key={community.id}
                  className="bg-white dark:bg-neutral-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                >
                  <div className="p-6 flex flex-col h-full">
                    {/* ヘッダー部分: コミュニティ名とjoin_modeタグ */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-0">
                        {community.name}
                      </h3>
                      {getJoinModeTag(community.join_mode)}
                    </div>

                    {/* prefixとid */}
                    <div className="flex items-center justify-between mb-3">
                      {/* prefix */}
                      <p className="text-sm text-gray-500 dark:text-gray-400 m-0">
                        略称:
                        <span className="ml-2">{renderPrefix(community.prefix)}</span>
                      </p>

                      {/* Slug（ID） */}
                      <p className="text-sm text-gray-500 dark:text-gray-400 m-0">
                        <span className="font-semibold">ID:</span>{" "}
                        <code className="bg-neutral-50 dark:bg-neutral-900/30 dark:text-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-mono text-sm before:content-none after:content-none">
                          {community.slug}
                        </code>
                      </p>
                    </div>

                    {/* 説明文 */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        {community.description || "（紹介文がありません）"}
                      </p>
                    </div>

                    {/* 活動拠点情報 */}
                    <div className="border-t border-gray-200 dark:border-neutral-600 pt-2 mt-2">
                      <div className="flex items-start gap-2 text-sm">
                        <div className="flex-1">
                          {community.base_name ? (
                            <>
                              <p className="text-sm text-gray-500 dark:text-gray-400 m-0">活動拠点: <span className="text-gray-800 dark:text-gray-200 mb-0">{community.base_name}</span></p>
                              <p className="text-gray-600 dark:text-gray-400 text-sm m-0">
                                <span className="font-mono">
                                  X: <span className="font-mono text-gray-800 dark:text-gray-200">{Math.floor(Number(community.base_x))}</span>,
                                  Y: <span className="font-mono text-gray-800 dark:text-gray-200">{Math.floor(Number(community.base_y))}</span>,
                                  Z: <span className="font-mono text-gray-800 dark:text-gray-200">{Math.floor(Number(community.base_z))}</span>
                                </span>
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 m-0">活動拠点: <span className="text-gray-600 dark:text-gray-200">（活動拠点情報がありません）</span></p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* メタ情報 */}
                    <div className="border-t border-gray-200 dark:border-neutral-600 pt-4 mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300 font-semibold">メンバー数:</span>
                        <span className="text-gray-800 dark:text-gray-100 font-bold">
                          {getMemberCountDisplay(community.member_count, community.max_members)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300 font-semibold">作成日:</span>
                        <span className="text-gray-800 dark:text-gray-100">
                          {formatDate(community.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* 詳細ボタン */}
                    <div className="mt-auto pt-4">
                      <Link
                        to={`/communities/${community.slug}`}
                        className="block w-full text-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                      >
                        詳細を表示
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-700 rounded-lg p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
                {joinModeFilter === "all"
                  ? "まだコミュニティはありません"
                  : "条件に一致するコミュニティはありません"}
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {joinModeFilter === "all"
                  ? "ゲーム内でコミュニティを作成すると、ここに表示されます"
                  : "フィルターを変更して再度お試しください"}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
