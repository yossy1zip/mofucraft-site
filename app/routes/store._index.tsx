import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { useState, useEffect } from "react";
import { getTebexTiers, getRecentPurchases, getPaymentsLast12Months, getPaymentsLastMonth, getTebexSinglePurchaseItems, type TebexTier, type TebexPayment, type TebexSinglePurchaseItem } from "~/utils/strapi";
import { decodeHtmlEntities } from "~/utils/htmlDecode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCreditCard } from "@fortawesome/free-solid-svg-icons";
import { faPaypal, faApple, faGoogle } from "@fortawesome/free-brands-svg-icons";

// 参考為替レート（USD → JPY）
const USD_TO_JPY_RATE = 150;

// ランキングデータの型
interface TopDonor {
  username: string;
  total: number;
}

// 金額を円に変換する関数
function convertToJPY(price: number, currency: string): number {
  if (currency === "JPY") {
    return price;
  }
  // USD, EUR などは円に変換（参考レート）
  return Math.round(price * USD_TO_JPY_RATE);
}

// プレイヤーごとに金額を集計してランキングを作成（円換算）
function aggregateTopDonors(payments: TebexPayment[]): TopDonor[] {
  const donorMap = new Map<string, number>();

  payments.forEach((payment) => {
    const username = payment.minecraft_username || payment.minecraft_uuid;
    const current = donorMap.get(username) || 0;
    const priceInJPY = convertToJPY(payment.price, payment.currency);
    donorMap.set(username, current + priceInJPY);
  });

  return Array.from(donorMap.entries())
    .map(([username, total]) => ({ username, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

// 月間合計金額を算出（円換算）
function calculateMonthlyTotal(payments: TebexPayment[]): number {
  return payments.reduce((sum, payment) => sum + convertToJPY(payment.price, payment.currency), 0);
}

export const meta: MetaFunction = () => [
  { title: "ストア - MOFUCRAFT!!!" },
  { name: "description", content: "MOFUCRAFT!!!の支援プランをご覧ください。サーバーの維持と発展にご協力をお願いします。" },
  { property: "og:title", content: "ストア - MOFUCRAFT!!!" },
  { property: "og:type", content: "website" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    console.log('[Store] Loading Tebex data...');
    const [tiers, recentPurchases, paymentsLast12Months, paymentsLastMonth, singlePurchaseItems] = await Promise.all([
      getTebexTiers(),
      getRecentPurchases(),
      getPaymentsLast12Months(),
      getPaymentsLastMonth(),
      getTebexSinglePurchaseItems(),
    ]);
    console.log(`[Store] Loaded ${tiers.length} tiers, ${recentPurchases.length} recent purchases`);

    // 価格の安い順にソート
    const sortedTiers = [...tiers].sort((a, b) => a.price - b.price);

    // 集計処理
    const topDonors = aggregateTopDonors(paymentsLast12Months);
    const monthlyTotal = calculateMonthlyTotal(paymentsLastMonth);

    return json(
      {
        tiers: sortedTiers,
        recentPurchases,
        topDonors,
        monthlyTotal,
        singlePurchaseItems,
        error: null
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      }
    );
  } catch (error) {
    console.error("[Store] Failed to load Tebex data:", error);
    // エラー時は空の配列とエラーメッセージを返す
    return json(
      {
        tiers: [],
        recentPurchases: [],
        topDonors: [],
        monthlyTotal: 0,
        singlePurchaseItems: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      }
    );
  }
}

// 相対時間を計算するヘルパー関数
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "たった今";
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  return date.toLocaleDateString("ja-JP");
}

// 購入モーダルの状態型
interface PurchaseModalState {
  isOpen: boolean;
  tier: TebexTier | null;
  singlePurchaseItem: TebexSinglePurchaseItem | null;
  isSubscription: boolean;
  purchaseQuantity: number;
}

export default function Store() {
  const { tiers, recentPurchases, topDonors, monthlyTotal, singlePurchaseItems, error } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"subscription" | "one-time">("subscription");

  // 購入モーダルの状態
  const [purchaseModal, setPurchaseModal] = useState<PurchaseModalState>({
    isOpen: false,
    tier: null,
    singlePurchaseItem: null,
    isSubscription: true,
    purchaseQuantity: 1,
  });

  // 購入完了/キャンセル時のメッセージ表示
  const purchaseStatus = searchParams.get("purchased");
  const [showPurchaseMessage, setShowPurchaseMessage] = useState(!!purchaseStatus);

  useEffect(() => {
    if (purchaseStatus === "cancelled") {
      // キャンセル時は5秒後に非表示
      const timer = setTimeout(() => setShowPurchaseMessage(false), 5000);
      return () => clearTimeout(timer);
    }
    // 購入完了時はモーダルを表示したまま（ユーザーが閉じるまで消えない）
  }, [purchaseStatus]);

  // サブスクモーダルを開く
  const openPurchaseModal = (tier: TebexTier) => {
    setPurchaseModal({ isOpen: true, tier, singlePurchaseItem: null, isSubscription: true, purchaseQuantity: 1 });
  };

  // 単品購入モーダルを開く
  const openSinglePurchaseModal = (item: TebexSinglePurchaseItem) => {
    setPurchaseModal({ isOpen: true, tier: null, singlePurchaseItem: item, isSubscription: false, purchaseQuantity: 1 });
  };

  // モーダルを閉じる
  const closePurchaseModal = () => {
    setPurchaseModal({ isOpen: false, tier: null, singlePurchaseItem: null, isSubscription: true, purchaseQuantity: 1 });
  };

  return (
    <div className="max-w-6xl mx-auto text-gray-900 dark:text-gray-100">
      {/* ヘッダーセクション */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-500 dark:from-teal-800 dark:to-cyan-700 text-white rounded-t-lg shadow-lg">
        <div className="p-6">
          <h1 className="text-5xl font-extrabold font-raleway">Store</h1>
          <p className="mt-2 font-bold text-teal-100 dark:text-teal-200">MOFUCRAFTを支援して、特別な特典を手に入れよう</p>
        </div>
      </div>

      {/* 購入モーダル */}
      {purchaseModal.isOpen && (purchaseModal.tier || purchaseModal.singlePurchaseItem) && (
        <PurchaseModal
          name={purchaseModal.isSubscription ? purchaseModal.tier!.name : purchaseModal.singlePurchaseItem!.name}
          price={purchaseModal.isSubscription ? purchaseModal.tier!.price : purchaseModal.singlePurchaseItem!.price}
          jpy_price={purchaseModal.isSubscription ? purchaseModal.tier!.jpy_price : purchaseModal.singlePurchaseItem!.jpy_price}
          tebex_package_id={purchaseModal.isSubscription ? purchaseModal.tier!.tebex_package_id : purchaseModal.singlePurchaseItem!.tebex_package_id}
          isSubscription={purchaseModal.isSubscription}
          singlePurchaseItem={purchaseModal.isSubscription ? null : purchaseModal.singlePurchaseItem}
          onClose={closePurchaseModal}
        />
      )}

      {/* コンテンツエリア */}
      <div className="bg-gray-50 dark:bg-neutral-800 rounded-b-lg shadow-lg p-6">
        {/* 購入完了モーダル */}
        {showPurchaseMessage && purchaseStatus === "success" && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8">
                <div className="flex flex-col items-center text-center text-white">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">購入が完了しました！</h2>
                  <p className="text-lg text-white/90">ご支援ありがとうございます</p>
                </div>
              </div>
              <div className="p-6">
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg px-5 py-4 mb-6">
                  <p className="text-sm text-green-900 dark:text-green-200 text-center leading-relaxed">
                    特典は数分以内にゲーム内に反映されます。<br />
                    反映されない場合は<a href="https://discord.gg/5hpyDwZCpN" className="underline font-medium hover:opacity-80" target="_blank" rel="noopener noreferrer">Discordサポート</a>へお問い合わせください。
                  </p>
                </div>
                <button
                  onClick={() => setShowPurchaseMessage(false)}
                  className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  ストアに戻る
                </button>
              </div>
            </div>
          </div>
        )}
        {showPurchaseMessage && purchaseStatus === "cancelled" && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-5 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-amber-900 dark:text-amber-200">
                <p className="font-bold mb-1">購入がキャンセルされました</p>
                <p>購入手続きがキャンセルされました。再度お試しください。</p>
              </div>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-5 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-red-900 dark:text-red-200">
                <p className="font-bold mb-2">データの読み込みに失敗しました</p>
                <p>現在、プラン情報を取得できません。しばらくしてから再度お試しください。</p>
                {process.env.NODE_ENV === 'development' && (
                  <p className="mt-2 text-xs text-red-700 dark:text-red-300">エラー: {error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 支援統計セクション */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {/* 月間支援総額 */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-800/50 rounded-lg">
                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">今月の支援総額</h3>
            </div>
            <p className="text-3xl font-bold text-amber-900 dark:text-amber-200">
              約¥{monthlyTotal.toLocaleString("ja-JP")}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">過去30日間（参考値）</p>
          </div>

          {/* 最近の購入 */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-800 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 dark:bg-green-800/50 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">最近の購入</h3>
            </div>
            {recentPurchases.length > 0 ? (
              <ul className="space-y-2 max-h-32 overflow-y-auto">
                {recentPurchases.slice(0, 5).filter((p): p is NonNullable<typeof p> => p != null).map((purchase) => (
                  <li key={purchase.documentId} className="text-sm text-green-800 dark:text-green-200 flex justify-between items-center">
                    <span className="font-medium truncate max-w-[120px]">{purchase.minecraft_username || "Unknown"}</span>
                    <span className="text-xs text-green-600 dark:text-green-400">{getRelativeTime(purchase.purchased_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-600 dark:text-green-400">まだ購入履歴がありません</p>
            )}
          </div>

          {/* 年間ランキング */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-800/50 rounded-lg">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300">支援ランキング</h3>
            </div>
            {topDonors.length > 0 ? (
              <ul className="space-y-2 max-h-32 overflow-y-auto">
                {topDonors.slice(0, 5).filter((d): d is TopDonor => d !== null).map((donor, index) => (
                  <li key={donor.username} className="text-sm text-purple-800 dark:text-purple-200 flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className={`font-bold ${index === 0 ? "text-yellow-500" : index === 1 ? "text-gray-400" : index === 2 ? "text-amber-600" : "text-purple-500"}`}>
                        {index + 1}位
                      </span>
                      <span className="font-medium truncate max-w-[100px]">{donor.username}</span>
                    </span>
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">約¥{donor.total.toLocaleString("ja-JP")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-purple-600 dark:text-purple-400">まだランキングデータがありません</p>
            )}
            <p className="text-xs text-purple-500 dark:text-purple-400 mt-2">過去12ヶ月（参考値）</p>
          </div>
        </div>

        {/* タブ切り替え */}
        <div className="flex gap-2 mb-8 border-b border-gray-200 dark:border-neutral-700 pb-0">
          <button
            onClick={() => setActiveTab("subscription")}
            className={`py-2.5 px-5 rounded-t-lg font-semibold text-sm transition-colors border-b-2 -mb-px ${
              activeTab === "subscription"
                ? "border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-neutral-800"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            サブスクリプション
          </button>
          <button
            onClick={() => setActiveTab("one-time")}
            className={`py-2.5 px-5 rounded-t-lg font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === "one-time"
                ? "border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-neutral-800"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            単発購入・バフ
          </button>
        </div>

        {/* サブスクリプションタブ */}
        {activeTab === "subscription" && (
          <>
            {/* 為替変動注意 */}
            <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-amber-900 dark:text-amber-200">
                <strong>為替レートについて:</strong> サブスクリプションはすべて<strong>米ドル（USD）</strong>でご請求されます。表示の円換算額は参考値であり、実際の請求額は決済時の為替レートにより変動します。
              </p>
            </div>
            {/* Grid */}
            {tiers.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div id="plans" className="mt-4 scroll-mt-20">
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-white text-center mb-16">プラン一覧</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                    {tiers.map((tier, index) => (
                      tier && <TierCard key={tier.documentId} tier={tier} tierIndex={index} onPurchaseClick={openPurchaseModal} />
                    ))}
                  </div>
                </div>
              </>
            )}
            {/* End Grid */}
          </>
        )}

        {/* 単品購入タブ */}
        {activeTab === "one-time" && (
          <SinglePurchaseSection items={singlePurchaseItems} onPurchaseClick={openSinglePurchaseModal} />
        )}

        {/* Tebex決済情報 */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-5 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
              <p className="font-bold mb-2 text-base flex items-center gap-2">
                販売サイトについて
              </p>
              <p className="mb-3">
                ご購入は信頼性の高いプラットフォームである<strong className="text-blue-700 dark:text-blue-300">Tebex</strong>を通して行われます。
              </p>
              <div className="bg-white dark:bg-blue-950/30 rounded-lg p-3 mt-3">
                <p className="font-semibold mb-2 text-blue-800 dark:text-blue-300">ご利用可能なお支払い方法：</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faCreditCard} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span>クレジットカード / デビットカード (Visa, Mastercard, American Express, JCB)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faPaypal} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span>PayPal</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faApple} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <FontAwesomeIcon icon={faGoogle} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span>Apple Pay / Google Pay</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Gacha Explanation Section (サブスクのみ) */}
        {activeTab === "subscription" && <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            <div className="text-sm text-purple-900 dark:text-purple-200 leading-relaxed">
              <p className="font-bold mb-2 text-base">ガチャについて</p>
              <ul className="space-y-2">
                <li className="flex gap-x-2">
                  <svg className="shrink-0 mt-0.5 size-4 text-purple-600 dark:text-purple-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>ガチャはメインサーバー内のメニューから引くことができます</span>
                </li>
                <li className="flex gap-x-2">
                  <svg className="shrink-0 mt-0.5 size-4 text-purple-600 dark:text-purple-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>排出率は全て等しくなっています</span>
                </li>
                <li className="flex gap-x-2">
                  <svg className="shrink-0 mt-0.5 size-4 text-purple-600 dark:text-purple-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>すでに持っているものに関しては、重複して獲得されません</span>
                </li>
                <li className="flex gap-x-2">
                  <svg className="shrink-0 mt-0.5 size-4 text-amber-600 dark:text-amber-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span><strong>サブスク終了時は獲得したアイテムも使えなくなります。</strong>再開時は再度引き継いで使うことができます。</span>
                </li>
              </ul>
            </div>
          </div>
        </div>}

        {/* Purchase Flow Section */}
        <div id="how-to-buy" className="mt-8 scroll-mt-20">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-500 dark:from-teal-800 dark:to-cyan-700 text-white rounded-t-lg p-5">
              <h2 className="text-2xl font-extrabold font-raleway flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                ご購入の流れ
              </h2>
              <p className="mt-1 text-sm text-teal-100 dark:text-teal-200">Tebexは英語の決済画面となりますが、以下の手順で簡単にご購入いただけます</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 font-bold">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">
                    {activeTab === "one-time" ? "アイテムを選択して「購入」ボタンをクリック" : "プランを選択して「加入」ボタンをクリック"}
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {activeTab === "one-time"
                      ? "購入したいアイテムの「購入」ボタンを押すと、Minecraft ID 入力画面が表示されます。"
                      : "希望するプランの「加入」ボタンを押すと、Minecraft ID 入力画面が表示されます。"}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 font-bold">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">Minecraft IDを入力して決済ページへ</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong className="text-teal-700 dark:text-teal-400">Minecraft ID（ゲーム内のユーザー名）</strong>を正確に入力し、「購入手続きへ進む」をクリックします。
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 font-bold">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">メールアドレス・決済情報を入力</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Tebexの決済ページで<strong className="text-green-700 dark:text-green-400">メールアドレス</strong>、クレジットカード情報などを入力します。
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 dark:border-amber-600 p-2 rounded text-xs mt-2">
                    <p className="text-amber-800 dark:text-amber-300">
                      <strong>確認:</strong> 決済ページ左上に表示される Minecraft ID が正しいことを必ずご確認ください。
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 font-bold">
                    4
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">請求先情報を入力</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    郵便番号・氏名などの請求先情報を入力します。<span className="text-gray-500">※基本運営に通知されませんが、必要時に参照する場合があります。</span>
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 font-bold">
                    5
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">チェックボックスを確認して決済完了</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    以下の2つのチェックボックスを確認して決済を完了します。
                  </p>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 mb-2">
                    <li>• <strong>メール配信:</strong> MOFUCRAFT!! と Tebex からのお知らせを受け取る</li>
                    <li>• <strong>利用規約:</strong> Tebex の規約に同意し、即時提供のため返金不可を承認</li>
                  </ul>
                  {activeTab === "subscription" && (
                    <div className="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 dark:border-amber-600 p-2 rounded text-xs mb-2">
                      <p className="text-amber-800 dark:text-amber-300">
                        <strong>重要:</strong> メールアドレスは解約時に必要です。必ず受信できるアドレスを入力してください。
                      </p>
                    </div>
                  )}
                  <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 dark:border-blue-600 p-2 rounded text-xs">
                    <p className="text-blue-800 dark:text-blue-300">
                      <strong>完了:</strong> 決済が完了すると、数秒〜数分以内にゲーム内へ特典が自動付与されます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {activeTab === "subscription" && tiers.length > 0 && (
          <>
            {/* Comparison table */}
            <div id="comparison" className="mt-16 lg:mt-24 scroll-mt-20">
              <div className="lg:text-center mb-10 lg:mb-20">
                <h3 className="text-3xl font-bold text-gray-800 dark:text-white">詳細比較表</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">各プランの特典を比較できます</p>
              </div>

              <ComparisonTable tiers={tiers.filter((tier): tier is TebexTier => tier !== null)} onPurchaseClick={openPurchaseModal} />
            </div>
            <div className="text-center mt-6 text-xs text-gray-500 dark:text-gray-400">
              <p>※ 特典は随時追加される可能性があります</p>
            </div>
            {/* End Comparison table */}

            {/* Purchase Confirmation Section */}
            <div id="confirmation" className="mt-20 lg:mt-32 scroll-mt-20">
              <div className="lg:text-center mb-10">
                <h3 className="text-3xl font-bold text-gray-800 dark:text-white">ご購入前の確認事項</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">必ずお読みいただき、ご同意の上でご購入ください</p>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-amber-300 dark:border-amber-700">
                <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 rounded-t-lg p-5">
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-lg font-bold text-amber-900 dark:text-amber-200 m-0">
                      以下の内容を必ずご確認ください
                    </p>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Point 1: Minecraft ID */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold">
                        1
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Minecraft ID とメールアドレスの確認</h4>
                      <div className="space-y-2 text-gray-700 dark:text-gray-300 leading-relaxed">
                        <p>
                          商品は入力された Minecraft ID（ユーザー名）に自動的に反映されます。ID を間違えると特典が付与されませんので、必ずスペルを正しく確認してください。
                        </p>
                        <p className="text-sm">
                          <strong className="text-amber-700 dark:text-amber-400">メールアドレスについて:</strong> 解約に必要なリンクが届くため、必ず受信できるメールアドレスを入力してください。
                        </p>
                        <p className="text-sm">
                          <strong className="text-amber-700 dark:text-amber-400">Minecraft ID 変更時:</strong> サブスクリプションはメールアドレスで管理されています。Minecraft ID を変更した場合は、運営側で特典の紐付けを変更する必要がありますので、必ずDiscordサポートへご連絡ください。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Point 2: Reflection Time */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold">
                        2
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">特典の反映時間</h4>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        決済完了後、通常<strong className="text-amber-700 dark:text-amber-400">数秒〜数分以内</strong>にゲーム内へ自動的に特典が付与されます。反映されていない場合は、一度ゲームからログアウトして再ログインすると反映されることがあります。それでも反映されない場合は、Discord のサポートチケットまでお問い合わせください。
                      </p>
                    </div>
                  </div>

                  {/* Point 3: Environment Requirements */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold">
                        3
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">利用環境について</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 leading-relaxed ml-4">
                        <li>Minecraft Java Edition が動作する PC</li>
                        <li>mofucraft.net サーバーに接続できるインターネット環境</li>
                      </ul>
                    </div>
                  </div>

                  {/* Point 4: BAN Policy (RED WARNING) */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 font-bold">
                        4
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">BAN された場合の取り扱い</h4>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        サーバー規約違反などにより BAN された場合、<strong className="text-red-700 dark:text-red-400">購入済みの特典はすべて無効となり、返金対応は一切行いません。</strong>
                      </p>
                    </div>
                  </div>

                  {/* Point 5: Content Changes */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold">
                        5
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">商品内容の変更について</h4>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        サーバーのアップデートや運営方針により、特典内容が予告なく変更される場合があります。その場合も返金対応はできませんので、あらかじめご了承ください。
                      </p>
                    </div>
                  </div>

                  {/* Point 6: Minors */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold">
                        6
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">未成年の方へ</h4>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        未成年の方は、必ず保護者の方の同意を得たうえでご購入ください。
                      </p>
                    </div>
                  </div>

                  {/* Point 7: Refund Policy */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 font-bold">
                        7
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">返金について</h4>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        デジタル商品の特性上、<strong className="text-red-700 dark:text-red-400">原則として返金は承っておりません。</strong>ご購入前に必ず内容をご確認ください。
                      </p>
                    </div>
                  </div>

                  {/* Point 8: ID Mistake Policy */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 font-bold">
                        8
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">ID 入力間違いによる返金</h4>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        Minecraft ID（ユーザー名）を誤って入力された場合も、<strong className="text-red-700 dark:text-red-400">返金対応は一切行いません。</strong>入力内容を慎重にご確認の上でご購入ください。万が一誤入力された場合は、Discord のサポートチケットにてご相談ください（対応に時間がかかる場合があります）。
                      </p>
                    </div>
                  </div>

                  {/* Point 9: Cancellation Process */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold">
                        9
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">サブスクリプションの解約<span className="ml-2 text-sm font-normal text-blue-600 dark:text-blue-400">（サブスク購入の場合）</span></h4>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                        サブスクリプションの解約は、<strong className="text-blue-700 dark:text-blue-400">Tebex の購入履歴ページ</strong>から行ってください。解約後も、現在の課金期間が終了するまで特典をご利用いただけます。
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        解約方法：Tebex にログイン → Purchase History → 該当のプラン → Cancel ボタン
                      </p>
                    </div>
                  </div>

                  {/* Point 10: Plan Change */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-bold">
                        10
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">プランの変更について<span className="ml-2 text-sm font-normal text-blue-600 dark:text-blue-400">（サブスク購入の場合）</span></h4>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                        プランを変更したい場合は、<strong className="text-blue-700 dark:text-blue-400">現在のプランを一度解約してから、新しいプランに加入</strong>してください。
                      </p>
                      <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 dark:border-blue-600 p-3 rounded text-sm mb-2">
                        <p className="text-blue-800 dark:text-blue-300 mb-1">
                          <strong>課金期間内にプランを変更した場合：</strong>
                        </p>
                        <p className="text-blue-700 dark:text-blue-400">
                          新しいプランの特典が即座に適用され、以前のプランの特典は上書きされます。残りの期間に対する返金はありませんのでご注意ください。
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        解約後も現在の課金期間が終了するまで特典は継続されます。期間終了後に新しいプランへ加入することをおすすめします。
                      </p>
                    </div>
                  </div>

                  {/* Point 11: Disclaimer */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold">
                        11
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">免責事項・非提携表記</h4>
                      <div className="space-y-2 text-gray-700 dark:text-gray-300 leading-relaxed">
                        <p>本ストアは Mojang Studios および Microsoft Corporation とは一切提携しておりません。</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Minecraft およびその関連商標は、Mojang Studios および Microsoft Corporation に帰属します。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* End Purchase Confirmation Section */}

            {/* Cancellation Section */}
            <div id="cancellation" className="mt-20 lg:mt-32 scroll-mt-20">
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700">
                <div className="bg-gradient-to-r from-teal-600 to-cyan-500 dark:from-teal-800 dark:to-cyan-700 text-white rounded-t-lg p-5">
                  <h2 className="text-2xl font-extrabold font-raleway flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    サブスクリプションの解約方法
                  </h2>
                  <p className="mt-1 text-sm text-teal-100 dark:text-teal-200">いつでも簡単に解約できます</p>
                </div>

                <div className="p-6">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                    サブスクリプションの解約はいつでも可能です。以下の手順で簡単に解約できます。
                  </p>

                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                        <p className="font-semibold mb-1">解約リンクの場所</p>
                        <p className="mb-2">購入時に届いた Tebex メール内のリンク、または以下のURLからアクセスできます：</p>
                        <a
                          href="https://checkout.tebex.io/payment-history"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 underline font-semibold"
                        >
                          https://checkout.tebex.io/payment-history
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">解約手順</h3>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 font-bold">
                          1
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Customer Control Panel にアクセス</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          購入時に届いた Tebex メール内のリンク、または上記のURLからアクセスします。
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 font-bold">
                          2
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">ログイン</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          購入時に使用したメールアドレスまたはアカウントでログインします。
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 font-bold">
                          3
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">「Subscriptions」タブを開く</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          画面上部のタブから「Subscriptions」（サブスクリプション）を選択します。
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 font-bold">
                          4
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">MOFUCRAFT のサブスクリプションを選択</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          サブスクリプション一覧から MOFUCRAFT のプランを探して選択します。
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 font-bold">
                          5
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">「Cancel subscription」をクリック</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          「Cancel subscription」（解約）ボタンをクリックして解約を完了します。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-green-900 dark:text-green-200 leading-relaxed">
                        <p className="font-semibold mb-1">解約後について</p>
                        <p>解約手続きが完了すると、<strong>次回の更新日から課金が停止</strong>されます。既に支払った期間分の特典は、期間終了まで引き続きご利用いただけます。</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* End Cancellation Section */}
          </>
        )}
        {/* End Grid */}
      </div>
    </div>
  );
}

function TierCard({ tier, tierIndex, onPurchaseClick }: { tier: TebexTier; tierIndex: number; onPurchaseClick: (tier: TebexTier) => void }) {
  // tierIndexに基づいて画像を決定（0=最安, 1=中間, 2=最高）
  const itemImage = getTierItemImageByIndex(tierIndex);
  const perksArray = tier.perks && Array.isArray(tier.perks) && tier.perks.length > 0
    ? tier.perks
    : tier.perks && typeof tier.perks === 'string' && tier.perks.trim() !== ''
    ? [tier.perks]
    : [];

  // 改行で分割してフラット化
  const flattenedPerks = perksArray.flatMap(perk =>
    typeof perk === 'string' ? perk.split('\n').filter(p => p.trim() !== '') : [perk]
  );

  const isFeatured = tierIndex === 1;
  const scaleClass = isFeatured ? 'lg:scale-110' : '';

  return (
    <div className={`group ${scaleClass}`}>
      <div className={`flex flex-col text-center rounded-xl p-6 lg:p-8 transition-all duration-500 transform h-full ${
        isFeatured
          ? 'border-2 border-blue-600 dark:border-blue-700 shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-2 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/30 dark:to-neutral-800'
          : 'border-2 border-gray-200 dark:border-neutral-700 shadow-lg hover:shadow-xl hover:-translate-y-2 bg-gradient-to-br from-white to-gray-50 dark:from-neutral-800 dark:to-neutral-900'
      }`}>
        {/* おすすめバッジ（非おすすめカードにも同じ高さを確保） */}
        <div className="h-8 mb-2 flex items-center justify-center">
          {isFeatured && (
            <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs uppercase font-semibold bg-blue-100 text-blue-800 dark:bg-blue-600 dark:text-white">
              おすすめ
            </span>
          )}
        </div>

        {/* アイテム画像 */}
        <div className="mb-5 flex justify-center">
          <img
            src={itemImage}
            alt={`${tier.name} アイテム`}
            className="w-20 h-20 lg:w-24 lg:h-24 transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 pixelated"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* プラン名 */}
        <h4 className="font-bold text-2xl lg:text-3xl text-gray-800 dark:text-neutral-200 mb-3">{tier.name}</h4>

        {/* 価格セクション（高さを固定） */}
        <div className="min-h-[5.5rem] flex flex-col justify-center">
          {tier.jpy_price ? (
            <>
              <span className="font-bold text-2xl lg:text-3xl text-gray-800 dark:text-neutral-200">
                <span className="font-normal text-base lg:text-lg">約 </span>
                {tier.jpy_price.toLocaleString('ja-JP')}
                <span className="font-normal text-base lg:text-lg"> 円 / 月</span>
              </span>
              <p className="mt-1 mb-0 text-xs text-gray-500 dark:text-neutral-500">
                ${tier.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD / 月
              </p>
              <p className="m-0 text-xs text-gray-500 dark:text-neutral-500">
                （2025/5/13時点の参考値）
              </p>
            </>
          ) : (
            <>
              <span className="font-bold text-2xl lg:text-3xl text-gray-800 dark:text-neutral-200">
                <span className="font-normal text-base lg:text-lg -me-2">$</span>
                {tier.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <p className="mt-1 text-xs text-gray-500 dark:text-neutral-500">月額</p>
            </>
          )}
        </div>

        {/* 特典リスト */}
        <ul className="mt-6 space-y-3 text-sm text-left flex-grow">
          {flattenedPerks.length > 0 ? (
            flattenedPerks.map((perk, index) => (
              <li key={index} className="flex gap-x-3 items-start">
                <svg className="shrink-0 mt-0.5 size-5 text-blue-600 dark:text-blue-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-gray-800 dark:text-neutral-300 leading-relaxed">
                  {(() => {
                    const colonIndex = perk.indexOf(':');
                    if (colonIndex !== -1) {
                      const value = perk.substring(colonIndex + 1).trim();
                      if (value === '◯' || value === '○') {
                        return decodeHtmlEntities(perk.substring(0, colonIndex).trim());
                      }
                    }
                    return decodeHtmlEntities(perk);
                  })()}
                </span>
              </li>
            ))
          ) : (
            <li className="flex gap-x-2 justify-center">
              <span className="text-gray-600 dark:text-neutral-400">
                特典は準備中です
              </span>
            </li>
          )}
        </ul>

        {/* 加入ボタン */}
        <button
          type="button"
          onClick={() => onPurchaseClick(tier)}
          aria-label={`${tier.name}プランに加入`}
          className={`mt-6 shrink-0 py-3 px-6 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg cursor-pointer ${
            isFeatured
              ? 'border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-hidden focus:bg-blue-700'
              : 'border border-gray-200 bg-white text-gray-800 shadow-2xs hover:bg-gray-50 focus:outline-hidden focus:bg-gray-50 dark:bg-transparent dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800'
          } disabled:opacity-50 disabled:pointer-events-none transition-colors`}
        >
          加入
        </button>
      </div>
    </div>
  );
}

function ComparisonTable({ tiers, onPurchaseClick }: { tiers: TebexTier[]; onPurchaseClick: (tier: TebexTier) => void }) {
  // 特典を項目名と値に分解する関数
  const parsePerk = (perk: string): { name: string; value: string } => {
    const colonIndex = perk.indexOf(':');
    if (colonIndex === -1) {
      return { name: perk.trim(), value: '' };
    }
    return {
      name: perk.substring(0, colonIndex).trim(),
      value: perk.substring(colonIndex + 1).trim()
    };
  };

  // 全プランの特典項目名を収集（重複を除く）
  const allPerkNames = new Set<string>();
  const tierPerksMap = new Map<string, Map<string, string>>();

  tiers.forEach((tier) => {
    const perks = tier.perks && Array.isArray(tier.perks) && tier.perks.length > 0
      ? tier.perks
      : tier.perks && typeof tier.perks === 'string' && tier.perks.trim() !== ''
      ? [tier.perks]
      : [];

    // 改行で分割してフラット化
    const flattenedPerks = perks.flatMap(perk =>
      typeof perk === 'string' ? perk.split('\n').filter(p => p.trim() !== '') : [perk]
    );

    const perkMap = new Map<string, string>();
    flattenedPerks.forEach(perk => {
      const parsed = parsePerk(perk);
      allPerkNames.add(parsed.name);
      perkMap.set(parsed.name, parsed.value);
    });
    tierPerksMap.set(tier.documentId, perkMap);
  });

  const perkNamesList = Array.from(allPerkNames);

  // 各プランが特定の特典項目を持っているかチェックし、その値を返す
  const getPerkValue = (tier: TebexTier, perkName: string): string | null => {
    const perkMap = tierPerksMap.get(tier.documentId);
    return perkMap?.get(perkName) || null;
  };

  return (
    <>
      {/* Desktop view */}
      <div className="hidden lg:block">
        <table className="w-full">
          <thead>
            <tr>
              <th className="py-3 px-4 text-start text-sm font-semibold text-gray-800 dark:text-neutral-200">特典項目</th>
              {tiers.map((tier) => (
                <th key={tier.documentId} className="py-3 px-4 text-center text-lg font-semibold text-gray-800 dark:text-neutral-200">
                  {tier.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
            {perkNamesList.map((perkName, index) => (
              <tr key={index} className="border-t border-gray-200 dark:border-neutral-700">
                <td className="py-5 px-4 text-sm font-medium text-gray-800 dark:text-neutral-200">
                  {decodeHtmlEntities(perkName)}
                </td>
                {tiers.map((tier) => {
                  const value = getPerkValue(tier, perkName);
                  return (
                    <td key={tier.documentId} className="py-5 px-4 text-center text-sm text-gray-600 dark:text-neutral-400">
                      {value ? decodeHtmlEntities(value) : (
                        <svg className="inline-block size-5 text-gray-400 dark:text-neutral-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14"/>
                        </svg>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* 加入ボタン行 */}
            <tr className="border-t border-gray-200 dark:border-neutral-700">
              <td className="py-5 px-4"></td>
              {tiers.map((tier) => (
                <td key={tier.documentId} className="py-5 px-4 text-center">
                  <button
                    type="button"
                    onClick={() => onPurchaseClick(tier)}
                    aria-label={`${tier.name}プランに加入`}
                    className="py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-hidden focus:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    加入
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="space-y-24 lg:hidden">
        {tiers.map((tier) => (
          <section key={tier.documentId}>
            <div className="px-4 mb-4">
              <h2 className="text-lg leading-6 font-medium text-gray-800 dark:text-neutral-200">{tier.name}</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="sr-only" scope="col">特典項目</th>
                  <th className="sr-only" scope="col">内容</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                {perkNamesList.map((perkName, index) => {
                  const value = getPerkValue(tier, perkName);
                  return (
                    <tr key={index} className="border-t border-gray-200 dark:border-neutral-700">
                      <th className="py-5 px-4 text-sm font-medium text-gray-800 text-start dark:text-neutral-200" scope="row">
                        {decodeHtmlEntities(perkName)}
                      </th>
                      <td className="py-5 pe-4 text-sm text-gray-600 dark:text-neutral-400">
                        {value ? decodeHtmlEntities(value) : (
                          <svg className="shrink-0 ms-auto size-5 text-gray-400 dark:text-neutral-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14"/>
                          </svg>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* 加入ボタン */}
            <div className="px-4 mt-6">
              <button
                type="button"
                onClick={() => onPurchaseClick(tier)}
                aria-label={`${tier.name}プランに加入`}
                className="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-hidden focus:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                加入
              </button>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}時間${minutes % 60 ? `${minutes % 60}分` : ""}`;
  return `${Math.floor(minutes / 1440)}日`;
}

function BoostTypeIcon({ type }: { type: string }) {
  if (type === "mining") {
    return (
      <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }
  if (type === "range") {
    return (
      <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
        <line x1="22" y1="12" x2="18" y2="12" />
        <line x1="6" y1="12" x2="2" y2="12" />
        <line x1="12" y1="6" x2="12" y2="2" />
        <line x1="12" y1="22" x2="12" y2="18" />
      </svg>
    );
  }
  return (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L9 7H2l5.5 4-2 6.5L12 14l6.5 3.5-2-6.5L22 7h-7z" />
    </svg>
  );
}

const BOOST_TYPE_LABELS: Record<string, string> = {
  mining: "採掘バフ",
  range: "範囲バフ",
  fly: "飛行バフ",
};

const BOOST_TYPE_DESCRIPTIONS: Record<string, string> = {
  mining: "採掘速度が大幅にアップ！即時破壊で快適なマイニングを",
  range: "周辺ブロックを同時に採掘できる範囲採掘が可能に",
  fly: "サバイバルモードでも自由に空を飛べます",
};

const BOOST_TYPE_IMAGES: Record<string, string> = {
  mining: "/img/Blaze_Powder.webp",
  range: "/img/Eye_of_Ender.webp",
  fly: "/img/Feather.webp",
};

function SinglePurchaseCard({ item, onPurchaseClick }: {
  item: TebexSinglePurchaseItem;
  onPurchaseClick: (item: TebexSinglePurchaseItem) => void;
}) {
  const boostLabel = item.boost_type ? BOOST_TYPE_LABELS[item.boost_type] : item.category;
  const iconColor = item.boost_type === "mining"
    ? "text-orange-500 dark:text-orange-400"
    : item.boost_type === "range"
    ? "text-blue-500 dark:text-blue-400"
    : "text-purple-500 dark:text-purple-400";

  const itemImage = item.boost_type ? BOOST_TYPE_IMAGES[item.boost_type] : null;

  return (
    <div className="group flex flex-col rounded-xl border-2 border-gray-200 dark:border-neutral-700 shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300 bg-gradient-to-br from-white to-gray-50 dark:from-neutral-800 dark:to-neutral-900 p-6">
      <div className="flex justify-center mb-4">
        {itemImage ? (
          <img
            src={itemImage}
            alt={item.name}
            className="w-16 h-16 transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <div className={`${iconColor}`}>
            <BoostTypeIcon type={item.boost_type ?? ""} />
          </div>
        )}
      </div>
      <div className="text-center mb-1">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300">
          {boostLabel}
        </span>
      </div>
      <h4 className="font-bold text-xl text-gray-800 dark:text-neutral-200 text-center mt-2 mb-3">{item.name}</h4>
      {item.perks && (
        <ul className="space-y-2 text-sm text-left flex-grow mb-3">
          {item.perks.split('\n').filter(p => p.trim() !== '').map((perk, index) => (
            <li key={index} className="flex gap-x-2 items-start">
              <svg className="shrink-0 mt-0.5 size-4 text-teal-600 dark:text-teal-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="text-gray-700 dark:text-neutral-300 leading-relaxed">{decodeHtmlEntities(perk)}</span>
            </li>
          ))}
        </ul>
      )}
      {item.duration_minutes && (
        <p className="text-sm text-center text-gray-500 dark:text-neutral-500 mb-3">
          ⏱ {formatDuration(item.duration_minutes)}{item.quantity && item.quantity > 1 ? ` × ${item.quantity}個` : ""}
          {item.duration_minutes && item.quantity && item.quantity > 1 && (
            <span className="ml-1 text-xs text-gray-400 dark:text-neutral-600">
              （合計 {formatDuration(item.duration_minutes * item.quantity)}）
            </span>
          )}
        </p>
      )}
      {item.delivery_note && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 mb-3 text-xs text-blue-800 dark:text-blue-300">
          {item.delivery_note}
        </div>
      )}
      <div className="text-center mt-auto mb-4">
        {item.jpy_price ? (
          <>
            <span className="font-bold text-2xl text-gray-800 dark:text-neutral-200">
              <span className="font-normal text-sm">約 </span>
              {item.jpy_price.toLocaleString("ja-JP")}
              <span className="font-normal text-sm"> 円</span>
            </span>
            <p className="mt-1 text-xs text-gray-500 dark:text-neutral-500">
              ${item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </p>
            <p className="text-xs text-gray-500 dark:text-neutral-500">
              （2026年4月30日時点）
            </p>
          </>
        ) : (
          <span className="font-bold text-2xl text-gray-800 dark:text-neutral-200">
            ${item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onPurchaseClick(item)}
        className="shrink-0 py-3 px-6 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-2xs hover:bg-gray-50 focus:outline-hidden focus:bg-gray-50 dark:bg-transparent dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
      >
        購入
      </button>
    </div>
  );
}

const BOOST_PREVIEWS = [
  {
    type: "mining",
    name: "採掘強化の秘薬 ×5",
    label: "採掘バフ",
    description: BOOST_TYPE_DESCRIPTIONS.mining,
    durationLabel: "15分 / 使用",
    jpyPrice: 500,
  },
  {
    type: "range",
    name: "広域採掘の秘薬 ×5",
    label: "範囲バフ",
    description: BOOST_TYPE_DESCRIPTIONS.range,
    durationLabel: "15分 / 使用",
    jpyPrice: 500,
  },
  {
    type: "fly",
    name: "飛翔の秘薬 ×5",
    label: "飛行バフ",
    description: BOOST_TYPE_DESCRIPTIONS.fly,
    durationLabel: "15分 / 使用",
    jpyPrice: 500,
  },
];

const SERVICE_ITEM_IMAGES: Record<string, string> = {
  "アカウント移行": "/img/Ender_Chest.webp",
  "画像マップ移行": "/img/Map_Item.webp",
};

const SERVICE_PREVIEWS = [
  {
    id: "account-migration",
    name: "アカウント移行",
    label: "アカウント移行",
    description: "Minecraftアカウントの移行作業。既存プレイヤーデータを新アカウントへ移行します。リスクを伴う手動作業です。",
    jpyPrice: null,
    image: "/img/Ender_Chest.webp",
  },
  {
    id: "image-map-migration",
    name: "画像マップ移行",
    label: "画像マップ移行",
    description: "カスタム画像マップの移行作業。既存の画像マップを別ワールドや新環境へ移行します。",
    jpyPrice: null,
    image: "/img/Map_Item.webp",
  },
];

const SERVICE_ITEM_ORDER: Record<string, number> = {
  "アカウント移行": 0,
  "画像マップ移行": 1,
};

const SERVICE_SINGLE_PURCHASE_NAMES = new Set(["アカウント移行"]);

type ServiceBasket = Record<string, number>;

function ServiceItemCard({
  item,
  quantity,
  onQuantityChange,
  onSinglePurchase,
}: {
  item: TebexSinglePurchaseItem;
  quantity: number;
  onQuantityChange: (delta: number) => void;
  onSinglePurchase?: () => void;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border-2 ${
        onSinglePurchase || quantity > 0
          ? "border-indigo-400 dark:border-indigo-500 shadow-lg shadow-indigo-100 dark:shadow-none"
          : "border-gray-200 dark:border-neutral-700"
      } bg-gradient-to-br from-white to-indigo-50 dark:from-neutral-800 dark:to-indigo-900/10 p-6 transition-all duration-200`}
    >
      <div className="flex justify-center mb-3">
        {SERVICE_ITEM_IMAGES[item.name] ? (
          <img
            src={SERVICE_ITEM_IMAGES[item.name]}
            alt={item.name}
            className="w-16 h-16 mb-1 opacity-90"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        )}
      </div>
      <div className="text-center mb-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
          サービス
        </span>
      </div>
      <h4 className="font-bold text-xl text-gray-800 dark:text-neutral-200 text-center mt-2 mb-3">{item.name}</h4>
      {item.perks && (
        <ul className="space-y-2 text-sm text-left flex-grow mb-3">
          {item.perks.split('\n').filter(p => p.trim() !== '').map((perk, i) => (
            <li key={i} className="flex gap-x-2 items-start">
              <svg className="shrink-0 mt-0.5 size-4 text-indigo-500 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-gray-700 dark:text-neutral-300 leading-relaxed">{decodeHtmlEntities(perk)}</span>
            </li>
          ))}
        </ul>
      )}
      {item.delivery_note && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 mb-3 text-xs text-amber-800 dark:text-amber-300">
          {item.delivery_note}
        </div>
      )}
      <div className="text-center mt-auto mb-4">
        {item.jpy_price ? (
          <>
            <span className="font-bold text-2xl text-gray-800 dark:text-neutral-200">
              <span className="font-normal text-sm">約 </span>
              {item.jpy_price.toLocaleString("ja-JP")}
              <span className="font-normal text-sm"> 円 / {item.name === "画像マップ移行" ? "枚" : "件"}</span>
            </span>
            <p className="mt-1 text-xs text-gray-500 dark:text-neutral-500">
              ${item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </p>
            <p className="text-xs text-gray-500 dark:text-neutral-500">（2025/5/13時点の参考値）</p>
          </>
        ) : (
          <span className="font-bold text-2xl text-gray-800 dark:text-neutral-200">
            ${item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </span>
        )}
      </div>
      {onSinglePurchase ? (
        <button
          type="button"
          onClick={onSinglePurchase}
          className="w-full py-2.5 px-4 inline-flex justify-center items-center gap-2 font-semibold text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
        >
          購入する
        </button>
      ) : (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onQuantityChange(-1)}
            disabled={quantity === 0}
            className="w-10 h-10 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-700 dark:text-gray-200 font-bold text-lg hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            −
          </button>
          <span className="w-8 text-center font-bold text-lg text-gray-800 dark:text-neutral-200">{quantity}</span>
          <button
            type="button"
            onClick={() => onQuantityChange(1)}
            disabled={quantity >= 10}
            className="w-10 h-10 rounded-lg border border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold text-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            ＋
          </button>
        </div>
      )}
    </div>
  );
}

function ServiceBasketModal({
  basketItems,
  onClose,
}: {
  basketItems: { item: TebexSinglePurchaseItem; quantity: number }[];
  onClose: () => void;
}) {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tebexLoaded, setTebexLoaded] = useState(false);
  const [confirmedTerms, setConfirmedTerms] = useState(false);

  const totalJpy = basketItems.reduce(
    (sum, { item, quantity }) => sum + (item.jpy_price ?? 0) * quantity,
    0
  );
  const isValidUsername = /^[a-zA-Z0-9_]{3,16}$/.test(username);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let checkInterval: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let checkCount = 0;
    const MAX_CHECK_COUNT = 50;
    const initTebex = () => {
      try {
        if (window.Tebex) { setTebexLoaded(true); return; }
        const existingScript = document.querySelector('script[src="https://js.tebex.io/v/1.js"]');
        if (existingScript) {
          checkInterval = setInterval(() => {
            checkCount++;
            if (window.Tebex) { setTebexLoaded(true); if (checkInterval) clearInterval(checkInterval); }
            else if (checkCount >= MAX_CHECK_COUNT) { if (checkInterval) clearInterval(checkInterval); setTebexLoaded(true); }
          }, 100);
          return;
        }
        const script = document.createElement("script");
        script.src = "https://js.tebex.io/v/1.js";
        script.async = true;
        timeoutId = setTimeout(() => {
          if (!window.Tebex) { if (checkInterval) clearInterval(checkInterval); setTebexLoaded(true); }
        }, 5000);
        script.onload = () => {
          checkInterval = setInterval(() => {
            checkCount++;
            if (window.Tebex) { setTebexLoaded(true); if (checkInterval) clearInterval(checkInterval); if (timeoutId) clearTimeout(timeoutId); }
            else if (checkCount >= MAX_CHECK_COUNT) { if (checkInterval) clearInterval(checkInterval); if (timeoutId) clearTimeout(timeoutId); setTebexLoaded(true); }
          }, 100);
        };
        script.onerror = () => { if (timeoutId) clearTimeout(timeoutId); if (checkInterval) clearInterval(checkInterval); setTebexLoaded(true); };
        document.head.appendChild(script);
      } catch (err) { console.error("[Tebex] Failed to load:", err); }
    };
    initTebex();
    return () => { if (checkInterval) clearInterval(checkInterval); if (timeoutId) clearTimeout(timeoutId); };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUsername || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tebex-basket-multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          items: basketItems.map(({ item, quantity }) => ({
            packageId: item.tebex_package_id,
            quantity,
          })),
        }),
      });
      const result = await response.json();
      if (result.success && result.basketIdent) {
        const isIOS =
          /iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.userAgent.includes("Mac") && "ontouchend" in document);
        if (isIOS && result.checkoutUrl) { window.location.href = result.checkoutUrl; return; }
        if (window.Tebex) {
          try {
            window.Tebex.checkout.on("payment:complete", () => { window.location.href = "/store?purchased=success"; });
            window.Tebex.checkout.on("close", () => setIsLoading(false));
            window.Tebex.checkout.on("payment:error", () => { setError("決済中にエラーが発生しました。再度お試しください。"); setIsLoading(false); });
            window.Tebex.checkout.init({ ident: result.basketIdent, theme: "auto" });
            window.Tebex.checkout.launch();
            if (result.checkoutUrl) sessionStorage.setItem("tebex_checkout_url", result.checkoutUrl);
          } catch (tebexErr) {
            console.error("[Tebex] Checkout error:", tebexErr);
            if (result.checkoutUrl) { window.location.href = result.checkoutUrl; return; }
            setError("決済画面の表示に失敗しました。ページを再読み込みしてください。");
            setIsLoading(false);
          }
        } else if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        } else {
          setError("決済システムの読み込みに失敗しました。");
          setIsLoading(false);
        }
      } else {
        setError(result.error || "エラーが発生しました");
        setIsLoading(false);
      }
    } catch {
      setError("通信エラーが発生しました。しばらく経ってから再度お試しください。");
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 py-8">
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl max-w-md w-full">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-800 dark:to-purple-800 text-white p-5 rounded-t-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">サービス購入確認</h2>
              <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors" aria-label="閉じる">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-indigo-200 mt-1">合計 ¥{totalJpy.toLocaleString("ja-JP")}</p>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-300 font-semibold mb-1">⚠ 購入前に Discord での事前予約が必須です</p>
              <p className="text-xs text-red-700 dark:text-red-400">リスクを伴う手動作業のため、購入前に必ず Discord のサポートチケットにてご予約ください。購入をもって予約確定となりますが、作業時期は未定です。</p>
              <a href="https://discord.gg/5hpyDwZCpN" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                Discord でサポートチケットを開く
              </a>
            </div>
            <div className="bg-gray-50 dark:bg-neutral-700/50 rounded-lg p-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">カート内容</h3>
              <ul className="space-y-2">
                {basketItems.map(({ item, quantity }) => (
                  <li key={item.documentId} className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                    <span>{item.name} × {quantity}</span>
                    <span className="font-semibold">¥{((item.jpy_price ?? 0) * quantity).toLocaleString("ja-JP")}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-200 dark:border-neutral-600 mt-3 pt-3 flex justify-between font-bold text-gray-800 dark:text-neutral-200">
                <span>合計</span>
                <span>¥{totalJpy.toLocaleString("ja-JP")}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Minecraft ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="YourMinecraftID"
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={16}
              />
              {username && !isValidUsername && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">3〜16文字の英数字・アンダースコアのみ使用できます</p>
              )}
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedTerms}
                onChange={e => setConfirmedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300">
                リスクを伴う作業であること・作業時期が未定であること・返金対応ができないことを理解しました
              </span>
            </label>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={!isValidUsername || !confirmedTerms || isLoading || !tebexLoaded}
              className="w-full py-3 px-4 inline-flex justify-center items-center gap-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  処理中...
                </>
              ) : !tebexLoaded ? "決済システム読み込み中..." : "Tebex で購入手続き"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ServiceSection({ items, onPurchaseClick }: {
  items: TebexSinglePurchaseItem[];
  onPurchaseClick: (item: TebexSinglePurchaseItem) => void;
}) {
  const [basket, setBasket] = useState<ServiceBasket>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sortedItems = [...items].sort((a, b) =>
    (SERVICE_ITEM_ORDER[a.name] ?? 99) - (SERVICE_ITEM_ORDER[b.name] ?? 99)
  );
  const basketOnlyItems = sortedItems.filter(item => !SERVICE_SINGLE_PURCHASE_NAMES.has(item.name));

  const updateQuantity = (id: string, delta: number) => {
    setBasket(prev => {
      const current = prev[id] ?? 0;
      const next = Math.max(0, Math.min(10, current + delta));
      if (next === 0) {
        const newBasket = { ...prev };
        delete newBasket[id];
        return newBasket;
      }
      return { ...prev, [id]: next };
    });
  };

  const basketItems = basketOnlyItems
    .filter(item => (basket[item.documentId] ?? 0) > 0)
    .map(item => ({ item, quantity: basket[item.documentId] }));
  const totalJpy = basketItems.reduce(
    (sum, { item, quantity }) => sum + (item.jpy_price ?? 0) * quantity,
    0
  );
  const hasItems = basketItems.length > 0;

  return (
    <div id="service-items" className="scroll-mt-20">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white text-center mb-4">各種サービス</h2>
      <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-4">
        手動対応が必要な有償サービスです。事前に Discord の申請チケットを用いた予約が必須となります。
      </p>
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-sm text-blue-900 dark:text-blue-200">
          アカウント移行・マップ移行のサービス内容の詳細については
          <a href="https://mofucraft.net/account-migration" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:opacity-80 mx-1">こちらのページ</a>
          をご覧ください。
        </p>
      </div>
      <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <p className="text-sm text-amber-900 dark:text-amber-200">
          <strong>ご購入前に必ず Discord の申請チケットで予約してください。</strong>
          購入をもって予約確定となりますが、作業時期は未定です。リスクを伴う手動作業であり、場合によりサーバーを一時停止する必要が生じることがあります。
        </p>
      </div>
      {items.length === 0 ? (
        <>
          <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-5 flex items-start gap-4">
            <div className="flex-shrink-0 w-9 h-9 bg-amber-100 dark:bg-amber-800/50 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-200 text-sm mb-0.5">現在このサービスは準備中です</p>
              <p className="text-xs text-amber-800 dark:text-amber-300">公開準備ができ次第、以下のサービスが購入可能になります。</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            {SERVICE_PREVIEWS.map(service => (
              <div key={service.id} className="relative flex flex-col rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 p-6 bg-indigo-50/40 dark:bg-indigo-900/10 opacity-70">
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                    準備中
                  </span>
                </div>
                <div className="flex justify-center mb-3">
                  {service.image ? (
                    <img
                      src={service.image}
                      alt={service.name}
                      className="w-16 h-16 mb-1 opacity-50"
                      style={{ imageRendering: "pixelated" }}
                    />
                  ) : (
                    <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center">
                      <svg className="w-7 h-7 text-indigo-400 dark:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="text-center mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                    サービス
                  </span>
                </div>
                <h4 className="font-bold text-xl text-gray-600 dark:text-neutral-400 text-center mt-2 mb-2">{service.name}</h4>
                <p className="text-sm text-gray-500 dark:text-neutral-500 text-center mb-4 flex-grow">{service.description}</p>
                <div className="mt-auto w-full text-center py-2 px-4 rounded-lg border border-dashed border-indigo-200 dark:border-indigo-800">
                  {service.jpyPrice ? (
                    <span className="font-bold text-xl text-gray-500 dark:text-neutral-500">
                      ¥{service.jpyPrice.toLocaleString("ja-JP")}
                      <span className="font-normal text-sm"> / {service.id === "image-map-migration" ? "枚" : "件"}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-neutral-600">価格未定</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          {sortedItems.map(item => (
            <ServiceItemCard
              key={item.documentId}
              item={item}
              quantity={basket[item.documentId] ?? 0}
              onQuantityChange={delta => updateQuantity(item.documentId, delta)}
              onSinglePurchase={SERVICE_SINGLE_PURCHASE_NAMES.has(item.name) ? () => onPurchaseClick(item) : undefined}
            />
          ))}
          {SERVICE_PREVIEWS.filter(preview => !sortedItems.some(item => item.name === preview.name)).map(service => (
            <div key={service.id} className="relative flex flex-col rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 p-6 bg-indigo-50/40 dark:bg-indigo-900/10 opacity-70">
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                  準備中
                </span>
              </div>
              <div className="flex justify-center mb-3">
                {service.image ? (
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-16 h-16 mb-1 opacity-50"
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : (
                  <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center">
                    <svg className="w-7 h-7 text-indigo-400 dark:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="text-center mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                  サービス
                </span>
              </div>
              <h4 className="font-bold text-xl text-gray-600 dark:text-neutral-400 text-center mt-2 mb-2">{service.name}</h4>
              <p className="text-sm text-gray-500 dark:text-neutral-500 text-center mb-4 flex-grow">{service.description}</p>
              <div className="mt-auto w-full text-center py-2 px-4 rounded-lg border border-dashed border-indigo-200 dark:border-indigo-800">
                {service.jpyPrice ? (
                  <span className="font-bold text-xl text-gray-500 dark:text-neutral-500">
                    ¥{service.jpyPrice.toLocaleString("ja-JP")}
                    <span className="font-normal text-sm"> / {service.id === "image-map-migration" ? "枚" : "件"}</span>
                  </span>
                ) : (
                  <span className="text-sm text-gray-400 dark:text-neutral-600">価格未定</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {hasItems && (
        <div className="mt-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6">
          <h3 className="font-bold text-indigo-900 dark:text-indigo-200 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            カート
          </h3>
          <ul className="space-y-2 mb-4">
            {basketItems.map(({ item, quantity }) => (
              <li key={item.documentId} className="flex justify-between text-sm text-indigo-800 dark:text-indigo-300">
                <span>{item.name} × {quantity}</span>
                <span className="font-semibold">¥{((item.jpy_price ?? 0) * quantity).toLocaleString("ja-JP")}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-indigo-200 dark:border-indigo-700 pt-3 mb-4 flex justify-between font-bold text-indigo-900 dark:text-indigo-200">
            <span>合計</span>
            <span>¥{totalJpy.toLocaleString("ja-JP")}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://discord.gg/5hpyDwZCpN"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-4 inline-flex justify-center items-center gap-2 text-sm font-semibold rounded-lg border border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Discord で予約（必須）
            </a>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex-1 py-2.5 px-4 inline-flex justify-center items-center gap-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Tebex で購入手続き
            </button>
          </div>
        </div>
      )}
      {isModalOpen && (
        <ServiceBasketModal basketItems={basketItems} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}

function SinglePurchaseSection({ items, onPurchaseClick }: {
  items: TebexSinglePurchaseItem[];
  onPurchaseClick: (item: TebexSinglePurchaseItem) => void;
}) {
  const serviceItems = items.filter(i => i.category === "service");
  const boostItems = items.filter(i => i.category !== "service");

  return (
    <div className="mt-4">
      {/* バフカテゴリ */}
      <div id="buff-items" className="scroll-mt-20">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white text-center mb-4">単発購入バフ</h2>
        {boostItems.length > 0 ? (
          <>
            <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-amber-900 dark:text-amber-200">
                <strong>為替レートについて:</strong> アイテムはすべて<strong>米ドル（USD）</strong>でご請求されます。表示の円換算額は参考値であり、実際の請求額は決済時の為替レートにより変動します。
              </p>
            </div>
            <div id="about-buff" className="mb-12 scroll-mt-20 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div className="text-sm text-teal-900 dark:text-teal-200 leading-relaxed">
                  <p className="font-bold mb-3 text-base">全体バフについて</p>
                  <ul className="space-y-2">
                    {[
                      <>1セットで<strong>15分バフ × 5個</strong>のアイテムが付与されます</>,
                      <>アイテムを使用すると、<strong>1個につき15分の全体バフ</strong>がサーバー全体に発動します</>,
                      <>アイテムを使うタイミングは<strong>購入者が自由に決められます</strong>（購入後すぐに使わなくても構いません）</>,
                      <>バフ発動中は<strong>現在ログインしているすべてのプレイヤー</strong>に効果が付与され、バフ中にログインしたプレイヤーにも自動的に付与されます</>,
                    ].map((text, i) => (
                      <li key={i} className="flex gap-x-2">
                        <svg className="shrink-0 mt-0.5 size-4 text-teal-600 dark:text-teal-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div id="single-purchase-items" className="scroll-mt-20">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                {boostItems.map((item) => (
                  <SinglePurchaseCard key={item.documentId} item={item} onPurchaseClick={onPurchaseClick} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-800/50 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-amber-900 dark:text-amber-200 text-lg mb-1">現在この機能を準備中です</h3>
                  <p className="text-sm text-amber-800 dark:text-amber-300">単発購入バフは近日公開予定です。公開までしばらくお待ちください。</p>
                </div>
              </div>
            </div>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-10 text-sm">以下のバフが単品で購入できるようになる予定です</p>
            <div className="grid sm:grid-cols-3 gap-6">
              {BOOST_PREVIEWS.map((boost) => (
                <div key={boost.type} className="relative flex flex-col items-center rounded-xl border-2 border-dashed border-gray-200 dark:border-neutral-600 p-6 bg-gray-50 dark:bg-neutral-800/50">
                  <img src={BOOST_TYPE_IMAGES[boost.type]} alt={boost.name} className="w-16 h-16 mb-4 opacity-80" style={{ imageRendering: "pixelated" }} />
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600 dark:bg-neutral-700 dark:text-neutral-400 mb-2">{boost.label}</span>
                  <h4 className="font-bold text-base text-gray-700 dark:text-neutral-300 text-center mt-2 mb-1">{boost.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-neutral-500 text-center mb-3">{boost.description}</p>
                  <p className="text-xs text-gray-400 dark:text-neutral-600 mb-3">⏱ {boost.durationLabel}</p>
                  <div className="mt-auto w-full text-center py-2 px-4 rounded-lg border border-dashed border-gray-300 dark:border-neutral-600">
                    <span className="font-bold text-xl text-gray-500 dark:text-neutral-400">¥{boost.jpyPrice.toLocaleString("ja-JP")}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <hr className="border-gray-200 dark:border-neutral-700 my-12" />

      {/* 各種サービス */}
      <ServiceSection items={serviceItems} onPurchaseClick={onPurchaseClick} />

      {boostItems.length > 0 && (
        <div id="single-cautions" className="scroll-mt-20 mt-12 mb-8 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-amber-300 dark:border-amber-700">
          <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 rounded-t-lg p-5">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-lg font-bold text-amber-900 dark:text-amber-200 m-0">注意事項・ご購入前の確認</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {[
              { num: "1", color: "amber", title: "Minecraft ID の確認", text: "バフアイテムは入力した Minecraft ID（ユーザー名）のインベントリに付与されます。ID を間違えると特典が付与されませんので、必ずスペルを正確に確認してください。オフライン中でも付与されます。" },
              { num: "2", color: "amber", title: "バフの発動タイミング", text: "バフの効果時間はアイテムを使用した時点からカウントされます。購入しただけでは発動しません。使うタイミングは購入者が自由に決められます。" },
              { num: "3", color: "amber", title: "特典の反映時間", text: "決済完了後、通常数秒〜数分以内にインベントリへ自動的にアイテムが付与されます。バフが反映されていない場合は、一度ゲームからログアウトして再ログインすると反映されることがあります。それでも反映されない場合は、Discord のサポートチケットまでお問い合わせください。" },
              { num: "4", color: "red", title: "返金・ID 入力間違いについて", text: "単発購入アイテムは一度購入すると返金できません。また Minecraft ID を誤って入力された場合も返金対応は一切行いません。入力内容を慎重にご確認の上でご購入ください。" },
              { num: "5", color: "red", title: "BAN された場合の取り扱い", text: "バフ効果はサーバーの再起動後も継続しますが、サーバー規約違反などにより BAN された場合、バフの補填・返金は一切行いません。" },
              { num: "6", color: "amber", title: "商品内容の変更について", text: "サーバーのアップデートや運営方針により、特典内容が予告なく変更される場合があります。その場合も返金対応はできませんので、あらかじめご了承ください。" },
              { num: "7", color: "amber", title: "未成年の方へ", text: "未成年の方は、必ず保護者の方の同意を得たうえでご購入ください。" },
              { num: "8", color: "amber", title: "免責事項・非提携表記", text: "本ストアは Mojang Studios および Microsoft Corporation とは一切提携しておりません。Minecraft およびその関連商標は、Mojang Studios および Microsoft Corporation に帰属します。" },
            ].map(({ num, color, title, text }) => (
              <div key={num} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-${color}-100 dark:bg-${color}-900/50 text-${color}-800 dark:text-${color}-300 font-bold`}>{num}</div>
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">{title}</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white dark:bg-neutral-700 rounded-lg p-12 text-center">
      <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
        現在、ご利用可能なプランはありません
      </p>
      <p className="text-gray-500 dark:text-gray-400 mt-2">
        しばらくしてから再度ご確認ください
      </p>
    </div>
  );
}

// Tebex.js の型定義
declare global {
  interface Window {
    Tebex?: {
      checkout: {
        init: (config: { ident: string; theme?: string }) => void;
        launch: () => void;
        on: (event: string, callback: (data?: unknown) => void) => void;
      };
    };
  }
}

// 購入モーダルコンポーネント
function PurchaseModal({ name, price, jpy_price, tebex_package_id, isSubscription, singlePurchaseItem, onClose }: {
  name: string;
  price: number;
  jpy_price: number | null;
  tebex_package_id: string;
  isSubscription: boolean;
  singlePurchaseItem: TebexSinglePurchaseItem | null;
  onClose: () => void;
}) {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isExclusiveError, setIsExclusiveError] = useState(false);
  const [tebexLoaded, setTebexLoaded] = useState(false);
  const [confirmedTerms, setConfirmedTerms] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);

  const totalPrice = price * purchaseQuantity;
  const totalJpyPrice = jpy_price ? jpy_price * purchaseQuantity : null;

  // Minecraft ID のバリデーション（3-16文字、英数字とアンダースコアのみ）
  const isValidUsername = /^[a-zA-Z0-9_]{3,16}$/.test(username);

  // Tebex.js をロード
  useEffect(() => {
    // SSRでは実行しない
    if (typeof window === "undefined") return;

    let checkInterval: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let checkCount = 0;
    const MAX_CHECK_COUNT = 50; // 5秒でタイムアウト（100ms × 50回）

    const initTebex = () => {
      try {
        // 既にロード済みの場合
        if (window.Tebex) {
          setTebexLoaded(true);
          return;
        }

        // 既存のスクリプトタグを確認
        const existingScript = document.querySelector('script[src="https://js.tebex.io/v/1.js"]');
        if (existingScript) {
          // スクリプトが既に追加されている場合、ロード完了を待つ
          checkInterval = setInterval(() => {
            checkCount++;
            if (window.Tebex) {
              setTebexLoaded(true);
              if (checkInterval) clearInterval(checkInterval);
            } else if (checkCount >= MAX_CHECK_COUNT) {
              if (checkInterval) clearInterval(checkInterval);
              // タイムアウト時はフォールバック（直接リダイレクト）を使用
              console.warn("[Tebex] load timed out, using direct checkout URL as fallback");
              setTebexLoaded(true);
            }
          }, 100);
          return;
        }

        // スクリプトを追加
        const script = document.createElement("script");
        script.src = "https://js.tebex.io/v/1.js";
        script.async = true;

        // タイムアウト設定（5秒）
        timeoutId = setTimeout(() => {
          if (!window.Tebex) {
            if (checkInterval) clearInterval(checkInterval);
            // タイムアウト時はフォールバック（直接リダイレクト）を使用
            console.warn("[Tebex] script load timed out, using direct checkout URL as fallback");
            setTebexLoaded(true);
          }
        }, 5000);

        script.onload = () => {
          // スクリプトロード後、Tebexオブジェクトが利用可能になるまで少し待つ
          checkInterval = setInterval(() => {
            checkCount++;
            if (window.Tebex) {
              setTebexLoaded(true);
              if (checkInterval) clearInterval(checkInterval);
              if (timeoutId) clearTimeout(timeoutId);
            } else if (checkCount >= MAX_CHECK_COUNT) {
              if (checkInterval) clearInterval(checkInterval);
              if (timeoutId) clearTimeout(timeoutId);
              // オブジェクト未初期化の場合もフォールバックを使用
              console.warn("[Tebex] object not available after load, using direct checkout URL as fallback");
              setTebexLoaded(true);
            }
          }, 100);
        };
        script.onerror = () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (checkInterval) clearInterval(checkInterval);
          // ブロック・読み込み失敗時はフォールバック（直接リダイレクト）を使用
          // Firefox の Enhanced Tracking Protection 等でブロックされる場合を考慮
          console.warn("[Tebex] script blocked or failed to load, using direct checkout URL as fallback");
          setTebexLoaded(true);
        };
        document.head.appendChild(script);
      } catch (err) {
        console.error("[Tebex] Failed to load Tebex.js:", err);
        setError("決済システムの初期化に失敗しました。ページを再読み込みしてください。");
      }
    };

    initTebex();

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUsername || isLoading) return;

    setIsLoading(true);
    setError(null);
    setErrorDetails(null);
    setIsExclusiveError(false);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("packageId", tebex_package_id);
      if (!isSubscription && purchaseQuantity > 1) {
        formData.append("quantity", String(purchaseQuantity));
      }

      // バスケット作成API（Tebex.js用）
      const response = await fetch("/api/tebex-basket", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.basketIdent) {
        // iOS Safari を検出（Tebex.jsのポップアップが正常に動作しない場合がある）
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.userAgent.includes("Mac") && "ontouchend" in document);

        // iOS の場合は直接チェックアウトURLにリダイレクト
        if (isIOS && result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
          return;
        }

        // Tebex.js でチェックアウトを開く（Apple Pay/Google Pay対応）
        if (window.Tebex) {
          try {
            // イベントリスナーを先に登録（init前に登録することで確実にイベントを捕捉）
            // 決済完了イベント
            window.Tebex.checkout.on("payment:complete", () => {
              window.location.href = "/store?purchased=success";
            });

            // チェックアウト閉じるイベント
            window.Tebex.checkout.on("close", () => {
              setIsLoading(false);
            });

            // エラーイベント
            window.Tebex.checkout.on("payment:error", () => {
              setError("決済中にエラーが発生しました。再度お試しください。");
              setIsLoading(false);
            });

            // 初期化
            window.Tebex.checkout.init({
              ident: result.basketIdent,
              theme: "auto", // ダークモード自動対応
            });

            // チェックアウトを起動
            window.Tebex.checkout.launch();

            // フォールバック: イベントが発火しない場合に備えて、
            // ユーザーが手動でリダイレクトできるようにチェックアウトURLを保存
            // complete_auto_redirect が有効なので、Tebex側でリダイレクトされる可能性もある
            if (result.checkoutUrl) {
              // セッションストレージに保存（ページリロード後に使用可能）
              sessionStorage.setItem("tebex_checkout_url", result.checkoutUrl);
            }
          } catch (tebexErr) {
            console.error("[Tebex] Checkout error:", tebexErr);
            // フォールバック: チェックアウトURLがあれば直接リダイレクト
            if (result.checkoutUrl) {
              window.location.href = result.checkoutUrl;
              return;
            }
            setError("決済画面の表示に失敗しました。ページを再読み込みしてください。");
            setIsLoading(false);
          }
        } else {
          // Tebex.js が読み込まれていない場合はチェックアウトURLにリダイレクト
          if (result.checkoutUrl) {
            window.location.href = result.checkoutUrl;
            return;
          }
          setError("決済システムの読み込みに失敗しました。ページを再読み込みしてください。");
          setIsLoading(false);
        }
      } else {
        setError(result.error || "エラーが発生しました");
        if (result.errorType === "exclusive_package") {
          setIsExclusiveError(true);
          setErrorDetails(result.details);
        }
        setIsLoading(false);
      }
    } catch (err) {
      setError("通信エラーが発生しました。しばらく経ってから再度お試しください。");
      setIsLoading(false);
    }
  };

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // モーダル外クリックで閉じる
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 py-8">
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl max-w-md w-full">
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-teal-600 to-cyan-500 dark:from-teal-800 dark:to-cyan-700 text-white p-5 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{name} {isSubscription ? "に加入" : "を購入"}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="閉じる"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-teal-100 mt-1">
            {totalJpyPrice
              ? `約 ¥${totalJpyPrice.toLocaleString("ja-JP")}${isSubscription ? " / 月" : ""}`
              : `$${totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}${isSubscription ? " / 月" : ""}`}
            {!isSubscription && purchaseQuantity > 1 && jpy_price && (
              <span className="ml-2 text-teal-200 text-xs">（¥{jpy_price.toLocaleString("ja-JP")} × {purchaseQuantity}セット）</span>
            )}
          </p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* 単品購入：個数選択（サービス系は不要） */}
          {!isSubscription && singlePurchaseItem?.category !== "service" && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                購入セット数
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPurchaseQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-700 dark:text-gray-200 font-bold text-lg hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors disabled:opacity-40"
                  disabled={purchaseQuantity <= 1}
                >
                  −
                </button>
                <span className="w-12 text-center text-lg font-bold text-gray-800 dark:text-gray-100">
                  {purchaseQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setPurchaseQuantity(q => Math.min(10, q + 1))}
                  className="w-10 h-10 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-700 dark:text-gray-200 font-bold text-lg hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors disabled:opacity-40"
                  disabled={purchaseQuantity >= 10}
                >
                  ＋
                </button>
                <span className="text-sm text-gray-500 dark:text-neutral-400">セット（最大10）</span>
              </div>
              {singlePurchaseItem?.duration_minutes && singlePurchaseItem?.quantity && (
                <p className="mt-2 text-xs text-gray-500 dark:text-neutral-400">
                  計 {formatDuration(singlePurchaseItem.duration_minutes * singlePurchaseItem.quantity * purchaseQuantity)} のバフ（{formatDuration(singlePurchaseItem.duration_minutes)} × {singlePurchaseItem.quantity * purchaseQuantity}個）
                </p>
              )}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="minecraft-username" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Minecraft ID（ユーザー名）
            </label>
            <input
              type="text"
              id="minecraft-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="例: Steve"
              className="w-full px-4 py-3 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
              autoComplete="off"
              autoFocus
            />
            {username && !isValidUsername && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                3〜16文字の英数字とアンダースコアのみ使用できます
              </p>
            )}
          </div>

          {/* 注意事項 */}
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
            <p className="text-xs text-amber-800 dark:text-amber-300 mb-0">
              <strong>重要:</strong> Minecraft ID を間違えると特典が付与されません。正確に入力してください。
            </p>
          </div>

          {/* 確認事項チェックボックス */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedTerms}
                onChange={(e) => setConfirmedTerms(e.target.checked)}
                className="mt-0.5 w-5 h-5 text-teal-600 bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 rounded focus:ring-teal-500 cursor-pointer"
              />
              <span className="text-sm text-blue-800 dark:text-blue-200">
                <a href="#confirmation" onClick={onClose} className="font-semibold underline hover:text-blue-600 dark:hover:text-blue-300">ご購入前の確認事項</a>を確認しました
              </span>
            </label>
          </div>

          {/* 購入手順の説明 */}
          <div className="bg-gray-50 dark:bg-neutral-700/50 rounded-lg p-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">購入手続きの流れ</h3>
            <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span>メールアドレスを入力</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span>決済情報（カード番号等）を入力</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span>請求先情報（郵便番号・氏名）を入力 <span className="text-gray-500">※運営に通知されません</span></span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <span>チェックボックスを確認して決済完了</span>
              </li>
            </ol>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-neutral-600">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                <strong>チェックボックスについて:</strong>
              </p>
              <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 ml-2">
                <li>• メール配信: MOFUCRAFT!! と Tebex からのお知らせを受け取る</li>
                <li>• 利用規約: Tebex の規約に同意し、即時提供のため返金不可を承認</li>
              </ul>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-neutral-600">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                <strong>確認:</strong> 決済ページ左上に表示される Minecraft ID が正しいことを必ずご確認ください。
              </p>
            </div>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className={`rounded-lg p-3 mb-3 ${isExclusiveError ? 'bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800' : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'}`}>
              <div className="flex items-start gap-2">
                <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isExclusiveError ? 'text-orange-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isExclusiveError ? 'text-orange-800 dark:text-orange-300' : 'text-red-800 dark:text-red-300'}`}>
                    {error}
                  </p>
                  {errorDetails && (
                    <p className={`text-xs mt-1 ${isExclusiveError ? 'text-orange-700 dark:text-orange-400' : 'text-red-700 dark:text-red-400'}`}>
                      {errorDetails}
                    </p>
                  )}
                  {isExclusiveError && isSubscription && (
                    <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
                      <p className="text-xs text-orange-700 dark:text-orange-400 mb-2">
                        現在の加入状況は Tebex で確認できます:
                      </p>
                      <a
                        href="https://checkout.tebex.io/payment-history"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline font-medium"
                      >
                        Tebex 購入履歴を確認
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={!isValidUsername || isLoading || !tebexLoaded || !confirmedTerms}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {!tebexLoaded ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                決済システム読み込み中...
              </>
            ) : isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                処理中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                購入手続きへ進む
              </>
            )}
          </button>

          {/* 戻るボタン */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 mt-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium text-sm transition-colors"
          >
            戻る
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}

function getTierItemImageByIndex(tierIndex: number): string {
  // tierIndexに基づいて画像を返す（価格順にソート済み）
  const images = [
    '/img/Blue_Dye.webp',        // 0: 最安 - 青色の染料
    '/img/Amethyst_Shard.webp',  // 1: 中間 - アメジストの欠片
    '/img/Nether_Star.webp',     // 2: 最高 - ネザースター
  ];

  return images[tierIndex] || '/img/Blue_Dye.webp';
}

