/**
 * シンプルなインメモリレート制限
 * 本番環境ではRedisなどを使用することを推奨
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// インメモリストレージ（サーバー再起動でリセットされる）
const rateLimitStore = new Map<string, RateLimitEntry>();

// 古いエントリを定期的にクリーンアップ
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // 1分ごと

interface RateLimitOptions {
  /** 許可するリクエスト数 */
  limit: number;
  /** ウィンドウ期間（ミリ秒） */
  windowMs: number;
}

interface RateLimitResult {
  /** リクエストが許可されたか */
  success: boolean;
  /** 残りのリクエスト数 */
  remaining: number;
  /** リセットまでの秒数 */
  resetIn: number;
}

/**
 * レート制限をチェック
 * @param key 識別キー（IPアドレスなど）
 * @param options レート制限オプション
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // 既存エントリがない、またはリセット時間を過ぎている場合
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return {
      success: true,
      remaining: options.limit - 1,
      resetIn: Math.ceil(options.windowMs / 1000),
    };
  }

  // リミットを超えている場合
  if (entry.count >= options.limit) {
    return {
      success: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  // カウントを増やす
  entry.count++;
  return {
    success: true,
    remaining: options.limit - entry.count,
    resetIn: Math.ceil((entry.resetAt - now) / 1000),
  };
}

/**
 * チェックアウトAPI用のレート制限
 * 1分間に5回まで
 */
export function checkCheckoutRateLimit(ipAddress: string): RateLimitResult {
  return checkRateLimit(`checkout:${ipAddress}`, {
    limit: 5,
    windowMs: 60 * 1000, // 1分
  });
}

/**
 * クライアントIPアドレスを取得する
 *
 * 注意: CF-Connecting-IP / X-Forwarded-For / X-Real-IP はいずれも
 * リバースプロキシ（Cloudflare/nginx等）を経由しない直接リクエストでは
 * クライアントが任意の値に偽装できるヘッダーであり、これ単体を鍵にした
 * レート制限はプロキシを信頼できる場合にのみ有効。
 * そのため各エンドポイントでは IP 単位の制限に加えて
 * checkGlobalRateLimit によるエンドポイント全体の上限も併用すること。
 */
export function getClientIp(request: Request): string {
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // フォールバック（開発環境用）
  return "127.0.0.1";
}

/**
 * IPスプーフィングでIP単位のレート制限が回避された場合の保険として、
 * エンドポイント全体（全クライアント合算）でのリクエスト数を制限する。
 */
export function checkGlobalRateLimit(
  endpoint: string,
  options: RateLimitOptions
): RateLimitResult {
  return checkRateLimit(`global:${endpoint}`, options);
}
