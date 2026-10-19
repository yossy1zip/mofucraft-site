import { pool } from "./db.server";

interface StaffRoleData {
  uuid: string;
  username: string | null;
  staff_role: string | null;
  is_staff: boolean;
}

export async function getAllStaffMembers(): Promise<StaffRoleData[]> {
  try {
    const [rows] = await pool.execute(
      `SELECT DISTINCT 
        p.uuid, 
        COALESCE(h.name, p.username) as username,
        CASE 
          WHEN p.primary_group IN ('helper', 'staff', 'admin', 'owner') THEN p.primary_group
          WHEN up.permission = 'group.owner' AND up.value = 1 THEN 'owner'
          WHEN up.permission = 'group.admin' AND up.value = 1 THEN 'admin'
          WHEN up.permission = 'group.staff' AND up.value = 1 THEN 'staff'
          WHEN up.permission = 'group.helper' AND up.value = 1 THEN 'helper'
          ELSE NULL
        END as staff_role,
        CASE 
          WHEN p.primary_group IN ('helper', 'staff', 'admin', 'owner') THEN TRUE
          WHEN up.permission IN ('group.helper', 'group.staff', 'group.admin', 'group.owner') 
               AND up.value = 1 
               AND (up.expiry = 0 OR up.expiry > UNIX_TIMESTAMP()) THEN TRUE
          ELSE FALSE
        END as is_staff
       FROM luckperms_players p
       LEFT JOIN luckperms_user_permissions up ON p.uuid = up.uuid 
         AND up.permission IN ('group.helper', 'group.staff', 'group.admin', 'group.owner')
         AND up.value = 1
         AND (up.expiry = 0 OR up.expiry > UNIX_TIMESTAMP())
       LEFT JOIN (
         SELECT uuid, name,
                ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
         FROM litebans_history
       ) h ON p.uuid = h.uuid AND h.rn = 1
       WHERE p.primary_group IN ('helper', 'staff', 'admin', 'owner')
         OR (up.permission IN ('group.helper', 'group.staff', 'group.admin', 'group.owner') 
             AND up.value = 1 
             AND (up.expiry = 0 OR up.expiry > UNIX_TIMESTAMP()))
       ORDER BY 
         CASE 
           WHEN p.primary_group = 'owner' OR up.permission = 'group.owner' THEN 1
           WHEN p.primary_group = 'admin' OR up.permission = 'group.admin' THEN 2  
           WHEN p.primary_group = 'staff' OR up.permission = 'group.staff' THEN 3
           WHEN p.primary_group = 'helper' OR up.permission = 'group.helper' THEN 4
           ELSE 5
         END,
         COALESCE(h.name, p.username) ASC`
    );
    
    const result = rows as StaffRoleData[];
    return result.filter(row => row.staff_role !== null);
  } catch (error) {
    console.error('Error fetching all staff members:', error);
    return [];
  }
}

interface SupporterData {
  uuid: string;
  username: string | null;
}

export async function getAllSupporterMembers(): Promise<SupporterData[]> {
  try {
    const [rows] = await pool.execute(
      `SELECT DISTINCT
        p.uuid,
        COALESCE(h.name, p.username) as username
       FROM luckperms_players p
       LEFT JOIN luckperms_user_permissions up ON p.uuid = up.uuid
         AND up.permission = 'group.supporter'
         AND up.value = 1
         AND (up.expiry = 0 OR up.expiry > UNIX_TIMESTAMP())
       LEFT JOIN (
         SELECT uuid, name,
                ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
         FROM litebans_history
       ) h ON p.uuid = h.uuid AND h.rn = 1
       WHERE p.primary_group = 'supporter'
          OR (up.permission = 'group.supporter'
              AND up.value = 1
              AND (up.expiry = 0 OR up.expiry > UNIX_TIMESTAMP()))
       ORDER BY COALESCE(h.name, p.username) ASC`
    );

    return rows as SupporterData[];
  } catch (error) {
    console.error('Error fetching supporter members:', error);
    return [];
  }
}

interface DonorRoleData {
  uuid: string;
  username: string | null;
  donor_role: string | null;
  is_donor: boolean;
}

export async function getAllDonorMembers(): Promise<DonorRoleData[]> {
  try {
    console.log('=== Implementing Donor Detection with luckperms_user_permissions ===');
    
    // Now we know:
    // 1. Donor groups are: iron, gold, diamond
    // 2. They're stored in luckperms_user_permissions as group.iron, group.gold, group.diamond
    
    const [rows] = await pool.execute(
      `SELECT DISTINCT 
        p.uuid, 
        COALESCE(h.name, p.username) as username,
        CASE 
          WHEN up.permission = 'group.diamond' AND up.value = 1 THEN 'diamond'
          WHEN up.permission = 'group.gold' AND up.value = 1 THEN 'gold'
          WHEN up.permission = 'group.iron' AND up.value = 1 THEN 'iron'
          ELSE NULL
        END as donor_role,
        CASE 
          WHEN up.permission IN ('group.iron', 'group.gold', 'group.diamond') 
               AND up.value = 1 
               AND (up.expiry = 0 OR up.expiry > UNIX_TIMESTAMP()) THEN TRUE
          ELSE FALSE
        END as is_donor
       FROM luckperms_players p
       INNER JOIN luckperms_user_permissions up ON p.uuid = up.uuid 
         AND up.permission IN ('group.iron', 'group.gold', 'group.diamond')
         AND up.value = 1
         AND (up.expiry = 0 OR up.expiry > UNIX_TIMESTAMP())
       LEFT JOIN (
         SELECT uuid, name,
                ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
         FROM litebans_history
       ) h ON p.uuid = h.uuid AND h.rn = 1
       ORDER BY 
         CASE 
           WHEN up.permission = 'group.diamond' THEN 1
           WHEN up.permission = 'group.gold' THEN 2  
           WHEN up.permission = 'group.iron' THEN 3
           ELSE 4
         END,
         COALESCE(h.name, p.username) ASC`
    );
    
    const result = rows as DonorRoleData[];
    console.log(`Found ${result.length} donor members`);
    return result.filter(row => row.donor_role !== null);
  } catch (error) {
    console.error('Error fetching all donor members:', error);
    return [];
  }
}

