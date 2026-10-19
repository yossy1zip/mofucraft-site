/**
 * Tebex 複数パッケージ バスケット作成 API
 *
 * POST /api/tebex-basket-multi
 * Body (JSON): { username: string, items: { packageId: string, quantity: number }[] }
 *
 * 複数のパッケージを1つのバスケットにまとめてチェックアウト用 ident を返す
 */

import { json, type ActionFunctionArgs } from "@remix-run/node";
import { createBasket, addPackageToBasket } from "~/utils/tebex.server";
import { checkCheckoutRateLimit, checkGlobalRateLimit, getClientIp } from "~/utils/rate-limit.server";

interface BasketItem {
  packageId: string;
  quantity: number;
}

function isValidMinecraftUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,16}$/.test(username);
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const clientIp = getClientIp(request);
  const rateLimit = checkCheckoutRateLimit(clientIp);
  const globalRateLimit = checkGlobalRateLimit("tebex-basket-multi", {
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
      { status: 429, headers: { "Retry-After": String(resetIn) } }
    );
  }

  try {
    const body = await request.json() as { username?: unknown; items?: unknown };
    const { username, items } = body;

    if (!username || typeof username !== "string") {
      return json({ error: "Minecraft ID を入力してください" }, { status: 400 });
    }
    if (!isValidMinecraftUsername(username)) {
      return json(
        { error: "Minecraft ID は3-16文字の英数字とアンダースコアのみ使用できます" },
        { status: 400 }
      );
    }
    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: "カートにアイテムがありません" }, { status: 400 });
    }

    const typedItems = items as BasketItem[];
    for (const item of typedItems) {
      if (!item.packageId || typeof item.packageId !== "string") {
        return json({ error: "無効なパッケージIDです" }, { status: 400 });
      }
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
        return json({ error: "個数は1〜10の範囲で指定してください" }, { status: 400 });
      }
    }

    const origin = new URL(request.url).origin;
    const completeUrl = `${origin}/store?purchased=success`;
    const cancelUrl = `${origin}/store?purchased=cancelled`;

    // バスケットを作成
    const basket = await createBasket(username, clientIp, completeUrl, cancelUrl);

    // 全パッケージを順番に追加
    let updatedBasket = basket;
    for (const item of typedItems) {
      updatedBasket = await addPackageToBasket(
        updatedBasket.ident,
        item.packageId,
        updatedBasket.username_id,
        Number(item.quantity)
      );
    }

    return json({
      success: true,
      basketIdent: updatedBasket.ident,
      checkoutUrl: updatedBasket.links?.checkout,
    });
  } catch (error) {
    console.error("[Tebex Multi-Basket] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return json(
      { error: "バスケットの作成中にエラーが発生しました。しばらく経ってから再度お試しください。", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function loader() {
  return json({ error: "Method not allowed" }, { status: 405 });
}
