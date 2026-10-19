import type { LoaderFunctionArgs } from "@remix-run/node";
import { getAllPostSlugs } from "~/utils/wordpress";
import { getAllWikiPaths } from "~/utils/wikijs.server";

const SITE_URL = "https://mofucraft.net";

// 5分キャッシュ
let cachedSitemap: { xml: string; timestamp: number } | null = null;
const CACHE_DURATION = 1000 * 60 * 5;

// Remixで定義されている静的ルート
const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/news", changefreq: "daily", priority: "0.8" },
  { path: "/staff", changefreq: "monthly", priority: "0.6" },
  { path: "/donators", changefreq: "monthly", priority: "0.5" },
  { path: "/punishments/bans", changefreq: "daily", priority: "0.6" },
  { path: "/miscs/money_ranking", changefreq: "daily", priority: "0.5" },
  { path: "/communities", changefreq: "monthly", priority: "0.5" },
  { path: "/store", changefreq: "monthly", priority: "0.5" },
  { path: "/weapons", changefreq: "monthly", priority: "0.5" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/guide", changefreq: "monthly", priority: "0.7" },
  { path: "/map", changefreq: "monthly", priority: "0.6" },
];

// $slug.tsx が処理する Wiki.js ページから除外するパス末尾セグメント
// (静的ルートと重複するもの)
const EXCLUDED_PATH_SEGMENTS = new Set([
  "news", "punishments", "players", "staff", "donators",
  "miscs", "weapons", "communities", "store", "map", "about", "guide",
]);

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toW3CDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString();
}

async function generateSitemap(): Promise<string> {
  const [wikiPaths, wpPosts] = await Promise.all([
    getAllWikiPaths().catch(() => []),
    getAllPostSlugs().catch(() => []),
  ]);

  let urls = "";

  // 静的ルート
  for (const route of STATIC_ROUTES) {
    urls += `  <url>
    <loc>${escapeXml(SITE_URL + route.path)}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>\n`;
  }

  // Wiki.js ページ ($slug.tsx で表示されるもの)
  for (const page of wikiPaths) {
    const lastSegment = page.path.split("/").pop() ?? "";
    if (EXCLUDED_PATH_SEGMENTS.has(lastSegment)) continue;
    urls += `  <url>
    <loc>${escapeXml(SITE_URL + "/" + page.path)}</loc>
    <lastmod>${toW3CDate(page.updatedAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>\n`;
  }

  // WordPress 投稿 (news/$newsId で表示されるもの)
  for (const post of wpPosts) {
    urls += `  <url>
    <loc>${escapeXml(SITE_URL + "/news/" + post.id)}</loc>
    <lastmod>${toW3CDate(post.modified)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}</urlset>`;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const now = Date.now();

  if (cachedSitemap && now - cachedSitemap.timestamp < CACHE_DURATION) {
    return new Response(cachedSitemap.xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  }

  const xml = await generateSitemap();
  cachedSitemap = { xml, timestamp: now };

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
