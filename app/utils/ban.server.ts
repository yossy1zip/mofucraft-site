import { pool } from "./db.server";

// MySQL の BIT(1) カラムは UNION クエリ内で型強制が発生し、
// Buffer ではなく数値 (0/1) として返される場合がある
function readBit(val: unknown): boolean {
  if (val == null) return false;
  if (Buffer.isBuffer(val)) return val[0] === 1;
  return val === 1 || val === true;
}

export async function fetchLatestBans(limit = 30) {
  try {
    const [rows]: any[] = await pool.query(
      `SELECT 
        b.*,
        h.name
      FROM litebans_bans b
      LEFT JOIN (
        SELECT uuid, name,
               ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
        FROM litebans_history
      ) h ON b.uuid = h.uuid AND h.rn = 1
      ORDER BY b.time DESC 
      LIMIT ?`,
      [limit]
    );

    return rows.map((row: any) => ({
      id: row.id,
      uuid: row.uuid,
      name: row.name,
      reason: row.reason,
      banned_by: row.banned_by_name,
      banned_by_uuid: row.banned_by_uuid,
      banned_at: row.time,
      expires_at: row.until,
      ipban: readBit(row.ipban),
      active: readBit(row.active),
      server_scope: row.server_scope,
      removed_by_uuid: row.removed_by_uuid,
      removed_by_name: row.removed_by_name,
      removed_by_date: row.removed_by_date,
      removed_by_reason: row.removed_by_reason,
      type: 'ban'
    }));
  } catch (err) {
    console.error("MySQLクエリエラー:", err);
    throw err; // Remix側にも伝える
  }
}

export async function fetchLatestKicks(limit = 30) {
  try {
    const [rows]: any[] = await pool.query(
      `SELECT 
        k.*,
        h.name
      FROM litebans_kicks k
      LEFT JOIN (
        SELECT uuid, name,
               ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
        FROM litebans_history
      ) h ON k.uuid = h.uuid AND h.rn = 1
      ORDER BY k.time DESC 
      LIMIT ?`,
      [limit]
    );

    return rows.map((row: any) => ({
      id: row.id,
      uuid: row.uuid,
      name: row.name,
      reason: row.reason,
      kicked_by: row.banned_by_name,
      kicked_by_uuid: row.banned_by_uuid,
      kicked_at: row.time,
      server_scope: row.server_scope,
      type: 'kick'
    }));
  } catch (err) {
    console.error("MySQLクエリエラー:", err);
    throw err;
  }
}

export async function fetchLatestWarns(limit = 30) {
  try {
    const [rows]: any[] = await pool.query(
      `SELECT 
        w.*,
        h.name
      FROM litebans_warnings w
      LEFT JOIN (
        SELECT uuid, name,
               ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
        FROM litebans_history
      ) h ON w.uuid = h.uuid AND h.rn = 1
      ORDER BY w.time DESC 
      LIMIT ?`,
      [limit]
    );

    return rows.map((row: any) => ({
      id: row.id,
      uuid: row.uuid,
      name: row.name,
      reason: row.reason,
      warned_by: row.banned_by_name,
      warned_by_uuid: row.banned_by_uuid,
      warned_at: row.time,
      until: row.until,
      active: row.active[0] === 1,
      server_scope: row.server_scope,
      removed_by_uuid: row.removed_by_uuid,
      removed_by_name: row.removed_by_name,
      removed_by_date: row.removed_by_date,
      removed_by_reason: row.removed_by_reason,
      type: 'warn'
    }));
  } catch (err) {
    console.error("MySQLクエリエラー:", err);
    throw err;
  }
}

