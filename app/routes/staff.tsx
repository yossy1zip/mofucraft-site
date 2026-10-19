import { json, LoaderFunction, MetaFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { getAllStaffMembers, getAllSupporterMembers } from "~/utils/luckperms.server";
import { getStaffRoleBadgeInfo } from "~/utils/luckperms";
import { getStaffProfiles, StrapiStaffProfile } from "~/utils/strapi.server";

export const meta: MetaFunction = () => [
  { title: "スタッフ一覧 - MOFUCRAFT!!!" }
];

interface StaffMember {
  uuid: string;
  username: string | null;
  staff_role: string | null;
  is_staff: boolean;
}

interface SupporterMember {
  uuid: string;
  username: string | null;
}

interface LoaderData {
  staffMembers: StaffMember[];
  staffProfiles: StrapiStaffProfile[];
  supporters: SupporterMember[];
}

export const loader: LoaderFunction = async () => {
  try {
    const [allStaffMembers, staffProfiles, supporters] = await Promise.all([
      getAllStaffMembers(),
      getStaffProfiles(),
      getAllSupporterMembers(),
    ]);
    
    // 特定ユーザーを除外
    const filteredMembers = allStaffMembers.filter(member => member.username !== 'Hisui_c');
    
    // 重複するUUIDを除去し、最高の権限を持つもののみを保持
    const uniqueStaffMembers = filteredMembers.reduce((acc, member) => {
      const existingMember = acc.find(m => m.uuid === member.uuid);
      
      if (!existingMember) {
        acc.push(member);
      } else {
        // 権限の優先順位: owner > admin > staff > helper
        const rolePriority = {
          'owner': 1,
          'admin': 2,
          'staff': 3,
          'helper': 4
        };
        
        const currentPriority = rolePriority[member.staff_role as keyof typeof rolePriority] || 999;
        const existingPriority = rolePriority[existingMember.staff_role as keyof typeof rolePriority] || 999;
        
        if (currentPriority < existingPriority) {
          // より高い権限の場合、既存のものを置き換え
          const index = acc.findIndex(m => m.uuid === member.uuid);
          acc[index] = member;
        }
      }
      
      return acc;
    }, [] as StaffMember[]);
    
    // supporter のみで staff にも該当しているプレイヤーを除外
    const staffUuidSet = new Set(uniqueStaffMembers.map((m) => m.uuid));
    const filteredSupporters = supporters
      .filter((s) => s.username !== 'Hisui_c')
      .filter((s) => !staffUuidSet.has(s.uuid));

    return json({ staffMembers: uniqueStaffMembers, staffProfiles, supporters: filteredSupporters });
  } catch (error) {
    console.error("スタッフデータ取得エラー:", error);
    return json({ staffMembers: [], staffProfiles: [], supporters: [] });
  }
};

export default function StaffPage() {
  const { staffMembers, staffProfiles, supporters } = useLoaderData<LoaderData>();

  // UUID からプロフィールを検索するヘルパー
  const getProfileByUuid = (uuid: string) => {
    return staffProfiles.find(p => p.uuid === uuid) || null;
  };

  // Strapi ID (登録順) でソートするためのマップ
  const profileIdMap = new Map<string, number>(
    staffProfiles.map(p => [p.uuid, p.id])
  );

  const sortByProfileId = (members: StaffMember[]) =>
    [...members].sort((a, b) => {
      const aId = profileIdMap.get(a.uuid) ?? Infinity;
      const bId = profileIdMap.get(b.uuid) ?? Infinity;
      return aId - bId;
    });

  // 役職ごとにグループ分け（同一役職内はStrapiのID順＝登録順）
  const groupedStaff = {
    owner: sortByProfileId(staffMembers.filter(member => member.staff_role === 'owner')),
    admin: sortByProfileId(staffMembers.filter(member => member.staff_role === 'admin')),
    staff: sortByProfileId(staffMembers.filter(member => member.staff_role === 'staff')),
    helper: sortByProfileId(staffMembers.filter(member => member.staff_role === 'helper'))
  };

  // LEGENDS（歴代スタッフ）のリスト
  const legends = [
    'senakai',
    'yoshidaHRK', 
    'Ayaya1234',
    'melonice',
    'Roxas010',
    'littlekaide',
    'hone_charon'
  ];

  const renderStaffGroup = (title: string, roleKey: string, members: StaffMember[]) => {
    if (members.length === 0) return null;

    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-3">
          <span>{title}</span>
          <span className="text-lg font-normal text-gray-600 dark:text-gray-300">({members.length}人)</span>
        </h2>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {members.map((member) => {
            const badgeInfo = getStaffRoleBadgeInfo(member.staff_role);
            const profile = getProfileByUuid(member.uuid);
            return (
              <Link
                key={member.uuid}
                to={`/players/${member.uuid}`}
                className="group h-full"
              >
                <div className="bg-white dark:bg-neutral-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden h-full">
                  <div className="p-6 h-full">
                    <div className="flex items-start gap-4">
                      <img
                        src={`https://mc-heads.net/avatar/${member.uuid}/64`}
                        alt={member.username || "Unknown"}
                        className="w-16 h-16 rounded-lg shadow-md flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {member.username || "Unknown"}
                          </h3>
                          {badgeInfo && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeInfo.bgColor} ${badgeInfo.textColor}`}>
                              {badgeInfo.label}
                            </span>
                          )}
                        </div>

                        {profile && (
                          <div className="space-y-2">
                            {profile.activity_periods && (
                              <div>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">活動期間:</span>
                                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-line">
                                  {profile.activity_periods}
                                </div>
                              </div>
                            )}
                            {profile.specialty && (
                              <div>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">得意分野:</span>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{profile.specialty}</p>
                              </div>
                            )}
                            {profile.hobby && (
                              <div>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">趣味:</span>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{profile.hobby}</p>
                              </div>
                            )}
                            {profile.mbti && (
                              <div>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">MBTI:</span>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{profile.mbti}</p>
                              </div>
                            )}
                            {profile.personal_comment && (
                              <div>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">本人コメント:</span>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{profile.personal_comment}</p>
                              </div>
                            )}
                            {profile.owner_comment && (
                              <div>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">鯖主から一言:</span>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{profile.owner_comment}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="max-w-6xl mx-auto text-gray-900 dark:text-gray-100">
        {/* ヘッダーセクション */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-700 dark:from-purple-950 dark:to-indigo-900 text-white rounded-t-lg shadow-lg">
          <div className="p-6">
            <h1 className="text-5xl font-extrabold font-raleway">Staff</h1>
            <p className="mt-2 font-bold text-purple-100 dark:text-purple-200">MOFUCRAFTの運営チームをご紹介します</p>
          </div>
        </div>

        {/* スタッフリストコンテンツ */}
        <div className="bg-gray-50 dark:bg-neutral-800 rounded-b-lg shadow-lg p-6">

          <p className="text-gray-700 dark:text-gray-200">もふもふな生活を助けてくれる優しいスタッフたちの紹介です！</p>
          <p className="text-gray-700 dark:text-gray-200">トップクラスの対応速度と丁寧さ、親しみやすさを持ってます！</p>
          <p className="text-gray-700 dark:text-gray-200">名前の最初に絵文字がついているのが目印！気軽に話しかけよう！</p>

          {/* 注意事項 */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 my-8">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-1">運営チームについて</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>運営チームへのお問い合わせは、公式Discordサーバーまたはサポートメール(support@example.com)をご利用ください。</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 採用について */}
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <div className="text-sm text-green-800 dark:text-green-200">
                <p className="font-semibold mb-1">スタッフ採用について</p>
                <p className="mb-2">MOFUCRAFTでは一緒にサーバーを盛り上げてくれるスタッフを募集しています！</p>
                <Link
                  to="/recruit"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  採用について詳しく見る
                </Link>
              </div>
            </div>
          </div>

          {/* ユーザー情報はLuckPermsから受けるが、コメントなど表示内容はstaff-profiles.jsonのデータに記載 */}
          {staffMembers.length > 0 ? (
            <div>
              {renderStaffGroup("鯖主", "owner", groupedStaff.owner)}
              {renderStaffGroup("管理者", "admin", groupedStaff.admin)}
              {renderStaffGroup("スタッフ", "staff", groupedStaff.staff)}
              {renderStaffGroup("お手伝いさん", "helper", groupedStaff.helper)}
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-700 rounded-lg p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">スタッフ情報の読み込み中...</p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">しばらくお待ちください</p>
            </div>
          )}

          {/* SUPPORTERS セクション */}
          {supporters.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-3">
                <span>SUPPORTERS</span>
                <span className="text-lg font-normal text-gray-600 dark:text-gray-300">({supporters.length}人)</span>
              </h2>
              <div className="bg-pink-50 dark:bg-pink-900/30 border border-pink-200 dark:border-pink-800 rounded-lg p-6 mb-6">
                <p className="text-pink-800 dark:text-pink-200 mb-1">
                  サーバーを支えてくれているサポーターのみなさんです。
                </p>
                <p className="text-pink-700 dark:text-pink-300 text-sm">
                  日々の運営にご協力いただきありがとうございます！
                </p>
              </div>

              <div className="bg-white dark:bg-neutral-700 rounded-lg shadow-md p-6 mb-12">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {supporters.map((supporter) => (
                    <Link
                      key={supporter.uuid}
                      to={`/players/${supporter.uuid}`}
                      className="group"
                    >
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-neutral-600 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-600 transition-colors duration-200 hover:shadow-md">
                        <img
                          src={`https://mc-heads.net/avatar/${supporter.uuid}/32`}
                          alt={supporter.username || "Unknown"}
                          className="w-8 h-8 rounded-md shadow-sm"
                        />
                        <span className="text-gray-800 dark:text-gray-200 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {supporter.username || "Unknown"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* LEGENDS セクション */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">LEGENDS</h2>
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-6">
              <p className="text-amber-800 dark:text-amber-200 mb-3">
                比較的長期間、突出した活動を記録した歴代スタッフです。
              </p>
              <p className="text-amber-700 dark:text-amber-300 text-sm">
                ここに載っていない方にも多くの力になっていただきましたが、スペースの都合で割愛させていただきます。
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-700 rounded-lg shadow-md p-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {legends.map((legendName, index) => (
                  <Link
                    key={index}
                    to={`/players/${legendName}`}
                    className="group"
                  >
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-neutral-600 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-600 transition-colors duration-200 hover:shadow-md">
                      <img
                        src={`https://mc-heads.net/avatar/${legendName}/32`}
                        alt={legendName}
                        className="w-8 h-8 rounded-md shadow-sm"
                      />
                      <span className="text-gray-800 dark:text-gray-200 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {legendName}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}