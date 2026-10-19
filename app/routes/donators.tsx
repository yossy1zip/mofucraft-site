import { json, LoaderFunction, MetaFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useState } from "react";
import { hapticTap, hapticToggle } from "~/utils/haptic";
import { getAllDonorMembers } from "~/utils/luckperms.server";
import { getDonorRoleBadgeInfo } from "~/utils/luckperms";
import { SpeechBubble } from "~/components/SpeechBubble";
import { getDonations } from "~/utils/strapi.server";

export const meta: MetaFunction = () => [
  { title: "寄付者一覧 - MOFUCRAFT!!!" }
];

interface DonorMember {
  uuid: string;
  username: string | null;
  donor_role: string | null;
  is_donor: boolean;
}

interface DonationHistory {
  id: number;
  minecraft_username: string;
  minecraft_uuid: string | null;
  price: number;
  donated_at: string;
  is_anonymous: boolean;
}

interface LoaderData {
  donorMembers: DonorMember[];
  donationHistory: DonationHistory[];
}

export const loader: LoaderFunction = async () => {
  try {
    // LuckPerms と Strapi から並行でデータ取得
    const [allDonorMembers, donations] = await Promise.all([
      getAllDonorMembers(),
      getDonations(),
    ]);

    // 重複するUUIDを除去し、最高のランクを持つもののみを保持
    const uniqueDonorMembers = allDonorMembers.reduce((acc, member) => {
      const existingMember = acc.find(m => m.uuid === member.uuid);

      if (!existingMember) {
        acc.push(member);
      } else {
        // ランクの優先順位: diamond > gold > iron
        const rankPriority = {
          'diamond': 1,
          'gold': 2,
          'iron': 3
        };

        const currentPriority = rankPriority[member.donor_role as keyof typeof rankPriority] || 999;
        const existingPriority = rankPriority[existingMember.donor_role as keyof typeof rankPriority] || 999;

        if (currentPriority < existingPriority) {
          // より高いランクの場合、既存のものを置き換え
          const index = acc.findIndex(m => m.uuid === member.uuid);
          acc[index] = member;
        }
      }

      return acc;
    }, [] as DonorMember[]);

    // 寄付履歴を日付順（新しい順）にソート
    const donationHistory: DonationHistory[] = donations
      .map(d => ({
        id: d.id,
        minecraft_username: d.minecraft_username,
        minecraft_uuid: d.minecraft_uuid,
        price: Number(d.price) || 0,
        donated_at: d.donated_at,
        is_anonymous: d.is_anonymous,
      }))
      .sort((a, b) => new Date(b.donated_at).getTime() - new Date(a.donated_at).getTime());

    return json({ donorMembers: uniqueDonorMembers, donationHistory });
  } catch (error) {
    console.error("寄付者データ取得エラー:", error);
    return json({ donorMembers: [], donationHistory: [] });
  }
};

