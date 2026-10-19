import NodeCache from "node-cache";

// 5分間のキャッシュ
const cache = new NodeCache({ stdTTL: 300 });

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || "";

interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// Strapi v5のフラットな構造に対応
export interface WeaponData {
  id: number;
  documentId: string;
  weapon_name: string;
  slug: string;
  weapon_title?: string;
  firearm_action_type?: string;
  description?: string | null;
  lore?: string | null;
  info_bar_text?: string | null;
  raw_config?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface GalleryImageFormat {
  url: string;
  width: number;
  height: number;
}

export interface GalleryImageFormats {
  thumbnail?: GalleryImageFormat;
  small?: GalleryImageFormat;
  medium?: GalleryImageFormat;
  large?: GalleryImageFormat;
}

export interface GalleryImage {
  id: number;
  documentId: string;
  name: string;
  alternativeText?: string | null;
  caption?: string | null;
  width: number;
  height: number;
  formats?: GalleryImageFormats;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryData {
  id: number;
  documentId: string;
  alt: string;
  description: string;
  server: string;
  date?: string | null;
  image: GalleryImage[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface TebexTier {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  price: number;
  jpy_price: number | null;
  currency: string;
  tebex_package_id: string;
  tebex_package_url: string;
  description: string;
  perks: string | null;
  active: boolean;
  sort_order: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface TebexSinglePurchaseItem {
  id: number;
  documentId: string;
  name: string;
  category: "boost" | "service" | "cosmetic";
  boost_type: "mining" | "range" | "fly" | null;
  duration_minutes: number | null;
  price: number;
  jpy_price: number | null;
  currency: string;
  tebex_package_id: string;
  description: string | null;
  perks: string | null;
  quantity: number | null;
  delivery_note: string | null;
  active: boolean;
  sort_order: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface TebexPayment {
  id: number;
  documentId: string;
  tebex_transaction_id: string;
  minecraft_uuid: string;
  minecraft_username: string | null;
  package_id: string | null;
  package_name: string | null;
  price: number;
  currency: string;
  purchased_at: string;
  status: "completed" | "refunded" | "chargeback";
  createdAt: string;
  updatedAt: string;
}

/**
 * Strapi APIからデータを取得する共通関数
 */
async function fetchFromStrapi<T>(
  endpoint: string,
  cacheKey?: string
): Promise<T> {
  // キャッシュチェック
  if (cacheKey) {
    const cached = cache.get<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // URLの末尾のスラッシュを削除してからエンドポイントを結合
  const baseUrl = STRAPI_URL.replace(/\/$/, "");
  const url = `${baseUrl}${endpoint}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (STRAPI_API_TOKEN) {
    headers.Authorization = `Bearer ${STRAPI_API_TOKEN}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Strapi API error response: ${errorText}`);
    throw new Error(
      `Strapi API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  // キャッシュに保存
  if (cacheKey) {
    cache.set(cacheKey, data);
  }

  return data;
}

/**
 * 全ての武器データを取得
 */
export async function getWeapons(): Promise<WeaponData[]> {
  const response = await fetchFromStrapi<StrapiResponse<WeaponData[]>>(
    "/api/weaponmechanics-mains?sort=weapon_name:asc",
    "weapons_list"
  );

  return response.data;
}

/**
 * スラッグで武器データを取得
 */
export async function getWeaponBySlug(
  slug: string
): Promise<WeaponData | null> {
  const response = await fetchFromStrapi<StrapiResponse<WeaponData[]>>(
    `/api/weaponmechanics-mains?filters[slug][$eq]=${encodeURIComponent(slug)}`,
    `weapon_${slug}`
  );

  if (!response.data || response.data.length === 0) {
    return null;
  }

  return response.data[0];
}

/**
 * IDで武器データを取得
 */
export async function getWeaponById(id: number): Promise<WeaponData | null> {
  try {
    const response = await fetchFromStrapi<StrapiResponse<WeaponData>>(
      `/api/weaponmechanics-mains/${id}`,
      `weapon_id_${id}`
    );

    return response.data;
  } catch (error) {
    return null;
  }
}

/**
 * 配列をシャッフルする（Fisher-Yatesアルゴリズム）
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * ギャラリー画像を取得（ランダムに50件）
 */
export async function getGalleries(): Promise<GalleryData[]> {
  const response = await fetchFromStrapi<StrapiResponse<GalleryData[]>>(
    "/api/mofucraft-galleries?populate=image&pagination[limit]=200",
    "galleries_list"
  );

  // Strapi v5 では同じドキュメントが複数返ることがあるため、
  // `publishedAt` が存在する（公開済みの）ものだけを表示対象とする
  const galleries = (response.data || []).filter((g) => Boolean(g.publishedAt));

  // 重複除去（念のため documentId で一意化）
  const seen = new Set<string>();
  const unique = galleries.filter((g) => {
    const key = g.documentId || String(g.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // シャッフルして50件に制限
  return shuffleArray(unique).slice(0, 50);
}

/**
 * PvEギャラリー画像を取得（ランダムに50件）
 */
export async function getPveGalleries(): Promise<GalleryData[]> {
  const response = await fetchFromStrapi<StrapiResponse<GalleryData[]>>(
    "/api/pve-galleries?populate=image&pagination[limit]=200",
    "pve_galleries_list"
  );

  // Strapi v5 では同じドキュメントが複数返ることがあるため、
  // `publishedAt` が存在する（公開済みの）ものだけを表示対象とする
  const galleries = (response.data || []).filter((g) => Boolean(g.publishedAt));

  // 重複除去（念のため documentId で一意化）
  const seen = new Set<string>();
  const unique = galleries.filter((g) => {
    const key = g.documentId || String(g.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // シャッフルして50件に制限
  return shuffleArray(unique).slice(0, 50);
}

/**
 * Tebex Subscription Tier を取得
 */
export async function getTebexTiers(): Promise<TebexTier[]> {
  const response = await fetchFromStrapi<StrapiResponse<TebexTier[]>>(
    "/api/tebex-subscription-tiers?filters[active][$eq]=true&sort=sort_order:asc&populate=*",
    "tebex_tiers_list"
  );

  // publishedAt が存在する（公開済み）もののみ返す
  return (response.data || []).filter((tier) => Boolean(tier.publishedAt));
}

/**
 * 単品購入アイテムを取得
 */
export async function getTebexSinglePurchaseItems(): Promise<TebexSinglePurchaseItem[]> {
  try {
    const response = await fetchFromStrapi<StrapiResponse<TebexSinglePurchaseItem[]>>(
      "/api/tebex-single-purchase-items?filters[active][$eq]=true&sort=sort_order:asc",
      "tebex_single_purchase_items_list"
    );
    return (response.data || []).filter((item) => Boolean(item.publishedAt));
  } catch {
    return [];
  }
}

/**
 * 支払いデータをフィルタリングするヘルパー関数
 */
function filterPayments(payments: TebexPayment[]): TebexPayment[] {
  return payments.filter(p =>
    p.status === 'completed' &&
    p.price > 0 &&
    !(p as any).is_hidden
  );
}

/**
 * 最近の購入履歴を取得（直近10件）
 */
export async function getRecentPurchases(): Promise<TebexPayment[]> {
  const response = await fetchFromStrapi<StrapiResponse<TebexPayment[]>>(
    "/api/tebex-payments?sort=purchased_at:desc&pagination[limit]=50",
    "recent_purchases"
  );

  return filterPayments(response.data || []).slice(0, 10);
}

/**
 * 過去12ヶ月の購入履歴を取得（ランキング集計用）
 */
export async function getPaymentsLast12Months(): Promise<TebexPayment[]> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const response = await fetchFromStrapi<StrapiResponse<TebexPayment[]>>(
    `/api/tebex-payments?sort=purchased_at:desc&pagination[limit]=1000`,
    "payments_last_12_months"
  );

  return filterPayments(response.data || []).filter(p =>
    new Date(p.purchased_at) >= oneYearAgo
  );
}

/**
 * 過去1ヶ月の購入履歴を取得（月間合計用）
 */
export async function getPaymentsLastMonth(): Promise<TebexPayment[]> {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const response = await fetchFromStrapi<StrapiResponse<TebexPayment[]>>(
    `/api/tebex-payments?sort=purchased_at:desc&pagination[limit]=1000`,
    "payments_last_month"
  );

  return filterPayments(response.data || []).filter(p =>
    new Date(p.purchased_at) >= oneMonthAgo
  );
}

/**
 * キャッシュをクリア
 */
export function clearStrapiCache(): void {
  cache.flushAll();
}