export async function getDonorRoleByUuid(playerUuid: string): Promise<DonorRoleData | null> {
  try {
    const [rows] = await pool.execute(
      `SELECT DISTINCT 
        p.uuid, 
        COALESCE(h.name, p.username) as username,
        CASE 
          WHEN up.permission = 'group.diamond' AND up.value = 1 THEN 'diamond'
          WHEN up.permission = 'group.gold' AND up.value = 1 THEN 'gold'
          WHEN up.permission = 'group.iron' AND up.value = 1 THEN 'iron'
          ELSE NULL
        END as donor_role,
        CASE 
          WHEN up.permission IN ('group.iron', 'group.gold', 'group.diamond') 
               AND up.value = 1 
               AND (up.expiry = 0 OR up.expiry > UNIX_TIMESTAMP()) THEN TRUE
          ELSE FALSE
        END as is_donor
       FROM luckperms_players p
       LEFT JOIN luckperms_user_permissions up ON p.uuid = up.uuid 
         AND up.permission IN ('group.iron', 'group.gold', 'group.diamond')
         AND up.value = 1
         AND (up.expiry = 0 OR up.expiry > UNIX_TIMESTAMP())
       LEFT JOIN (
         SELECT uuid, name,
                ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
         FROM litebans_history
       ) h ON p.uuid = h.uuid AND h.rn = 1
       WHERE p.uuid = ?
       ORDER BY 
         CASE 
           WHEN up.permission = 'group.diamond' THEN 1
           WHEN up.permission = 'group.gold' THEN 2  
           WHEN up.permission = 'group.iron' THEN 3
           ELSE 4
         END
       LIMIT 1`,
      [playerUuid]
    );
    
    const result = rows as DonorRoleData[];
    if (result.length > 0 && result[0].donor_role !== null) {
      return result[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching LuckPerms donor role:', error);
    return null;
  }
}

export async function getStaffRoleByUuid(playerUuid: string): Promise<StaffRoleData | null> {
  try {
    const [rows] = await pool.execute(
      `SELECT DISTINCT 
        p.uuid, 
        COALESCE(h.name, p.username) as username,
        CASE 
          WHEN p.primary_group IN ('helper', 'staff', 'admin', 'owner') THEN p.primary_group
          WHEN up.permission = 'group.owner' AND up.value = 1 THEN 'owner'
          WHEN up.permission = 'group.admin' AND up.value = 1 THEN 'admin'
          WHEN up.permission = 'group.staff' AND up.value = 1 THEN 'staff'
          WHEN up.permission = 'group.helper' AND up.value = 1 THEN 'helper'
          ELSE NULL
        END as staff_role,
        CASE 
          WHEN p.primary_group IN ('helper', 'staff', 'admin', 'owner') THEN TRUE
          WHEN up.permission IN ('group.helper', 'group.staff', 'group.admin', 'group.owner') 
               AND up.value = 1 
               AND (up.expiry = 0 OR up.expiry > UNIX_TIMESTAMP()) THEN TRUE
          ELSE FALSE
        END as is_staff
       FROM luckperms_players p
       LEFT JOIN luckperms_user_permissions up ON p.uuid = up.uuid 
         AND up.permission IN ('group.helper', 'group.staff', 'group.admin', 'group.owner')
         AND up.value = 1
         AND (up.expiry = 0 OR up.expiry > UNIX_TIMESTAMP())
       LEFT JOIN (
         SELECT uuid, name,
                ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
         FROM litebans_history
       ) h ON p.uuid = h.uuid AND h.rn = 1
       WHERE p.uuid = ?
         AND (p.primary_group IN ('helper', 'staff', 'admin', 'owner')
              OR (up.permission IN ('group.helper', 'group.staff', 'group.admin', 'group.owner') 
                  AND up.value = 1 
                  AND (up.expiry = 0 OR up.expiry > UNIX_TIMESTAMP())))
       ORDER BY 
         CASE 
           WHEN p.primary_group = 'owner' OR up.permission = 'group.owner' THEN 1
           WHEN p.primary_group = 'admin' OR up.permission = 'group.admin' THEN 2  
           WHEN p.primary_group = 'staff' OR up.permission = 'group.staff' THEN 3
           WHEN p.primary_group = 'helper' OR up.permission = 'group.helper' THEN 4
           ELSE 5
         END
       LIMIT 1`,
      [playerUuid]
    );
    
    const result = rows as StaffRoleData[];
    if (result.length > 0) {
      return result[0];
    }
    
    // staffロールがない場合は基本情報だけ返す（litebans_historyも含める）
    const [basicRows] = await pool.execute(
      `SELECT p.uuid, COALESCE(h.name, p.username) as username 
       FROM luckperms_players p
       LEFT JOIN (
         SELECT uuid, name,
                ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY date DESC) as rn
         FROM litebans_history
       ) h ON p.uuid = h.uuid AND h.rn = 1
       WHERE p.uuid = ? LIMIT 1`,
      [playerUuid]
    );
    
    const basicResult = basicRows as { uuid: string; username: string | null }[];
    if (basicResult.length > 0) {
      return {
        uuid: basicResult[0].uuid,
        username: basicResult[0].username,
        staff_role: null,
        is_staff: false,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching LuckPerms staff role:', error);
    return null;
  }
}