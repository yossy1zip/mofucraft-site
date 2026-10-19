import axios from "axios";
import FormData from "form-data";

// 末尾のスラッシュを削除して正規化
const STRAPI_URL = (process.env.STRAPI_URL || "https://strapi.example.com").replace(/\/$/, "");
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!STRAPI_API_TOKEN) {
  console.warn("STRAPI_API_TOKEN is not set. Strapi API calls may fail.");
}

// Strapi の discord-event レスポンス型
export interface StrapiDiscordEvent {
  id: number;
  documentId: string;
  discordId: string;
  name: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  url: string;
  imageHash: string | null;
  isActive: boolean;
  image?: {
    id: number;
    url: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

/**
 * Strapi から全ての discord-event を取得
 */
export async function getStrapiDiscordEvents(): Promise<StrapiDiscordEvent[]> {
  try {
    const response = await axios.get<StrapiResponse<StrapiDiscordEvent[]>>(
      `${STRAPI_URL}/api/discord-events`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        params: {
          populate: "image",
          pagination: {
            pageSize: 100, // 十分な数を取得
          },
        },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch Strapi discord events:", error);
    return [];
  }
}

/**
 * discord_id で Strapi のイベントを検索
 */
export async function findStrapiEventByDiscordId(
  discordId: string
): Promise<StrapiDiscordEvent | null> {
  try {
    const response = await axios.get<StrapiResponse<StrapiDiscordEvent[]>>(
      `${STRAPI_URL}/api/discord-events`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        params: {
          populate: "image",
          filters: {
            discordId: {
              $eq: discordId,
            },
          },
        },
      }
    );
    return response.data.data[0] || null;
  } catch (error) {
    console.error(
      `Failed to find Strapi event by discord_id ${discordId}:`,
      error
    );
    return null;
  }
}

/**
 * Strapi に新規 discord-event を作成
 */
export async function createStrapiDiscordEvent(data: {
  discordId: string;
  name: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  url: string;
  imageHash: string | null;
  isActive: boolean;
  image?: number; // Media ID
}): Promise<StrapiDiscordEvent | null> {
  try {
    const response = await axios.post<{ data: StrapiDiscordEvent }>(
      `${STRAPI_URL}/api/discord-events`,
      { data },
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`Created Strapi event for discordId: ${data.discordId}`);
    return response.data.data;
  } catch (error) {
    console.error("Failed to create Strapi discord event:", error);
    return null;
  }
}

/**
 * Strapi の discord-event を更新（documentId 使用）
 */
export async function updateStrapiDiscordEvent(
  documentId: string,
  data: {
    name?: string;
    description?: string | null;
    location?: string | null;
    startAt?: string;
    endAt?: string | null;
    url?: string;
    imageHash?: string | null;
    isActive?: boolean;
    image?: number | null; // Media ID
  }
): Promise<StrapiDiscordEvent | null> {
  try {
    const response = await axios.put<{ data: StrapiDiscordEvent }>(
      `${STRAPI_URL}/api/discord-events/${documentId}`,
      { data },
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`Updated Strapi event: ${documentId}`);
    return response.data.data;
  } catch (error) {
    console.error(`Failed to update Strapi event ${documentId}:`, error);
    return null;
  }
}

/**
 * 画像 URL から Buffer をダウンロード
 */
export async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000,
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error(`Failed to download image from ${url}:`, error);
    return null;
  }
}

/**
 * Strapi に画像をアップロード（Media）
 */
export async function uploadImageToStrapi(
  imageBuffer: Buffer,
  filename: string
): Promise<number | null> {
  try {
    const formData = new FormData();
    formData.append("files", imageBuffer, filename);

    const response = await axios.post<Array<{ id: number; url: string }>>(
      `${STRAPI_URL}/api/upload`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          ...formData.getHeaders(),
        },
      }
    );

    const uploadedFile = response.data[0];
    console.log(`Uploaded image to Strapi: ${uploadedFile.url}`);
    return uploadedFile.id;
  } catch (error) {
    console.error("Failed to upload image to Strapi:", error);
    return null;
  }
}

// =====================
// Donation 関連
// =====================

export interface StrapiDonation {
  id: number;
  documentId: string;
  minecraft_username: string;
  minecraft_uuid: string | null;
  price: string | null;
  currency: "JPY" | "USD" | "EUR";
  donated_at: string;
  is_anonymous: boolean;
  note: string | null;
}

/**
 * Strapi から公開済みの寄付データを取得（JPYのみ）
 */
export async function getDonations(): Promise<StrapiDonation[]> {
  try {
    const response = await axios.get<StrapiResponse<StrapiDonation[]>>(
      `${STRAPI_URL}/api/donations`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        params: {
          "filters[currency][$eq]": "JPY",
          status: "published",
          "pagination[pageSize]": 100,
        },
      }
    );
    return response.data.data || [];
  } catch (error) {
    console.error("Strapi donation 取得エラー:", error);
    return [];
  }
}

/**
 * 寄付データを uuid ごとに集計
 */
export function aggregateDonationsByUuid(
  donations: StrapiDonation[]
): Record<string, number> {
  return donations.reduce(
    (acc, donation) => {
      const uuid = donation.minecraft_uuid;
      if (!uuid) return acc;

      const amount = Number(donation.price) || 0;
      acc[uuid] = (acc[uuid] || 0) + amount;
      return acc;
    },
    {} as Record<string, number>
  );
}

// =====================
// TebexStat 関連
// =====================

export interface TebexStat {
  id: number;
  documentId: string;
  uuid: string;
  username: string;
  total_amount_JPY: number;
  purchase_count: number;
  first_purchase_at: string | null;
  last_purchase_at: string | null;
}

/**
 * Strapi から Tebex 課金者統計を取得（金額順）
 */
export async function getTebexStats(): Promise<TebexStat[]> {
  try {
    const response = await axios.get<StrapiResponse<TebexStat[]>>(
      `${STRAPI_URL}/api/tebex-stats`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        params: {
          sort: "total_amount_JPY:desc",
          "pagination[pageSize]": 100,
        },
      }
    );
    return response.data.data || [];
  } catch (error) {
    console.error("Strapi TebexStat 取得エラー:", error);
    return [];
  }
}

// =====================
// StaffProfile 関連
// =====================

export interface StrapiStaffProfile {
  id: number;
  documentId: string;
  uuid: string;
  username: string;
  specialty: string | null;
  owner_comment: string | null;
  personal_comment: string | null;
  activity_periods: string | null;
  hobby: string | null;
  mbti: string | null;
}

/**
 * Strapi から全スタッフプロフィールを取得
 */
export async function getStaffProfiles(): Promise<StrapiStaffProfile[]> {
  try {
    const response = await axios.get<StrapiResponse<StrapiStaffProfile[]>>(
      `${STRAPI_URL}/api/staff-profiles`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        params: {
          "pagination[pageSize]": 100,
        },
      }
    );
    return response.data.data || [];
  } catch (error) {
    console.error("Strapi StaffProfile 取得エラー:", error);
    return [];
  }
}

/**
 * UUID でスタッフプロフィールを取得
 */
export async function getStaffProfileByUuid(
  uuid: string
): Promise<StrapiStaffProfile | null> {
  try {
    const response = await axios.get<StrapiResponse<StrapiStaffProfile[]>>(
      `${STRAPI_URL}/api/staff-profiles`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        params: {
          "filters[uuid][$eq]": uuid,
        },
      }
    );
    return response.data.data[0] || null;
  } catch (error) {
    console.error(`Strapi StaffProfile 取得エラー (uuid: ${uuid}):`, error);
    return null;
  }
}
