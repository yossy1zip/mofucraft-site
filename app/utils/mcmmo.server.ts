import { pool } from "./db.server";

interface McmmoUserData {
  id: number;
  uuid: string;
  total_level: number;
  player_name: string | null;
}

export async function getMcmmoDataByUuid(playerUuid: string): Promise<McmmoUserData | null> {
  try {
    // mcmmo_usersテーブルからuuidでidを取得し、
    // mcmmo_skillsテーブルのtotalを取得
    const [rows] = await pool.execute(
      `SELECT 
        u.id,
        u.uuid,
        u.user as player_name,
        COALESCE(s.total, 0) as total_level
       FROM mcmmo_users u
       LEFT JOIN mcmmo_skills s ON u.id = s.user_id
       WHERE u.uuid = ?
       LIMIT 1`,
      [playerUuid]
    );
    
    const result = rows as McmmoUserData[];
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error fetching mcMMO data:', error);
    return null;
  }
}