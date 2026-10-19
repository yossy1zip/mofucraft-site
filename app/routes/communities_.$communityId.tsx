import { json, LoaderFunction, MetaFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { fetchCommunityByIdOrSlug, fetchCommunityMembers, Community, CommunityMember } from "~/utils/communities.server";
import { parseMinecraftText, segmentToStyle } from "~/utils/minecraft-color";
import NotFound from "~/components/NotFound";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data?.community?.name ? `${data.community.name} - コミュニティ - MOFUCRAFT!!!` : "コミュニティ - MOFUCRAFT!!!" }
];

interface LoaderData {
  community: Community;
  members: CommunityMember[];
}

export const loader: LoaderFunction = async ({ params }) => {
  const { communityId } = params;

  if (!communityId) {
    throw new Response("Not Found", { status: 404 });
  }

  try {
    const community = await fetchCommunityByIdOrSlug(communityId);

    if (!community) {
      throw new Response("Not Found", { status: 404 });
    }

    const members = await fetchCommunityMembers(community.id);

    return json({ community, members });
  } catch (error) {
    console.error("コミュニティ詳細取得エラー:", error);
    throw new Response("Internal Server Error", { status: 500 });
  }
};

export function ErrorBoundary() {
  return <NotFound />;
}

export default function CommunityDetailPage() {
  const { community, members } = useLoaderData<LoaderData>();

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
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
          公開
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300">
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
      return `${memberCount} / ∞`;
    }
    return `${memberCount} / ${maxMembers}`;
  };

  /**
   * Minecraft カラーコード付き prefix を表示用にレンダリング
   */
  const renderPrefix = (prefix: string) => {
    const segments = parseMinecraftText(prefix);
    return (
      <span className="inline-flex items-center px-4 py-2 rounded-md text-base font-bold shadow-sm bg-neutral-50 dark:bg-neutral-900/30">
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
   * roleに応じたバッジを返す
   */
  const getRoleBadge = (role: string) => {
    const roleMap: { [key: string]: { label: string; bgColor: string; textColor: string } } = {
      'OWNER': { label: 'オーナー', bgColor: 'bg-red-100 dark:bg-red-900/40', textColor: 'text-red-800 dark:text-red-300' },
      'MOD': { label: 'モデレーター', bgColor: 'bg-orange-100 dark:bg-orange-900/40', textColor: 'text-orange-800 dark:text-orange-300' },
      'MEMBER': { label: 'メンバー', bgColor: 'bg-blue-100 dark:bg-blue-900/40', textColor: 'text-blue-800 dark:text-blue-300' },
    };

    const roleInfo = roleMap[role.toUpperCase()] || { label: role, bgColor: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-800 dark:text-gray-300' };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleInfo.bgColor} ${roleInfo.textColor}`}>
        {roleInfo.label}
      </span>
    );
  };

  /**
   * ロールの優先順位を取得（ソート用）
   */
  const getRolePriority = (role: string): number => {
    const priorityMap: { [key: string]: number } = {
      'OWNER': 1,
      'MOD': 2,
      'MEMBER': 3,
    };
    return priorityMap[role.toUpperCase()] || 99;
  };

  // メンバーをロール順にソート
  const sortedMembers = [...members].sort((a, b) => {
    const priorityA = getRolePriority(a.role);
    const priorityB = getRolePriority(b.role);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    // 同じロールの場合は加入日順
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });

  return (
    <>
      <div className="max-w-6xl mx-auto">
        {/* ヘッダーセクション */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-500 text-white rounded-t-lg shadow-lg">
          <div className="p-6">
            {/* 戻るリンク */}
            <Link to="/communities" className="inline-flex items-center text-emerald-100 hover:text-white mb-4 transition-colors">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              コミュニティ一覧に戻る
            </Link>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl md:text-5xl font-extrabold font-raleway mb-2">{community.name}</h1>
                <div className="flex items-center gap-3 mt-3">
                  {renderPrefix(community.prefix)}
                  {getJoinModeTag(community.join_mode)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="bg-gray-50 dark:bg-neutral-800 rounded-b-lg shadow-lg p-6">
          {/* コミュニティ情報 */}
          <div className="bg-white dark:bg-neutral-700 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">コミュニティ情報</h2>

            <div className="space-y-4">
              {/* ID */}
              <div className="flex items-start gap-2">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 min-w-[100px]">ID:</span>
                <code className="bg-neutral-50 dark:bg-neutral-900/30 dark:text-neutral-200 text-neutral-700 px-2 py-1 rounded font-mono text-sm">
                  {community.slug}
                </code>
              </div>

              {/* 説明 */}
              <div className="flex items-start gap-2">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 min-w-[100px]">説明:</span>
                <p className="text-sm text-gray-800 dark:text-gray-200 flex-1">
                  {community.description || "（紹介文がありません）"}
                </p>
              </div>

              {/* メンバー数 */}
              <div className="flex items-start gap-2">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 min-w-[100px]">メンバー数:</span>
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  {getMemberCountDisplay(community.member_count, community.max_members)}
                </span>
              </div>

              {/* 作成日 */}
              <div className="flex items-start gap-2">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 min-w-[100px]">作成日:</span>
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  {formatDate(community.created_at)}
                </span>
              </div>

              {/* 活動拠点 */}
              {community.base_name ? (
                <>
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 min-w-[100px]">活動拠点:</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">
                      {community.base_name}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 min-w-[100px]">座標:</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200 font-mono">
                      X: {Math.floor(community.base_x || 0)}, Y: {Math.floor(community.base_y || 0)}, Z: {Math.floor(community.base_z || 0)}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 min-w-[100px]">ワールド:</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">
                      {community.base_world}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 min-w-[100px]">活動拠点:</span>
                  <span className="text-sm text-gray-600 dark:text-gray-500">
                    （活動拠点情報がありません）
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* メンバーリスト */}
          <div className="bg-white dark:bg-neutral-700 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              メンバー一覧 ({members.length}人)
            </h2>

            {members.length > 0 ? (
              <div className="bg-white dark:bg-neutral-700 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 dark:bg-neutral-600">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                          ロール
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                          プレイヤー
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                          加入日
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-neutral-600">
                      {sortedMembers.map((member) => (
                        <tr
                          key={member.player_uuid}
                          className="hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getRoleBadge(member.role)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <img
                                src={`https://mc-heads.net/avatar/${member.player_uuid}/32`}
                                alt={member.player_name || member.player_uuid}
                                className="w-8 h-8 rounded-md shadow-sm"
                              />
                              <div>
                                <Link
                                  to={`/players/${member.player_uuid}`}
                                  className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                                >
                                  {member.player_name || member.player_uuid}
                                </Link>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
                            {formatDate(member.joined_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
                  まだメンバーがいません
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
