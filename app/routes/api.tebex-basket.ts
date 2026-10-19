/**
 * Tebex バスケット作成 API ルート
 *
 * POST /api/tebex-basket
 * Body: { username: string, packageId: string }
 *
 * Minecraft ID とパッケージIDを受け取り、
 * Tebex Headless API でバスケットを作成してバスケットIDを返す
 * フロントエンドでTebex.jsを使用してチェックアウトを表示
 */

import { json, type ActionFunctionArgs } from "@remix-run/node";
import { createBasket, addPackageToBasket } from "~/utils/tebex.server";
import { checkCheckoutRateLimit, checkGlobalRateLimit, getClientIp } from "~/utils/rate-limit.server";

// Minecraft ID のバリデーション
function isValidMinecraftUsername(username: string): boolean {
  const regex = /^[a-zA-Z0-9_]{3,16}$/;
  return regex.test(username);
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const clientIp = getClientIp(request);

  // レート制限チェック（IP単位 + 偽装対策のエンドポイント全体上限）
  const rateLimit = checkCheckoutRateLimit(clientIp);
  const globalRateLimit = checkGlobalRateLimit("tebex-basket", {
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
        },
      }
    );
  }

  try {
    const formData = await request.formData();
    const username = formData.get("username");
    const packageId = formData.get("packageId");
    const quantityRaw = formData.get("quantity");
    const quantity = quantityRaw ? Math.min(10, Math.max(1, parseInt(String(quantityRaw), 10) || 1)) : 1;

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
      // 1. バスケットを作成
      const basket = await createBasket(username, clientIp, completeUrl, cancelUrl);

      // 2. パッケージを追加
      const updatedBasket = await addPackageToBasket(
        basket.ident,
        packageId,
        basket.username_id,
        quantity
      );

      // バスケットIDとチェックアウトURLを返す
      return json({
        success: true,
        basketIdent: updatedBasket.ident,
        checkoutUrl: updatedBasket.links?.checkout,
      });
    } catch (tebexError) {
      console.error("[Tebex Basket] API Error:", tebexError);

      const errorMessage = tebexError instanceof Error ? tebexError.message : "Unknown error";

      // 排他的パッケージエラーの検出（複数のエラーメッセージパターンに対応）
      if (
        errorMessage.includes("exclusive") ||
        errorMessage.includes("own packages") ||
        errorMessage.includes("isn't purchasable") ||
        errorMessage.includes("is not purchasable") ||
        errorMessage.includes("not purchasable")
      ) {
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
          error: "バスケットの作成中にエラーが発生しました。しばらく経ってから再度お試しください。",
          details: errorMessage,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Tebex Basket] Unexpected error:", error);
    return json(
      { error: "予期しないエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function loader() {
  return json({ error: "Method not allowed" }, { status: 405 });
}