export default function DonatorsPage() {
  const { donorMembers, donationHistory } = useLoaderData<LoaderData>();
  const [viewMode, setViewMode] = useState<"rank" | "history">("rank");

  // ランクごとにグループ分け
  const groupedDonors = {
    diamond: donorMembers.filter(member => member.donor_role === 'diamond'),
    gold: donorMembers.filter(member => member.donor_role === 'gold'),
    iron: donorMembers.filter(member => member.donor_role === 'iron')
  };

  // ランク別のカードスタイルを取得
  const getCardStyles = (role: string | null) => {
    switch (role) {
      case 'diamond':
        return {
          bg: 'bg-gradient-to-br from-white to-cyan-50 dark:from-neutral-700 dark:to-cyan-900/30',
          border: 'border-l-4 border-cyan-500 dark:border-cyan-600',
          hover: 'hover:shadow-cyan-500/20 hover:shadow-2xl hover:border-cyan-600 dark:hover:border-cyan-500',
          glow: 'group-hover:shadow-cyan-500/30'
        };
      case 'gold':
        return {
          bg: 'bg-gradient-to-br from-white to-yellow-50 dark:from-neutral-700 dark:to-yellow-900/30',
          border: 'border-l-4 border-yellow-500 dark:border-yellow-600',
          hover: 'hover:shadow-yellow-500/20 hover:shadow-2xl hover:border-yellow-600 dark:hover:border-yellow-500',
          glow: 'group-hover:shadow-yellow-500/30'
        };
      case 'iron':
        return {
          bg: 'bg-gradient-to-br from-white to-gray-50 dark:from-neutral-700 dark:to-neutral-800',
          border: 'border-l-4 border-gray-500 dark:border-gray-600',
          hover: 'hover:shadow-gray-500/20 hover:shadow-2xl hover:border-gray-600 dark:hover:border-gray-500',
          glow: 'group-hover:shadow-gray-500/30'
        };
      default:
        return {
          bg: 'bg-white dark:bg-neutral-700',
          border: 'border-l-4 border-gray-300 dark:border-neutral-600',
          hover: 'hover:shadow-xl',
          glow: ''
        };
    }
  };

  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 寄付履歴表示
  const renderDonationHistory = () => {
    if (donationHistory.length === 0) {
      return (
        <div className="bg-white dark:bg-neutral-700 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-300">寄付履歴がありません</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {donationHistory.map((donation) => (
          <div
            key={donation.id}
            className="bg-white dark:bg-neutral-700 border-l-4 border-teal-500 rounded-lg p-4 transition-all duration-300 hover:shadow-lg"
          >
            <div className="flex items-center gap-4">
              {/* アバター */}
              {donation.is_anonymous ? (
                <div className="w-12 h-12 rounded-lg shadow-md bg-gray-300 dark:bg-neutral-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-500 dark:text-gray-400 text-xl">?</span>
                </div>
              ) : donation.minecraft_uuid ? (
                <Link to={`/players/${donation.minecraft_uuid}`} className="flex-shrink-0">
                  <img
                    src={`https://mc-heads.net/avatar/${donation.minecraft_uuid}/48`}
                    alt={donation.minecraft_username}
                    className="w-12 h-12 rounded-lg shadow-md hover:scale-105 transition-transform"
                  />
                </Link>
              ) : (
                <div className="w-12 h-12 rounded-lg shadow-md bg-gray-300 dark:bg-neutral-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-500 dark:text-gray-400 text-xl">?</span>
                </div>
              )}

              {/* プレイヤー情報 */}
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                {donation.is_anonymous ? (
                  <span className="font-bold text-gray-500 dark:text-gray-400 truncate italic">
                    匿名ユーザー
                  </span>
                ) : donation.minecraft_uuid ? (
                  <Link
                    to={`/players/${donation.minecraft_uuid}`}
                    className="font-bold text-gray-800 dark:text-gray-100 truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {donation.minecraft_username}
                  </Link>
                ) : (
                  <span className="font-bold text-gray-800 dark:text-gray-100 truncate">
                    {donation.minecraft_username}
                  </span>
                )}
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(donation.donated_at)}
                </span>
              </div>

              {/* 寄付金額 */}
              <div className="text-right flex-shrink-0">
                <span className="text-xl font-bold text-teal-600 dark:text-teal-400">
                  ¥{donation.price.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDonorGroup = (roleKey: string, members: DonorMember[]) => {
    if (members.length === 0) return null;

    const badgeInfo = getDonorRoleBadgeInfo(roleKey);

    return (
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          {badgeInfo && (
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold ${badgeInfo.bgColor} ${badgeInfo.textColor} shadow-lg`}>
              {badgeInfo.label}
            </span>
          )}
          <span className="text-lg font-normal text-gray-600 dark:text-gray-300">({members.length}人)</span>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {members.map((member) => {
            const memberBadgeInfo = getDonorRoleBadgeInfo(member.donor_role);
            const cardStyles = getCardStyles(member.donor_role);

            return (
              <Link
                key={member.uuid}
                to={`/players/${member.uuid}`}
                className="group"
              >
                <div className={`${cardStyles.bg} ${cardStyles.border} rounded-lg shadow-md ${cardStyles.hover} transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 overflow-hidden relative`}>
                  {/* 豪華なグロー効果 */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${cardStyles.glow} blur-xl`}></div>

                  {/* キラキラエフェクト */}
                  <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-70 transition-all duration-700 delay-100 animate-pulse"></div>
                  <div className="absolute top-4 right-6 w-1 h-1 bg-white rounded-full opacity-0 group-hover:opacity-50 transition-all duration-700 delay-200 animate-pulse"></div>
                  <div className="absolute top-6 right-3 w-1.5 h-1.5 bg-white rounded-full opacity-0 group-hover:opacity-60 transition-all duration-700 delay-300 animate-pulse"></div>

                  <div className="p-6 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={`https://mc-heads.net/avatar/${member.uuid}/64`}
                          alt={member.username || "Unknown"}
                          className="w-16 h-16 rounded-lg shadow-md flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                        />
                        {/* アバターのグロー効果 */}
                        <div className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300 ${cardStyles.glow} blur-md`}></div>
                      </div>

                      <div className="flex flex-col gap-2 items-start">
                        <h3 className="m-0 text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                          {member.username || "Unknown"}
                        </h3>
                        {memberBadgeInfo && (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${memberBadgeInfo.bgColor} ${memberBadgeInfo.textColor} transition-transform duration-300 group-hover:scale-105 self-start`}>
                            {memberBadgeInfo.label}
                          </span>
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
        <div className="bg-gradient-to-r from-teal-600 to-cyan-500 dark:from-teal-800 dark:to-cyan-700 text-white rounded-t-lg shadow-lg">
          <div className="p-6">
            <h1 className="text-5xl font-extrabold font-raleway">Donators</h1>
            <p className="mt-2 font-bold text-teal-100 dark:text-teal-200">MOFUCRAFTをご支援してくださっている方々</p>
          </div>
        </div>

        {/* 寄付者リストコンテンツ */}
        <div className="bg-gray-50 dark:bg-neutral-800 rounded-b-lg shadow-lg p-6">

          {/* 寄付についての説明 */}
          <div className="bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <svg className="w-10 h-10 text-neutral-600 dark:text-neutral-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-neutral-800 dark:text-neutral-200">
                <p className="font-semibold mb-1">寄付について</p>
                <p className="mb-2">
                  MOFUCRAFTは皆様からの寄付により運営されています。
                  サーバーの維持費や新機能の開発、より良いゲーム体験の提供のために使用させていただいています。
                </p>
                <p>
                  寄付の方法や特典については、
                  <Link to="/donation" className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 underline font-semibold mx-1">
                    寄付についてのページ
                  </Link>
                  をご覧ください。
                </p>
              </div>
            </div>
          </div>

          <p className="text-gray-700 dark:text-gray-200 my-12">日頃よりMOFUCRAFTをご支援してくださっている方々の紹介です。</p>

          {/* サーバー管理者からのメッセージ */}
          <div className="mb-8">
            <SpeechBubble
              avatarUrl="ExampleAdmin"
              avatarAlt="ExampleAdmin"
              avatarLabel="鯖主"
              avatarLabelColor="text-red-600 dark:text-red-400"
              title="心より感謝申し上げます！"
              message="皆様のご支援により、MOFUCRAFT!!!は運営を続けることができています。今後ともよろしくお願いいたします。"
              signature="- ExampleAdmin (サーバー管理者)"
              bubbleBorderColor="border-teal-500 dark:border-teal-600"
            />
          </div>
          <p className="text-gray-700 dark:text-gray-200 mb-2">このページは、Minecraftサーバー内の寄付者情報と連携して自動更新されています。</p>
          <p className="text-gray-700 dark:text-gray-200 mb-6">万が一、ご支援されているにもかかわらず、このページに表示されていない場合は、お手数ですが<Link to="/staff" className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 underline font-semibold mx-1">運営スタッフ</Link>までご連絡ください。</p>

          {/* 表示切り替えタブ */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { hapticToggle(); setViewMode("rank"); }}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                viewMode === "rank"
                  ? "bg-teal-600 text-white shadow-md"
                  : "bg-gray-200 dark:bg-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-neutral-500"
              }`}
            >
              ランク別
            </button>
            <button
              onClick={() => { hapticToggle(); setViewMode("history"); }}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                viewMode === "history"
                  ? "bg-teal-600 text-white shadow-md"
                  : "bg-gray-200 dark:bg-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-neutral-500"
              }`}
            >
              寄付履歴
            </button>
          </div>

          {/* 寄付者情報 */}
          {donorMembers.length > 0 || donationHistory.length > 0 ? (
            viewMode === "rank" ? (
              <div>
                {renderDonorGroup("diamond", groupedDonors.diamond)}
                {renderDonorGroup("gold", groupedDonors.gold)}
                {renderDonorGroup("iron", groupedDonors.iron)}
              </div>
            ) : (
              renderDonationHistory()
            )
          ) : (
            <div className="bg-white dark:bg-neutral-700 rounded-lg p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">寄付者情報の読み込み中...</p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">しばらくお待ちください</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}