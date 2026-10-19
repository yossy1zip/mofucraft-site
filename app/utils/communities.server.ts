import { poolMain, pool } from "./db.server";
import type { RowDataPacket } from "mysql2";

/**
 * コミュニティ情報の型定義
 */
export interface Community {
  id: number;
  slug: string;
  name: string;
  prefix: string;
  description: string | null;
  join_mode: "INVITE_ONLY" | "PUBLIC";
  max_members: number;
  created_at: Date;
  member_count: number;
  base_name: string | null;
  base_x: number | null;
  base_y: number | null;
  base_z: number | null;
  base_world: string | null;
}

/**
 * コミュニティメンバー情報の型定義
 */
export interface CommunityMember {
  player_uuid: string;
  player_name: string | null;
  role: string;
  joined_at: Date;
}

/**
 * データベースから取得する生のコミュニティデータの型
 */
interface CommunityRow extends RowDataPacket {
  id: number;
  slug: string;
  name: string;
  prefix: string;
  description: string | null;
  join_mode: "INVITE_ONLY" | "PUBLIC";
  max_members: number;
  created_at: Date;
  member_count: string;
  base_name: string | null;
  base_x: number | null;
  base_y: number | null;
  base_z: number | null;
  base_world: string | null;
}

/**
 * 全コミュニティの一覧を取得
 * moco_communities と moco_members を JOIN してメンバー数も含める
 */
export async function fetchAllCommunities(): Promise<Community[]> {
  try {
    const [rows] = await poolMain.query<CommunityRow[]>(
      `SELECT
        c.id,
        c.slug,
        c.name,
        c.prefix,
        c.description,
        c.join_mode,
        c.max_members,
        c.created_at,
        c.base_name,
        c.base_x,
        c.base_y,
        c.base_z,
        c.base_world,
        COUNT(m.player_uuid) AS member_count
      FROM moco_communities c
      LEFT JOIN moco_members m ON m.community_id = c.id
      GROUP BY c.id, c.slug, c.name, c.prefix, c.description, c.join_mode, c.max_members, c.created_at, c.base_name, c.base_x, c.base_y, c.base_z, c.base_world
      ORDER BY c.created_at DESC`
    );

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      prefix: row.prefix,
      description: row.description,
      join_mode: row.join_mode,
      max_members: row.max_members,
      created_at: new Date(row.created_at),
      member_count: parseInt(row.member_count) || 0,
      base_name: row.base_name,
      base_x: row.base_x,
      base_y: row.base_y,
      base_z: row.base_z,
      base_world: row.base_world,
    }));
  } catch (err) {
    console.error("コミュニティ一覧取得エラー:", err);
    throw err;
  }
}

/**
 * 公開コミュニティのみを取得
 */
export async function fetchPublicCommunities(): Promise<Community[]> {
  try {
    const [rows] = await poolMain.query<CommunityRow[]>(
      `SELECT
        c.id,
        c.slug,
        c.name,
        c.prefix,
        c.description,
        c.join_mode,
        c.max_members,
        c.created_at,
        c.base_name,
        c.base_x,
        c.base_y,
        c.base_z,
        c.base_world,
        COUNT(m.player_uuid) AS member_count
      FROM moco_communities c
      LEFT JOIN moco_members m ON m.community_id = c.id
      WHERE c.join_mode = 'PUBLIC'
      GROUP BY c.id, c.slug, c.name, c.prefix, c.description, c.join_mode, c.max_members, c.created_at, c.base_name, c.base_x, c.base_y, c.base_z, c.base_world
      ORDER BY c.created_at DESC`
    );

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      prefix: row.prefix,
      description: row.description,
      join_mode: row.join_mode,
      max_members: row.max_members,
      created_at: new Date(row.created_at),
      member_count: parseInt(row.member_count) || 0,
      base_name: row.base_name,
      base_x: row.base_x,
      base_y: row.base_y,
      base_z: row.base_z,
      base_world: row.base_world,
    }));
  } catch (err) {
    console.error("公開コミュニティ取得エラー:", err);
    throw err;
  }
}

