import { findClosestWikiPath, getAllWikiPaths } from "~/utils/wikijs.server";

// 手動マッピング（優先度最高）
const REDIRECT_MAP: Record<string, string> = {
  'ban': '/punishments/bans',
  'bans': '/punishments/bans',
  // 今後追加可能
};

// 静的ルートのスラッグ一覧
const STATIC_SLUGS = [
  'news', 'staff', 'donators', 'weapons', 'communities',
  'store', 'map', 'about', 'guide', 'punishments'
];

/**
 * Prefix/Suffixマッチングで類似スラッグを検索
 */
function findPrefixSuffixMatch(attemptedSlug: string, validSlugs: string[]): string | null {
  const lowerAttempted = attemptedSlug.toLowerCase();

  const candidates = validSlugs.filter(slug => {
    const lowerSlug = slug.toLowerCase();
    if (lowerSlug === lowerAttempted) return false;
    if (lowerSlug.startsWith(lowerAttempted) && lowerAttempted.length >= 3) return true;
    if (lowerAttempted.startsWith(lowerSlug) && lowerSlug.length >= 3) return true;
    return false;
  });

  // 候補が1つだけの場合のみ返す（曖昧さ回避）
  if (candidates.length === 1) {
    return candidates[0];
  }

  return null;
}

/**
 * 類似スラッグを検索してリダイレクト先を返す
 */
export async function findClosestSlug(attemptedSlug: string): Promise<string | null> {
  // 1. 手動マッピングをチェック（最優先）
  const manualRedirect = REDIRECT_MAP[attemptedSlug.toLowerCase()];
  if (manualRedirect) {
    return manualRedirect;
  }

  // 2. 静的ルートでprefix/suffixマッチ
  const staticMatch = findPrefixSuffixMatch(attemptedSlug, STATIC_SLUGS);
  if (staticMatch) {
    return `/${staticMatch}`;
  }

  // 3. Wiki.js path から末尾セグメント完全一致 / prefix-suffix マッチ
  const wikiMatch = await findClosestWikiPath(attemptedSlug);
  if (wikiMatch) {
    return wikiMatch;
  }

  // 4. Wiki.js path 全体に対しても prefix/suffix を試す（path 内の階層を含めて見る）
  try {
    const paths = await getAllWikiPaths();
    const wholePathMatch = findPrefixSuffixMatch(attemptedSlug, paths.map((p) => p.path));
    if (wholePathMatch) return `/${wholePathMatch}`;
  } catch (error) {
    console.error("Failed to fetch Wiki.js paths for slug matching:", error);
  }

  return null;
}