export async function fetchAllPunishments(page = 1, limit = 30, type = 'all') {
  try {
    const offset = (page - 1) * limit;
    
    let query;
    let params;
    
    if (type === 'all') {
      // 全ての処罰タイプを取得
      query = `(
        SELECT 
          b.id,
          b.uuid,
          h.name,
          b.reason,
          b.banned_by_name as executor_name,
          b.banned_by_uuid as executor_uuid,
          b.time as punishment_time,
          b.until as expires_at,
          b.ipban,
          b.active,
          b.server_scope,
          b.removed_by_uuid,
          b.removed_by_name,
          b.removed_by_date,
          b.removed_by_reason,
          'ban' as type
        FROM litebans_bans b
        LEFT JOIN (
          SELECT uuid, name,
                 ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
          FROM litebans_history
        ) h ON b.uuid = h.uuid AND h.rn = 1
      )
      UNION ALL
      (
        SELECT 
          k.id,
          k.uuid,
          h.name,
          k.reason,
          k.banned_by_name as executor_name,
          k.banned_by_uuid as executor_uuid,
          k.time as punishment_time,
          NULL as expires_at,
          NULL as ipban,
          NULL as active,
          k.server_scope,
          NULL as removed_by_uuid,
          NULL as removed_by_name,
          NULL as removed_by_date,
          NULL as removed_by_reason,
          'kick' as type
        FROM litebans_kicks k
        LEFT JOIN (
          SELECT uuid, name,
                 ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
          FROM litebans_history
        ) h ON k.uuid = h.uuid AND h.rn = 1
      )
      UNION ALL
      (
        SELECT 
          w.id,
          w.uuid,
          h.name,
          w.reason,
          w.banned_by_name as executor_name,
          w.banned_by_uuid as executor_uuid,
          w.time as punishment_time,
          w.until as expires_at,
          NULL as ipban,
          w.active,
          w.server_scope,
          w.removed_by_uuid,
          w.removed_by_name,
          w.removed_by_date,
          w.removed_by_reason,
          'warn' as type
        FROM litebans_warnings w
        LEFT JOIN (
          SELECT uuid, name,
                 ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
          FROM litebans_history
        ) h ON w.uuid = h.uuid AND h.rn = 1
      )
      ORDER BY punishment_time DESC
      LIMIT ? OFFSET ?`;
      params = [limit, offset];
    } else if (type === 'ban') {
      // BANのみ取得
      query = `SELECT 
        b.id,
        b.uuid,
        h.name,
        b.reason,
        b.banned_by_name as executor_name,
        b.banned_by_uuid as executor_uuid,
        b.time as punishment_time,
        b.until as expires_at,
        b.ipban,
        b.active,
        b.server_scope,
        b.removed_by_uuid,
        b.removed_by_name,
        b.removed_by_date,
        b.removed_by_reason,
        'ban' as type
      FROM litebans_bans b
      LEFT JOIN (
        SELECT uuid, name,
               ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
        FROM litebans_history
      ) h ON b.uuid = h.uuid AND h.rn = 1
      ORDER BY b.time DESC
      LIMIT ? OFFSET ?`;
      params = [limit, offset];
    } else if (type === 'kick') {
      // KICKのみ取得
      query = `SELECT 
        k.id,
        k.uuid,
        h.name,
        k.reason,
        k.banned_by_name as executor_name,
        k.banned_by_uuid as executor_uuid,
        k.time as punishment_time,
        NULL as expires_at,
        NULL as ipban,
        NULL as active,
        k.server_scope,
        NULL as removed_by_uuid,
        NULL as removed_by_name,
        NULL as removed_by_date,
        NULL as removed_by_reason,
        'kick' as type
      FROM litebans_kicks k
      LEFT JOIN (
        SELECT uuid, name,
               ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
        FROM litebans_history
      ) h ON k.uuid = h.uuid AND h.rn = 1
      ORDER BY k.time DESC
      LIMIT ? OFFSET ?`;
      params = [limit, offset];
    } else if (type === 'warn') {
      // 警告のみ取得
      query = `SELECT 
        w.id,
        w.uuid,
        h.name,
        w.reason,
        w.banned_by_name as executor_name,
        w.banned_by_uuid as executor_uuid,
        w.time as punishment_time,
        w.until as expires_at,
        NULL as ipban,
        w.active,
        w.server_scope,
        w.removed_by_uuid,
        w.removed_by_name,
        w.removed_by_date,
        w.removed_by_reason,
        'warn' as type
      FROM litebans_warnings w
      LEFT JOIN (
        SELECT uuid, name,
               ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
        FROM litebans_history
      ) h ON w.uuid = h.uuid AND h.rn = 1
      ORDER BY w.time DESC
      LIMIT ? OFFSET ?`;
      params = [limit, offset];
    } else {
      throw new Error('Invalid punishment type');
    }
    
    const [rows]: any[] = await pool.query(query, params);

    return rows.map((row: any) => {
      const base = {
        id: row.id,
        uuid: row.uuid,
        name: row.name,
        reason: row.reason,
        server_scope: row.server_scope,
        type: row.type
      };

      if (row.type === 'ban') {
        return {
          ...base,
          banned_by: row.executor_name,
          banned_by_uuid: row.executor_uuid,
          banned_at: row.punishment_time,
          expires_at: row.expires_at,
          ipban: readBit(row.ipban),
          active: readBit(row.active),
          removed_by_uuid: row.removed_by_uuid,
          removed_by_name: row.removed_by_name,
          removed_by_date: row.removed_by_date,
          removed_by_reason: row.removed_by_reason
        };
      } else if (row.type === 'kick') {
        return {
          ...base,
          kicked_by: row.executor_name,
          kicked_by_uuid: row.executor_uuid,
          kicked_at: row.punishment_time
        };
      } else if (row.type === 'warn') {
        return {
          ...base,
          warned_by: row.executor_name,
          warned_by_uuid: row.executor_uuid,
          warned_at: row.punishment_time,
          until: row.expires_at,
          active: readBit(row.active),
          removed_by_uuid: row.removed_by_uuid,
          removed_by_name: row.removed_by_name,
          removed_by_date: row.removed_by_date,
          removed_by_reason: row.removed_by_reason
        };
      }

      return base;
    });
  } catch (err) {
    console.error("MySQLクエリエラー:", err);
    throw err;
  }
}

