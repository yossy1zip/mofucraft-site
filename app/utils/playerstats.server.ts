const PLAYERSTATS_API_URL = process.env.PLAYERSTATS_API_URL || "http://localhost:8080";

export type StatRankingEntry = {
  position: number;
  uuid: string;
  name: string;
  online: boolean;
  value: number;
  stat: string;
};

export type StatCategory = "minecraft:custom" | "minecraft:mined" | "minecraft:killed" | "minecraft:killed_by" | "minecraft:used" | "minecraft:crafted";

const cache = new Map<string, { data: StatRankingEntry[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function fetchStatRanking(
  section: StatCategory,
  statKey: string,
  limit = 30
): Promise<StatRankingEntry[]> {
  const cacheKey = `${section}/${statKey}/${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const url = `${PLAYERSTATS_API_URL}/moss/top/${encodeURIComponent(section)}/${encodeURIComponent(statKey)}?limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    throw new Error(`PlayerStats API error: ${res.status} ${url}`);
  }

  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = Array.isArray(json) ? json : (json.data ?? json.players ?? []);
  const data: StatRankingEntry[] = raw.map((entry) => ({
    position: entry.position ?? entry.rank ?? 0,
    uuid: entry.uuid,
    name: entry.name,
    online: entry.online,
    value: entry.value,
    stat: entry.stat ?? entry.stat_key ?? "",
  }));

  cache.set(cacheKey, { data, ts: Date.now() });
  return data;
}
