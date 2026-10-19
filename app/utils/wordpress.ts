import axios from "axios";

export interface WpCategory {
  id: number;
  name: string;
  slug: string;
}

export interface WpPost {
  id: number;
  title: { rendered: string };
  date: string;
  modified: string;
  slug: string;
  excerpt: { rendered: string };
  content?: { rendered: string };
  author?: number;
  featured_media?: number;
  categories?: number[];
  _embedded?: {
    author?: Array<{
      id: number;
      name: string;
      link: string;
      slug: string;
      avatar_urls?: {
        [key: string]: string;
      };
    }>;
    "wp:featuredmedia"?: Array<{
      id: number;
      source_url: string;
      alt_text: string;
      media_details?: {
        width: number;
        height: number;
        sizes?: {
          [key: string]: {
            source_url: string;
            width: number;
            height: number;
          };
        };
      };
    }>;
    "wp:term"?: Array<Array<WpCategory>>;
  };
}

// Cache configuration for news posts
const NEWS_CACHE_DURATION = 1000 * 60 * 3; // 3 minutes in milliseconds
let cachedNewsPosts: Record<string, WpPost[]> = {};
let newsCacheMeta: Record<string, { totalPages: number; total: number; timestamp: number }> = {};

export async function getNewsPosts(limit = 30, page = 1): Promise<{
  posts: WpPost[];
  totalPages: number;
  total: number;
}> {
  // Check if cache is valid for this limit
  const now = Date.now();
  const cacheKey = `${limit}-${page}`;
  if (
    cachedNewsPosts[cacheKey] &&
    newsCacheMeta[cacheKey] &&
    (now - newsCacheMeta[cacheKey].timestamp < NEWS_CACHE_DURATION)
  ) {
    console.log(`Returning cached news posts (limit: ${limit}, page: ${page})`);
    return {
      posts: cachedNewsPosts[cacheKey],
      totalPages: newsCacheMeta[cacheKey].totalPages,
      total: newsCacheMeta[cacheKey].total,
    };
  }

  console.log(`Fetching fresh news posts from WordPress API (limit: ${limit}, page: ${page})`);
  const url = "https://mofucraft.net/wp-json/wp/v2/posts";
  const res = await axios.get(url, {
    params: {
      per_page: limit,
      page,
      orderby: "date",
      order: "desc",
      _embed: true,
    },
  });

  // Update cache
  const totalPages = Number(res.headers["x-wp-totalpages"]) || 1;
  const total = Number(res.headers["x-wp-total"]) || res.data.length;
  cachedNewsPosts[cacheKey] = res.data;
  newsCacheMeta[cacheKey] = {
    totalPages,
    total,
    timestamp: now,
  };

  return { posts: res.data, totalPages, total };
}

// 新着順で5件取得（全カテゴリ）
export async function getTopNews(limit = 5): Promise<WpPost[]> {
  const { posts } = await getNewsPosts(limit);
  return posts;
}

export async function getNewsPostBySlug(slug: string): Promise<WpPost | null> {
  const url = "https://mofucraft.net/wp-json/wp/v2/posts";
  const res = await axios.get(url, { params: { slug } });
  return res.data[0] || null;
}

export async function getNewsPostById(id: number): Promise<WpPost | null> {
  const url = `https://mofucraft.net/wp-json/wp/v2/posts/${id}`;
  const res = await axios.get(url, {
    params: {
      _embed: true,
    },
  });
  return res.data || null;
}

/**
 * サイトマップ用: 全投稿のIDと更新日を取得
 */
export async function getAllPostSlugs(): Promise<{ id: number; modified: string }[]> {
  const results: { id: number; modified: string }[] = [];
  let page = 1;
  while (true) {
    const res = await axios.get("https://mofucraft.net/wp-json/wp/v2/posts", {
      params: { per_page: 100, page, _fields: "id,modified" },
    });
    for (const p of res.data) {
      results.push({ id: p.id, modified: p.modified });
    }
    const totalPages = Number(res.headers["x-wp-totalpages"]) || 1;
    if (page >= totalPages) break;
    page++;
  }
  return results;
}