export async function countAllPunishments(type = 'all') {
  try {
    if (type === 'all') {
      const [rows]: any[] = await pool.query(
        `SELECT 
          (SELECT COUNT(*) FROM litebans_bans) as ban_count,
          (SELECT COUNT(*) FROM litebans_kicks) as kick_count,
          (SELECT COUNT(*) FROM litebans_warnings) as warn_count,
          ((SELECT COUNT(*) FROM litebans_bans) + 
           (SELECT COUNT(*) FROM litebans_kicks) + 
           (SELECT COUNT(*) FROM litebans_warnings)) as total_count`
      );
      
      return {
        ban: rows[0].ban_count,
        kick: rows[0].kick_count,
        warn: rows[0].warn_count,
        total: rows[0].total_count
      };
    } else if (type === 'ban') {
      const [rows]: any[] = await pool.query('SELECT COUNT(*) as count FROM litebans_bans');
      return {
        ban: rows[0].count,
        kick: 0,
        warn: 0,
        total: rows[0].count
      };
    } else if (type === 'kick') {
      const [rows]: any[] = await pool.query('SELECT COUNT(*) as count FROM litebans_kicks');
      return {
        ban: 0,
        kick: rows[0].count,
        warn: 0,
        total: rows[0].count
      };
    } else if (type === 'warn') {
      const [rows]: any[] = await pool.query('SELECT COUNT(*) as count FROM litebans_warnings');
      return {
        ban: 0,
        kick: 0,
        warn: rows[0].count,
        total: rows[0].count
      };
    } else {
      throw new Error('Invalid punishment type');
    }
  } catch (err) {
    console.error("MySQLクエリエラー:", err);
    throw err;
  }
}

