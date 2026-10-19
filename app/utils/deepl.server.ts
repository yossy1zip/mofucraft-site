import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupportedLangCode } from "./translation-languages";

// ファイルベースのキャッシュでビルド/再起動後もキャッシュが保持される
const CACHE_DIR = path.join(process.cwd(), ".cache", "deepl");
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7日間

// キャッシュディレクトリを作成
try {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
} catch {
  // ignore
}

const DEEPL_AUTH_KEY = process.env.DEEPL_AUTH_KEY;
const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";

// インメモリキャッシュ（ファイルI/O削減用、ファイルキャッシュのフロントに配置）
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

function cacheKey(text: string, targetLang: string): string {
  const hash = crypto.createHash("md5").update(text).digest("hex");
  return `deepl_${targetLang}_${hash}`;
}

function cacheFilePath(key: string): string {
  // サブディレクトリ分割（ファイル数が多くなっても性能を保つ）
  const subdir = key.slice(6, 8); // hash先頭2文字
  return path.join(CACHE_DIR, subdir, `${key}.json`);
}

function getCached(key: string): string | undefined {
  const now = Date.now();

  // 1. インメモリキャッシュ
  const mem = memoryCache.get(key);
  if (mem && mem.expiresAt > now) {
    return mem.value;
  }

  // 2. ファイルキャッシュ
  const filePath = cacheFilePath(key);
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as { value: string; expiresAt: number };
    if (data.expiresAt > now) {
      // インメモリにも載せる
      memoryCache.set(key, data);
      return data.value;
    }
    // 期限切れファイルは削除
    fs.unlinkSync(filePath);
  } catch {
    // ファイルが存在しないなど
  }

  return undefined;
}

function setCached(key: string, value: string): void {
  const expiresAt = Date.now() + CACHE_TTL_MS;
  const data = { value, expiresAt };

  // インメモリ
  memoryCache.set(key, data);

  // ファイル
  const filePath = cacheFilePath(key);
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data), "utf-8");
  } catch {
    // ファイル書き込み失敗は無視（インメモリキャッシュは有効）
  }
}

export interface TranslateResult {
  translations: string[];
  fromCache: number;
  fromApi: number;
  charCount: number;
}

export async function translateTexts(
  texts: string[],
  targetLang: SupportedLangCode
): Promise<TranslateResult> {
  if (!DEEPL_AUTH_KEY) {
    throw new Error("翻訳機能は準備中です");
  }

  const results: string[] = new Array(texts.length);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];
  let fromCache = 0;

  // キャッシュチェック
  for (let i = 0; i < texts.length; i++) {
    const key = cacheKey(texts[i], targetLang);
    const cached = getCached(key);
    if (cached !== undefined) {
      results[i] = cached;
      fromCache++;
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(texts[i]);
    }
  }

  // キャッシュミス分をDeepL APIでバッチ翻訳
  let charCount = 0;
  if (uncachedTexts.length > 0) {
    charCount = uncachedTexts.reduce((sum, t) => sum + t.length, 0);

    const BATCH_SIZE = 50;
    for (let batchStart = 0; batchStart < uncachedTexts.length; batchStart += BATCH_SIZE) {
      const batchTexts = uncachedTexts.slice(batchStart, batchStart + BATCH_SIZE);
      const batchIndicesSlice = uncachedIndices.slice(batchStart, batchStart + BATCH_SIZE);

      const response = await fetch(DEEPL_API_URL, {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${DEEPL_AUTH_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: batchTexts,
          source_lang: "JA",
          target_lang: targetLang,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`DeepL API error ${response.status}: ${errorBody}`);
      }

      const data = await response.json();

      for (let j = 0; j < data.translations.length; j++) {
        const translatedText = data.translations[j].text;
        const originalIndex = batchIndicesSlice[j];
        results[originalIndex] = translatedText;

        const key = cacheKey(texts[originalIndex], targetLang);
        setCached(key, translatedText);
      }
    }
  }

  return {
    translations: results,
    fromCache,
    fromApi: uncachedTexts.length,
    charCount,
  };
}
