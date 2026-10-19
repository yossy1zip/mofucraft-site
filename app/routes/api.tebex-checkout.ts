/**
 * Tebex チェックアウト API ルート
 *
 * POST /api/tebex-checkout
 * Body: { username: string, packageId: string }
 *
 * Minecraft ID とパッケージIDを受け取り、
 * Tebex Headless API でチェックアウトURLを生成して返す
 */

import { json, type ActionFunctionArgs } from "@remix-run/node";
import { createCheckoutUrl } from "~/utils/tebex.server";
import { checkCheckoutRateLimit, checkGlobalRateLimit, getClientIp } from "~/utils/rate-limit.server";

// Minecraft ID のバリデーション
function isValidMinecraftUsername(username: string): boolean {
  // Minecraft ID: 3-16文字、英数字とアンダースコアのみ
  const regex = /^[a-zA-Z0-9_]{3,16}$/;
  return regex.test(username);
}

export async function action({ request }: ActionFunctionArgs) {
  // POSTのみ許可
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  // クライアントIPを取得
  const clientIp = getClientIp(request);

  // レート制限チェック（IP単位 + 偽装対策のエンドポイント全体上限）
  const rateLimit = checkCheckoutRateLimit(clientIp);
  const globalRateLimit = checkGlobalRateLimit("tebex-checkout", {
    limit: 100,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.success || !globalRateLimit.success) {
    const resetIn = !rateLimit.success ? rateLimit.resetIn : globalRateLimit.resetIn;
    return json(
      {
        error: `リクエストが多すぎます。${resetIn}秒後に再度お試しください。`,
        errorType: "rate_limit",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(resetIn),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      }
    );
  }

  try {
    const formData = await request.formData();
    const username = formData.get("username");
    const packageId = formData.get("packageId");

    // バリデーション
    if (!username || typeof username !== "string") {
      return json({ error: "Minecraft ID を入力してください" }, { status: 400 });
    }

    if (!isValidMinecraftUsername(username)) {
      return json(
        { error: "Minecraft ID は3-16文字の英数字とアンダースコアのみ使用できます" },
        { status: 400 }
      );
    }

    if (!packageId || typeof packageId !== "string") {
      return json({ error: "パッケージIDが指定されていません" }, { status: 400 });
    }

    // 完了・キャンセル時のリダイレクトURL
    const origin = new URL(request.url).origin;
    const completeUrl = `${origin}/store?purchased=success`;
    const cancelUrl = `${origin}/store?purchased=cancelled`;

    try {
      // チェックアウトURLを生成
      const checkoutUrl = await createCheckoutUrl(
        username,
        packageId,
        clientIp,
        completeUrl,
        cancelUrl
      );

      // JSON形式でURLを返す（フロントエンドでリダイレクト）
      return json({ checkoutUrl, success: true });
    } catch (tebexError) {
      console.error("[Tebex Checkout] API Error:", tebexError);

      const errorMessage = tebexError instanceof Error ? tebexError.message : "Unknown error";

      // 排他的パッケージエラーの検出（既に購入済み or 別Tierを所有）
      if (errorMessage.includes("exclusive") || errorMessage.includes("own packages")) {
        return json(
          {
            error: "現在このプランを購入できません。既に有効なサブスクリプションをお持ちの可能性があります。",
            errorType: "exclusive_package",
            details: "プランの変更や期間の確認は Discord でお問い合わせください。",
          },
          { status: 400 }
        );
      }

      return json(
        {
          error: "チェックアウトの準備中にエラーが発生しました。しばらく経ってから再度お試しください。",
          details: errorMessage,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Tebex Checkout] Unexpected error:", error);
    return json(
      { error: "予期しないエラーが発生しました" },
      { status: 500 }
    );
  }
}

// GETリクエストは許可しない
export async function loader() {
  return json({ error: "Method not allowed" }, { status: 405 });
}