export async function findPunishmentById(id: string, type: string) {
  try {
    let table = '';
    switch (type) {
      case 'ban':
        table = 'litebans_bans';
        break;
      case 'kick':
        table = 'litebans_kicks';
        break;
      case 'warn':
        table = 'litebans_warnings';
        break;
      default:
        throw new Error('Invalid punishment type');
    }

    const [rows]: any[] = await pool.query(
      `SELECT 
        p.*,
        h.name
      FROM ${table} p
      LEFT JOIN (
        SELECT uuid, name,
               ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
        FROM litebans_history
      ) h ON p.uuid = h.uuid AND h.rn = 1
      WHERE p.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    const punishment = {
      id: row.id,
      uuid: row.uuid,
      name: row.name,
      reason: row.reason,
      server_scope: row.server_scope,
      type: type
    };

    if (type === 'ban') {
      return {
        ...punishment,
        banned_by: row.banned_by_name,
        banned_by_uuid: row.banned_by_uuid,
        banned_at: row.time,
        expires_at: row.until,
        ipban: readBit(row.ipban),
        active: readBit(row.active),
        removed_by_uuid: row.removed_by_uuid,
        removed_by_name: row.removed_by_name,
        removed_by_date: row.removed_by_date,
        removed_by_reason: row.removed_by_reason
      };
    } else if (type === 'kick') {
      return {
        ...punishment,
        kicked_by: row.banned_by_name,
        kicked_by_uuid: row.banned_by_uuid,
        kicked_at: row.time
      };
    } else if (type === 'warn') {
      return {
        ...punishment,
        warned_by: row.banned_by_name,
        warned_by_uuid: row.banned_by_uuid,
        warned_at: row.time,
        until: row.until,
        active: readBit(row.active),
        removed_by_uuid: row.removed_by_uuid,
        removed_by_name: row.removed_by_name,
        removed_by_date: row.removed_by_date,
        removed_by_reason: row.removed_by_reason
      };
    }

    return punishment;
  } catch (err) {
    console.error("MySQLクエリエラー:", err);
    throw err;
  }
}

export async function checkPlayerActiveBan(playerUuid: string) {
  try {
    const [rows]: any[] = await pool.query(
      `SELECT 
        b.id,
        b.reason,
        b.time as banned_at,
        b.until as expires_at,
        b.banned_by_name,
        b.ipban,
        h.name
      FROM litebans_bans b
      LEFT JOIN (
        SELECT uuid, name,
               ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
        FROM litebans_history
      ) h ON b.uuid = h.uuid AND h.rn = 1
      WHERE b.uuid = ? AND b.active = 1
      ORDER BY b.time DESC
      LIMIT 1`,
      [playerUuid]
    );

    if (rows.length === 0) {
      return null;
    }

    const ban = rows[0];
    return {
      id: ban.id,
      name: ban.name,
      reason: ban.reason,
      banned_at: ban.banned_at,
      expires_at: ban.expires_at,
      banned_by: ban.banned_by_name,
      ipban: !!(ban.ipban && ban.ipban[0] === 1)
    };
  } catch (err) {
    console.error("MySQLクエリエラー:", err);
    throw err;
  }
}

export async function fetchPunishmentsByPlayer(playerUuid: string, page = 1, limit = 30, type = 'all') {
  try {
    const offset = (page - 1) * limit;
    
    let query;
    let params;
    
    if (type === 'all') {
      // プレイヤーの全ての処罰を取得
      query = `(
        SELECT 
          b.id,
          b.uuid,
          h.name,
          b.reason,
          b.banned_by_name as executor_name,
          b.banned_by_uuid as executor_uuid,
          b.time as punishment_time,
          b.until as expires_at,
          b.ipban,
          b.active,
          b.server_scope,
          b.removed_by_uuid,
          b.removed_by_name,
          b.removed_by_date,
          b.removed_by_reason,
          'ban' as type
        FROM litebans_bans b
        LEFT JOIN (
          SELECT uuid, name,
                 ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
          FROM litebans_history
        ) h ON b.uuid = h.uuid AND h.rn = 1
        WHERE b.uuid = ?
      )
      UNION ALL
      (
        SELECT 
          k.id,
          k.uuid,
          h.name,
          k.reason,
          k.banned_by_name as executor_name,
          k.banned_by_uuid as executor_uuid,
          k.time as punishment_time,
          NULL as expires_at,
          NULL as ipban,
          NULL as active,
          k.server_scope,
          NULL as removed_by_uuid,
          NULL as removed_by_name,
          NULL as removed_by_date,
          NULL as removed_by_reason,
          'kick' as type
        FROM litebans_kicks k
        LEFT JOIN (
          SELECT uuid, name,
                 ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
          FROM litebans_history
        ) h ON k.uuid = h.uuid AND h.rn = 1
        WHERE k.uuid = ?
      )
      UNION ALL
      (
        SELECT 
          w.id,
          w.uuid,
          h.name,
          w.reason,
          w.banned_by_name as executor_name,
          w.banned_by_uuid as executor_uuid,
          w.time as punishment_time,
          w.until as expires_at,
          NULL as ipban,
          w.active,
          w.server_scope,
          w.removed_by_uuid,
          w.removed_by_name,
          w.removed_by_date,
          w.removed_by_reason,
          'warn' as type
        FROM litebans_warnings w
        LEFT JOIN (
          SELECT uuid, name,
                 ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
          FROM litebans_history
        ) h ON w.uuid = h.uuid AND h.rn = 1
        WHERE w.uuid = ?
      )
      ORDER BY punishment_time DESC
      LIMIT ? OFFSET ?`;
      params = [playerUuid, playerUuid, playerUuid, limit, offset];
    } else if (type === 'ban') {
      query = `SELECT 
        b.id,
        b.uuid,
        h.name,
        b.reason,
        b.banned_by_name as executor_name,
        b.banned_by_uuid as executor_uuid,
        b.time as punishment_time,
        b.until as expires_at,
        b.ipban,
        b.active,
        b.server_scope,
        b.removed_by_uuid,
        b.removed_by_name,
        b.removed_by_date,
        b.removed_by_reason,
        'ban' as type
      FROM litebans_bans b
      LEFT JOIN (
        SELECT uuid, name,
               ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
        FROM litebans_history
      ) h ON b.uuid = h.uuid AND h.rn = 1
      WHERE b.uuid = ?
      ORDER BY b.time DESC
      LIMIT ? OFFSET ?`;
      params = [playerUuid, limit, offset];
    } else if (type === 'kick') {
      query = `SELECT 
        k.id,
        k.uuid,
        h.name,
        k.reason,
        k.banned_by_name as executor_name,
        k.banned_by_uuid as executor_uuid,
        k.time as punishment_time,
        NULL as expires_at,
        NULL as ipban,
        NULL as active,
        k.server_scope,
        NULL as removed_by_uuid,
        NULL as removed_by_name,
        NULL as removed_by_date,
        NULL as removed_by_reason,
        'kick' as type
      FROM litebans_kicks k
      LEFT JOIN (
        SELECT uuid, name,
               ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
        FROM litebans_history
      ) h ON k.uuid = h.uuid AND h.rn = 1
      WHERE k.uuid = ?
      ORDER BY k.time DESC
      LIMIT ? OFFSET ?`;
      params = [playerUuid, limit, offset];
    } else if (type === 'warn') {
      query = `SELECT 
        w.id,
        w.uuid,
        h.name,
        w.reason,
        w.banned_by_name as executor_name,
        w.banned_by_uuid as executor_uuid,
        w.time as punishment_time,
        w.until as expires_at,
        NULL as ipban,
        w.active,
        w.server_scope,
        w.removed_by_uuid,
        w.removed_by_name,
        w.removed_by_date,
        w.removed_by_reason,
        'warn' as type
      FROM litebans_warnings w
      LEFT JOIN (
        SELECT uuid, name,
               ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
        FROM litebans_history
      ) h ON w.uuid = h.uuid AND h.rn = 1
      WHERE w.uuid = ?
      ORDER BY w.time DESC
      LIMIT ? OFFSET ?`;
      params = [playerUuid, limit, offset];
    } else {
      throw new Error('Invalid punishment type');
    }
    
    const [rows]: any[] = await pool.query(query, params);

    return rows.map((row: any) => {
      const base = {
        id: row.id,
        uuid: row.uuid,
        name: row.name,
        reason: row.reason,
        server_scope: row.server_scope,
        type: row.type
      };

      if (row.type === 'ban') {
        return {
          ...base,
          banned_by: row.executor_name,
          banned_by_uuid: row.executor_uuid,
          banned_at: row.punishment_time,
          expires_at: row.expires_at,
          ipban: readBit(row.ipban),
          active: readBit(row.active),
          removed_by_uuid: row.removed_by_uuid,
          removed_by_name: row.removed_by_name,
          removed_by_date: row.removed_by_date,
          removed_by_reason: row.removed_by_reason
        };
      } else if (row.type === 'kick') {
        return {
          ...base,
          kicked_by: row.executor_name,
          kicked_by_uuid: row.executor_uuid,
          kicked_at: row.punishment_time
        };
      } else if (row.type === 'warn') {
        return {
          ...base,
          warned_by: row.executor_name,
          warned_by_uuid: row.executor_uuid,
          warned_at: row.punishment_time,
          until: row.expires_at,
          active: readBit(row.active),
          removed_by_uuid: row.removed_by_uuid,
          removed_by_name: row.removed_by_name,
          removed_by_date: row.removed_by_date,
          removed_by_reason: row.removed_by_reason
        };
      }

      return base;
    });
  } catch (err) {
    console.error("MySQLクエリエラー:", err);
    throw err;
  }
}

export async function countPunishmentsByPlayer(playerUuid: string, type = 'all') {
  try {
    if (type === 'all') {
      const [rows]: any[] = await pool.query(
        `SELECT 
          (SELECT COUNT(*) FROM litebans_bans WHERE uuid = ?) as ban_count,
          (SELECT COUNT(*) FROM litebans_kicks WHERE uuid = ?) as kick_count,
          (SELECT COUNT(*) FROM litebans_warnings WHERE uuid = ?) as warn_count,
          ((SELECT COUNT(*) FROM litebans_bans WHERE uuid = ?) + 
           (SELECT COUNT(*) FROM litebans_kicks WHERE uuid = ?) + 
           (SELECT COUNT(*) FROM litebans_warnings WHERE uuid = ?)) as total_count`,
        [playerUuid, playerUuid, playerUuid, playerUuid, playerUuid, playerUuid]
      );
      
      return {
        ban: rows[0].ban_count,
        kick: rows[0].kick_count,
        warn: rows[0].warn_count,
        total: rows[0].total_count
      };
    } else if (type === 'ban') {
      const [rows]: any[] = await pool.query('SELECT COUNT(*) as count FROM litebans_bans WHERE uuid = ?', [playerUuid]);
      return {
        ban: rows[0].count,
        kick: 0,
        warn: 0,
        total: rows[0].count
      };
    } else if (type === 'kick') {
      const [rows]: any[] = await pool.query('SELECT COUNT(*) as count FROM litebans_kicks WHERE uuid = ?', [playerUuid]);
      return {
        ban: 0,
        kick: rows[0].count,
        warn: 0,
        total: rows[0].count
      };
    } else if (type === 'warn') {
      const [rows]: any[] = await pool.query('SELECT COUNT(*) as count FROM litebans_warnings WHERE uuid = ?', [playerUuid]);
      return {
        ban: 0,
        kick: 0,
        warn: rows[0].count,
        total: rows[0].count
      };
    } else {
      throw new Error('Invalid punishment type');
    }
  } catch (err) {
    console.error("MySQLクエリエラー:", err);
    throw err;
  }
}