import { queryFull } from "minecraft-server-util";

export type McServerStatus = {
  online: boolean;
  players: number;
  maxPlayers: number;
  version: string;
  motd: string;
};

export async function getMcServerStatus(): Promise<McServerStatus> {
  try {
    const result = await queryFull(process.env.MC_QUERY_HOST || "localhost", 25565, { timeout: 1000 });
    return {
      online: true,
      players: result.players.online,
      maxPlayers: result.players.max,
      motd: result.motd.clean,
      version: (result.version as any)?.name || "Unknown",
    };
  } catch {
    return {
      online: false,
      players: 0,
      maxPlayers: 0,
      motd: "",
      version: ""
    };
  }
}
