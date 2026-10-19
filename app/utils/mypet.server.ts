import { pool } from "./db.server";
import { MyPetPlayer, MyPetPet, MyPetData } from "./mypet.types";

export async function getMyPetDataByUuid(playerUuid: string): Promise<MyPetData> {
  try {
    // Get player data by mojang_uuid
    const [playerRows] = await pool.execute(
      'SELECT * FROM mypetplayers WHERE mojang_uuid = ?',
      [playerUuid]
    );
    
    const player = (playerRows as MyPetPlayer[])[0] || null;
    
    // If no player data found, return empty result
    if (!player) {
      return {
        player: null,
        pets: [],
        mostRecentPet: null,
      };
    }
    
    // Get pets data using internal_uuid as owner_uuid
    const [petsRows] = await pool.execute(
      `SELECT 
        uuid,
        owner_uuid,
        CAST(name AS CHAR CHARACTER SET utf8mb4) as name,
        type,
        exp,
        health,
        hunger,
        respawn_time,
        world_group,
        wants_to_spawn,
        skilltree,
        last_used,
        last_update
       FROM mypetpets 
       WHERE owner_uuid = ? 
       ORDER BY last_used DESC`,
      [player.internal_uuid]
    );
    
    const pets = petsRows as MyPetPet[];
    
    // Get most recent pet (highest last_used value)
    const mostRecentPet = pets.length > 0 ? pets[0] : null;
    
    return {
      player,
      pets,
      mostRecentPet,
    };
  } catch (error) {
    console.error('Error fetching MyPet data:', error);
    return {
      player: null,
      pets: [],
      mostRecentPet: null,
    };
  }
}

