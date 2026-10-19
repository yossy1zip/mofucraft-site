import { poolDps } from "./db.server";

export interface DpsRankingEntry {
  uuid: string;
  name: string;
  maxDps: number;
}

export async function fetchDpsRanking(limit = 3): Promise<DpsRankingEntry[]> {
  try {
    const [rows] = await poolDps.query(
      "SELECT uuid, name, max_dps AS maxDps FROM mofudps_players ORDER BY max_dps DESC LIMIT ?",
      [limit]
    );
    return rows as DpsRankingEntry[];
  } catch (error) {
    console.error('DPSランキング取得エラー:', error);
    return [];
  }
}
