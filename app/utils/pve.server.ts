import { poolPve } from "./db.server";

export type PveRankingPeriod = 'day' | 'week' | 'month' | 'total';
const PERIODS: PveRankingPeriod[] = ['day', 'week', 'month', 'total'];

export interface KillCountRankingEntry {
  uuid: string;
  name: string;
  count: number;
}

export interface WeaponUsedRankingEntry {
  weaponName: string;
  count: number;
}

export async function fetchKillCountRanking(limit = 3): Promise<Record<PveRankingPeriod, KillCountRankingEntry[]>> {
  const result: Record<PveRankingPeriod, KillCountRankingEntry[]> = { day: [], week: [], month: [], total: [] };
  await Promise.all(PERIODS.map(async (period) => {
    try {
      const [rows] = await poolPve.query(
        `SELECT u.uuid, u.name, k.${period} AS count
         FROM mofupve_kill_count k
         JOIN mofupve_user u ON u.id = k.user_id
         WHERE k.${period} > 0
         ORDER BY k.${period} DESC
         LIMIT ?`,
        [limit]
      );
      result[period] = rows as KillCountRankingEntry[];
    } catch (error) {
      console.error(`討伐数ランキング取得エラー(${period}):`, error);
    }
  }));
  return result;
}

export async function fetchWeaponUsedRanking(limit = 3): Promise<Record<PveRankingPeriod, WeaponUsedRankingEntry[]>> {
  const result: Record<PveRankingPeriod, WeaponUsedRankingEntry[]> = { day: [], week: [], month: [], total: [] };
  await Promise.all(PERIODS.map(async (period) => {
    try {
      const [rows] = await poolPve.query(
        `SELECT w.name AS weaponName, wu.${period} AS count
         FROM mofupve_weapon_used_count wu
         JOIN mofupve_weapon w ON w.id = wu.weapon_id
         WHERE wu.${period} > 0
         ORDER BY wu.${period} DESC
         LIMIT ?`,
        [limit]
      );
      result[period] = rows as WeaponUsedRankingEntry[];
    } catch (error) {
      console.error(`使用武器ランキング取得エラー(${period}):`, error);
    }
  }));
  return result;
}
