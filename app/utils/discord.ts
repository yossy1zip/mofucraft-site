import { getStrapiDiscordEvents } from "./strapi.server";

// Strapi API のベース URL（末尾スラッシュを削除して正規化）
const STRAPI_URL = (process.env.STRAPI_URL || "https://strapi.example.com").replace(/\/$/, "");

/**
 * フロントエンド向けイベント型
 * Strapi の discord-events API から取得したデータを表示用に変換
 */
export interface Event {
  id: number;          // Strapi の id
  discordId: string;   // Discord のイベント ID
  name: string;
  description: string | null;
  location: string | null;
  startAt: string;     // ISO 8601 形式の開始日時
  endAt: string | null; // ISO 8601 形式の終了日時
  image: string | null; // 完全な画像 URL（Strapi baseURL 付き）
  imageHash: string | null; // Discord画像ハッシュ
  isActive: boolean;   // イベントがアクティブかどうか
  url: string;         // Discord イベント詳細ページ URL
}







/**
 * Strapi API から Discord イベント一覧を取得
 * Strapi の /api/discord-events?populate=* を唯一のデータ源として使用
 */
export async function getEvents(): Promise<Event[]> {
  try {
    const strapiEvents = await getStrapiDiscordEvents();
    
    // デバッグ: Strapiから取得した生データを確認
    if (strapiEvents.length > 0) {
      console.log("First Strapi event:", JSON.stringify(strapiEvents[0], null, 2));
    }
    
    // Strapi のレスポンスをフロントエンド向け Event 型に変換
    const events: Event[] = strapiEvents.map((strapiEvent) => ({
      id: strapiEvent.id,
      discordId: strapiEvent.discordId,
      name: strapiEvent.name,
      description: strapiEvent.description,
      location: strapiEvent.location,
      startAt: strapiEvent.startAt,
      endAt: strapiEvent.endAt,
      // 画像 URL は Strapi の baseURL を付与して完全 URL にする
      image: strapiEvent.image ? `${STRAPI_URL}${strapiEvent.image.url}` : null,
      imageHash: strapiEvent.imageHash,
      isActive: strapiEvent.isActive,
      url: strapiEvent.url,
    }));

    console.log(`✓ Fetched ${events.length} events from Strapi`);
    if (events.length > 0) {
      console.log("First converted event:", JSON.stringify(events[0], null, 2));
    }
    return events;
  } catch (error) {
    console.error("Failed to get events from Strapi:", error);
    return [];
  }
}