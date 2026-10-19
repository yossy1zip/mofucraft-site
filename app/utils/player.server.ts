import { pool } from './db.server';

// UUIDの正規表現パターン（ハイフンありなし両方対応）
const UUID_PATTERN = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

/**
 * 文字列がUUIDかどうかを判定する
 */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * UUIDを標準形式（ハイフンあり）に正規化する
 */
export function normalizeUuid(uuid: string): string {
  // ハイフンを削除してから標準形式に変換
  const cleanUuid = uuid.replace(/-/g, '');
  return [
    cleanUuid.slice(0, 8),
    cleanUuid.slice(8, 12),
    cleanUuid.slice(12, 16),
    cleanUuid.slice(16, 20),
    cleanUuid.slice(20, 32)
  ].join('-');
}

/**
 * ユーザーネームからUUIDを検索する
 */
export async function findUuidByUsername(username: string): Promise<string | null> {
  try {
    // LiteBansの履歴テーブルから最新のUUIDを検索
    const query = `
      SELECT uuid, name
      FROM litebans_history
      WHERE LOWER(name) = LOWER(?)
      ORDER BY date DESC
      LIMIT 1
    `;
    
    const [rows] = await pool.execute(query, [username]) as any;
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0].uuid;
  } catch (error) {
    console.error('ユーザーネームからUUID検索エラー:', error);
    return null;
  }
}

/**
 * プレイヤー識別子（UUIDまたはユーザーネーム）を解決してUUIDを返す
 */
export async function resolvePlayerUuid(identifier: string): Promise<{ uuid: string; username?: string } | null> {
  // 入力値がUUIDの場合
  if (isUuid(identifier)) {
    const normalizedUuid = normalizeUuid(identifier);
    
    // UUIDが存在するかチェック（履歴テーブルから最新の名前を取得）
    const query = `
      SELECT uuid, name
      FROM litebans_history
      WHERE uuid = ?
      ORDER BY date DESC
      LIMIT 1
    `;
    
    try {
      const [rows] = await pool.execute(query, [normalizedUuid]) as any;
      
      if (rows.length > 0) {
        return {
          uuid: normalizedUuid,
          username: rows[0].name
        };
      }
      
      // 履歴テーブルになければUUIDのみ返す（データが存在しない可能性もある）
      return {
        uuid: normalizedUuid
      };
    } catch (error) {
      console.error('UUID検証エラー:', error);
      return {
        uuid: normalizedUuid
      };
    }
  }
  
  // 入力値がユーザーネームの場合
  const uuid = await findUuidByUsername(identifier);
  if (uuid) {
    return {
      uuid,
      username: identifier
    };
  }
  
  return null;
}