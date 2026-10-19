import type { MenuSection, MenuItem } from "~/types/menu";

const WIKIJS_URL = process.env.WIKIJS_URL || "https://wiki.example.com";
const WIKIJS_API_TOKEN = process.env.WIKIJS_API_TOKEN || "";
const DEFAULT_LOCALE = "ja";

const PAGE_CACHE_DURATION = 1000 * 60; // 1 minute
const NAV_CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
const PATHS_CACHE_DURATION = 1000 * 60 * 5;

export interface WikiPage {
  id: number;
  path: string;
  title: string;
  description: string;
  render: string;
  updatedAt: string;
  createdAt: string;
  isPublished: boolean;
}

export interface WikiNavItem {
  id: string;
  kind: "header" | "link" | "divider";
  label: string;
  icon: string | null;
  // Wiki.js v2 が返す実際の値: "home" | "page" | "external" | null など
  targetType: string | null;
  target: string | null;
}

export interface WikiPathEntry {
  path: string;
  title: string;
  updatedAt: string;
}

const pageCache: Map<string, { value: WikiPage | null; timestamp: number }> = new Map();
let navCache: { value: WikiNavItem[]; timestamp: number } | null = null;
let pathsCache: { value: WikiPathEntry[]; timestamp: number } | null = null;

async function gqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (WIKIJS_API_TOKEN) {
    headers["Authorization"] = `Bearer ${WIKIJS_API_TOKEN}`;
  }

  try {
    const res = await fetch(`${WIKIJS_URL}/graphql`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables: variables ?? {} }),
    });
    if (!res.ok) {
      console.error(`Wiki.js GraphQL HTTP error: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (json.errors && json.errors.length > 0) {
      console.error("Wiki.js GraphQL errors:", json.errors.map((e) => e.message).join("; "));
      return null;
    }
    return json.data ?? null;
  } catch (error) {
    console.error("Wiki.js GraphQL fetch failed:", error);
    return null;
  }
}

export async function getWikiPage(path: string, locale: string = DEFAULT_LOCALE): Promise<WikiPage | null> {
  const normalized = path.replace(/^\/+/, "");
  const cacheKey = `${locale}:${normalized}`;
  const now = Date.now();
  const cached = pageCache.get(cacheKey);
  if (cached && now - cached.timestamp < PAGE_CACHE_DURATION) {
    return cached.value;
  }

  const data = await gqlRequest<{
    pages: { singleByPath: WikiPage | null };
  }>(
    `query GetPage($path: String!, $locale: String!) {
      pages {
        singleByPath(path: $path, locale: $locale) {
          id
          path
          title
          description
          render
          updatedAt
          createdAt
          isPublished
        }
      }
    }`,
    { path: normalized, locale }
  );

  const raw = data?.pages?.singleByPath ?? null;
  const value = raw?.isPublished === false ? null : raw;
  pageCache.set(cacheKey, { value, timestamp: now });
  return value;
}

export async function getWikiNavigation(locale: string = DEFAULT_LOCALE): Promise<WikiNavItem[]> {
  const now = Date.now();
  if (navCache && now - navCache.timestamp < NAV_CACHE_DURATION) {
    return navCache.value;
  }

  const data = await gqlRequest<{
    navigation: { tree: Array<{ locale: string; items: WikiNavItem[] }> };
  }>(
    `query GetNavigation {
      navigation {
        tree {
          locale
          items {
            id
            kind
            label
            icon
            targetType
            target
          }
        }
      }
    }`
  );

  const tree = data?.navigation?.tree ?? [];
  const localized = tree.find((t) => t.locale === locale) ?? tree[0];
  const items = localized?.items ?? [];
  navCache = { value: items, timestamp: now };
  return items;
}

export async function getAllWikiPaths(locale: string = DEFAULT_LOCALE): Promise<WikiPathEntry[]> {
  const now = Date.now();
  if (pathsCache && now - pathsCache.timestamp < PATHS_CACHE_DURATION) {
    return pathsCache.value;
  }

  const data = await gqlRequest<{
    pages: {
      list: Array<{ path: string; title: string; locale: string; isPublished: boolean; updatedAt: string }>;
    };
  }>(
    `query ListPages($locale: String!) {
      pages {
        list(locale: $locale, orderBy: PATH) {
          path
          title
          locale
          isPublished
          updatedAt
        }
      }
    }`,
    { locale }
  );

  const list = data?.pages?.list ?? [];
  const value = list
    .filter((p) => p.isPublished)
    .map((p) => ({ path: p.path, title: p.title ?? "", updatedAt: p.updatedAt }));
  pathsCache = { value, timestamp: now };
  return value;
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-") || "section";
}

// Wiki.js page target は "/ja/faq" のように locale プレフィックス付き。
// $slug.tsx は単一セグメントを expect するので "/faq" に正規化する。
function stripLocalePrefix(targetPath: string): string {
  return targetPath.replace(/^\/?[a-z]{2}\//, "/").replace(/^\/+/, "/");
}

function navItemToMenuItem(item: WikiNavItem): MenuItem | null {
  if (item.kind !== "link") return null;

  let slug = "";
  const targetType = item.targetType ?? "";

  if (targetType === "home") {
    slug = "/";
  } else if (targetType === "page" && item.target) {
    slug = stripLocalePrefix(item.target);
  } else if ((targetType === "external" || targetType === "url") && item.target) {
    slug = item.target;
  } else if (item.target) {
    slug = item.target;
  }

  const isUrlIcon = !!(item.icon && /^https?:\/\//.test(item.icon));
  const image = isUrlIcon ? (item.icon as string) : "";
  const icon = !isUrlIcon && item.icon ? item.icon : "";

  return {
    title: item.label || "",
    slug,
    image,
    icon,
    isFolder: false,
    items: [],
  };
}

// ナビゲーションで非表示にするセクションのラベル（部分一致・小文字）
const HIDDEN_SECTION_LABELS = ["編集者向け", "editor only", "wiki editor"];

export async function getWikiMenuSections(locale: string = DEFAULT_LOCALE): Promise<MenuSection[]> {
  const items = await getWikiNavigation(locale);
  const sections: MenuSection[] = [];
  let current: MenuSection | null = null;
  const usedIds = new Set<string>();
  let skipSection = false;

  for (const item of items) {
    if (item.kind === "header") {
      const labelLower = (item.label || "").toLowerCase();
      skipSection = HIDDEN_SECTION_LABELS.some((s) => labelLower.includes(s));
      if (skipSection) continue;

      let id = slugify(item.label || `section-${sections.length + 1}`);
      let suffix = 1;
      while (usedIds.has(id)) {
        id = `${slugify(item.label || "section")}-${++suffix}`;
      }
      usedIds.add(id);
      current = { id, title: item.label || "", items: [] };
      sections.push(current);
    } else if (item.kind === "link") {
      if (skipSection) continue;
      const menuItem = navItemToMenuItem(item);
      if (!menuItem) continue;
      if (!current) {
        current = { id: "main", title: "メニュー", items: [] };
        usedIds.add("main");
        sections.push(current);
      }
      current.items.push(menuItem);
    }
    // divider: skip
  }

  return sections.filter((s) => s.items.length > 0);
}

export async function findClosestWikiPath(slug: string): Promise<string | null> {
  const lowerSlug = slug.toLowerCase();
  const paths = await getAllWikiPaths();

  // 1) End-segment exact match (e.g. slug "rules" → "main/rules")
  const endMatch = paths.find((p) => p.path.split("/").pop()?.toLowerCase() === lowerSlug);
  if (endMatch) return `/${endMatch.path}`;

  // 2) Prefix/suffix containment with disambiguation
  const candidates = paths.filter((p) => {
    const last = p.path.split("/").pop()?.toLowerCase() ?? "";
    if (last === lowerSlug) return false;
    if (last.length < 3 || lowerSlug.length < 3) return false;
    return last.startsWith(lowerSlug) || lowerSlug.startsWith(last);
  });
  if (candidates.length === 1) return `/${candidates[0].path}`;

  return null;
}
