import { pool } from "./db.server";
import type { PlayerMoney, MoneyRankingEntry } from "./money";

export async function fetchMoneyRanking(limit = 30) {
  try {
    const [rows]: any[] = await pool.query(
      `SELECT 
        a.id as account_id,
        LOWER(CONCAT(
          SUBSTR(HEX(a.uuid), 1, 8), '-',
          SUBSTR(HEX(a.uuid), 9, 4), '-', 
          SUBSTR(HEX(a.uuid), 13, 4), '-',
          SUBSTR(HEX(a.uuid), 17, 4), '-',
          SUBSTR(HEX(a.uuid), 21, 12)
        )) as uuid,
        b.balance,
        h.name
      FROM mecon_account a
      LEFT JOIN mecon_balance b ON a.id = b.id
      LEFT JOIN (
        SELECT uuid, name,
               ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
        FROM litebans_history
      ) h ON LOWER(CONCAT(
        SUBSTR(HEX(a.uuid), 1, 8), '-',
        SUBSTR(HEX(a.uuid), 9, 4), '-', 
        SUBSTR(HEX(a.uuid), 13, 4), '-',
        SUBSTR(HEX(a.uuid), 17, 4), '-',
        SUBSTR(HEX(a.uuid), 21, 12)
      )) = h.uuid AND h.rn = 1
      WHERE b.balance IS NOT NULL
      ORDER BY b.balance DESC
      LIMIT ?`,
      [limit]
    );

    return rows.map((row: any, index: number) => ({
      rank: index + 1,
      id: row.account_id,
      name: row.name || 'Unknown',
      balance: parseInt(row.balance),
      uuid: row.uuid
    }));
  } catch (err) {
    console.error("所持金ランキング取得エラー:", err);
    throw err;
  }
}

export async function fetchTopMoneyRanking(limit = 3) {
  return await fetchMoneyRanking(limit);
}

export async function fetchPlayerMoney(playerUuid: string) {
  try {
    const [rows]: any[] = await pool.query(
      `SELECT 
        a.id as account_id,
        LOWER(CONCAT(
          SUBSTR(HEX(a.uuid), 1, 8), '-',
          SUBSTR(HEX(a.uuid), 9, 4), '-', 
          SUBSTR(HEX(a.uuid), 13, 4), '-',
          SUBSTR(HEX(a.uuid), 17, 4), '-',
          SUBSTR(HEX(a.uuid), 21, 12)
        )) as uuid,
        b.balance,
        h.name
      FROM mecon_account a
      LEFT JOIN mecon_balance b ON a.id = b.id
      LEFT JOIN (
        SELECT uuid, name,
               ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
        FROM litebans_history
      ) h ON LOWER(CONCAT(
        SUBSTR(HEX(a.uuid), 1, 8), '-',
        SUBSTR(HEX(a.uuid), 9, 4), '-', 
        SUBSTR(HEX(a.uuid), 13, 4), '-',
        SUBSTR(HEX(a.uuid), 17, 4), '-',
        SUBSTR(HEX(a.uuid), 21, 12)
      )) = h.uuid AND h.rn = 1
      WHERE LOWER(CONCAT(
        SUBSTR(HEX(a.uuid), 1, 8), '-',
        SUBSTR(HEX(a.uuid), 9, 4), '-', 
        SUBSTR(HEX(a.uuid), 13, 4), '-',
        SUBSTR(HEX(a.uuid), 17, 4), '-',
        SUBSTR(HEX(a.uuid), 21, 12)
      )) = ?`,
      [playerUuid.toLowerCase()]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      accountId: row.account_id,
      uuid: row.uuid,
      name: row.name,
      balance: parseInt(row.balance) || 0
    };
  } catch (err) {
    console.error("プレイヤー所持金取得エラー:", err);
    throw err;
  }
}