/**
 * 特定のコミュニティをIDまたはslugで取得
 */
export async function fetchCommunityByIdOrSlug(idOrSlug: string): Promise<Community | null> {
  try {
    const isNumeric = /^\d+$/.test(idOrSlug);
    const whereClause = isNumeric ? 'c.id = ?' : 'c.slug = ?';
    const param = isNumeric ? parseInt(idOrSlug) : idOrSlug;

    const [rows] = await poolMain.query<CommunityRow[]>(
      `SELECT
        c.id,
        c.slug,
        c.name,
        c.prefix,
        c.description,
        c.join_mode,
        c.max_members,
        c.created_at,
        c.base_name,
        c.base_x,
        c.base_y,
        c.base_z,
        c.base_world,
        COUNT(m.player_uuid) AS member_count
      FROM moco_communities c
      LEFT JOIN moco_members m ON m.community_id = c.id
      WHERE ${whereClause}
      GROUP BY c.id, c.slug, c.name, c.prefix, c.description, c.join_mode, c.max_members, c.created_at, c.base_name, c.base_x, c.base_y, c.base_z, c.base_world`,
      [param]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      prefix: row.prefix,
      description: row.description,
      join_mode: row.join_mode,
      max_members: row.max_members,
      created_at: new Date(row.created_at),
      member_count: parseInt(row.member_count) || 0,
      base_name: row.base_name,
      base_x: row.base_x,
      base_y: row.base_y,
      base_z: row.base_z,
      base_world: row.base_world,
    };
  } catch (err) {
    console.error("コミュニティ取得エラー:", err);
    throw err;
  }
}

/**
 * コミュニティメンバーの型定義（DB）
 */
interface CommunityMemberRow extends RowDataPacket {
  player_uuid: string;
  player_name: string | null;
  role: string;
  joined_at: Date;
}

/**
 * 特定のコミュニティのメンバーを取得
 */
export async function fetchCommunityMembers(communityId: number): Promise<CommunityMember[]> {
  try {
    // moco_members と litebans_history を LEFT JOIN で一度に取得
    // litebans_history の uuid は文字列型なので、HEX 変換不要
    const [rows] = await poolMain.query<RowDataPacket[]>(
      `SELECT
        m.player_uuid,
        m.role,
        m.joined_at,
        h.name as player_name
      FROM moco_members m
      LEFT JOIN (
        SELECT uuid, name,
               ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
        FROM mofucraft.litebans_history
      ) h ON LOWER(m.player_uuid) = LOWER(h.uuid) AND h.rn = 1
      WHERE m.community_id = ?
      ORDER BY m.joined_at ASC`,
      [communityId]
    );

    return rows.map((row) => ({
      player_uuid: row.player_uuid,
      player_name: row.player_name || null,
      role: row.role,
      joined_at: new Date(row.joined_at),
    }));
  } catch (err) {
    console.error("コミュニティメンバー取得エラー:", err);
    throw err;
  }
}

/**
 * プレイヤーが所属しているコミュニティを取得
 */
export interface PlayerCommunity {
  id: number;
  slug: string;
  name: string;
  prefix: string;
  role: string;
  joined_at: Date;
}

interface PlayerCommunityRow extends RowDataPacket {
  id: number;
  slug: string;
  name: string;
  prefix: string;
  role: string;
  joined_at: Date;
}

export async function fetchCommunitiesByPlayerUuid(playerUuid: string): Promise<PlayerCommunity[]> {
  try {
    const [rows] = await poolMain.query<PlayerCommunityRow[]>(
      `SELECT
        c.id,
        c.slug,
        c.name,
        c.prefix,
        m.role,
        m.joined_at
      FROM moco_members m
      INNER JOIN moco_communities c ON c.id = m.community_id
      WHERE LOWER(m.player_uuid) = LOWER(?)
      ORDER BY m.joined_at ASC`,
      [playerUuid]
    );

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      prefix: row.prefix,
      role: row.role,
      joined_at: new Date(row.joined_at),
    }));
  } catch (err) {
    console.error("プレイヤーのコミュニティ取得エラー:", err);
    return [];
  }
}
