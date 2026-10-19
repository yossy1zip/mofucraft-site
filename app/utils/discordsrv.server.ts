import { poolMain } from './db.server';

export async function fetchDiscordAccountByUuid(playerUuid: string) {
  try {
    const query = `
      SELECT 
        uuid,
        discord
      FROM discordsrv_accounts
      WHERE uuid = ?
    `;
    
    const [rows] = await poolMain.execute(query, [playerUuid]) as any;
    
    if (rows.length === 0) {
      return null;
    }
    
    // If the row exists with a discord ID, the account is linked
    return {
      uuid: rows[0].uuid,
      discordId: rows[0].discord,
      isLinked: true // Presence in the table means it's linked
    };
  } catch (error) {
    console.error('Discord account fetch error:', error);
    return null;
  }
}