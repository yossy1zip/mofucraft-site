/**
 * Tebex Headless API ユーティリティ
 * サーバーサイド専用（環境変数にアクセスするため）
 */

const TEBEX_HEADLESS_API = "https://headless.tebex.io/api";

// 環境変数から取得
const getWebstoreToken = () => {
  const token = process.env.TEBEX_WEBSTORE_TOKEN;
  if (!token) {
    throw new Error("TEBEX_WEBSTORE_TOKEN is not configured");
  }
  return token;
};

// Tebex APIの認証ヘッダーを生成
const getAuthHeader = () => {
  const publicToken = process.env.TEBEX_PUBLIC_TOKEN;
  const privateKey = process.env.TEBEX_PRIVATE_KEY;

  if (!publicToken || !privateKey) {
    throw new Error("TEBEX_PUBLIC_TOKEN and TEBEX_PRIVATE_KEY must be configured");
  }

  // Basic認証: publicToken:privateKey をBase64エンコード
  const credentials = Buffer.from(`${publicToken}:${privateKey}`).toString("base64");
  return `Basic ${credentials}`;
};

// レスポンス型定義
interface TebexBasket {
  ident: string;
  complete: boolean;
  email: string | null;
  username: string | null;
  username_id: string | null; // Game Server Commands用のユーザーID
  coupons: unknown[];
  giftcards: unknown[];
  creator_code: string | null;
  links: {
    checkout: string;
    payment?: string;
  };
  custom?: Record<string, unknown>;
}

interface TebexBasketResponse {
  data: TebexBasket;
}

interface TebexError {
  error?: string;
  message?: string;
}

/**
 * バスケットを作成する
 * @param username Minecraft ユーザー名
 * @param ipAddress クライアントのIPアドレス（サーバーから呼び出す場合は必須）
 * @param completeUrl 購入完了後のリダイレクトURL
 * @param cancelUrl キャンセル時のリダイレクトURL
 */
export async function createBasket(
  username: string,
  ipAddress: string,
  completeUrl?: string,
  cancelUrl?: string
): Promise<TebexBasket> {
  const webstoreToken = getWebstoreToken();

  // IPv6は非対応なのでIPv4を優先、それ以外はlocalhostにフォールバック
  const sanitizedIp = ipAddress.includes(":") ? "127.0.0.1" : ipAddress;

  console.log("[Tebex] Creating basket:", {
    username,
    ipAddress: sanitizedIp,
    completeUrl,
    cancelUrl,
  });

  const response = await fetch(
    `${TEBEX_HEADLESS_API}/accounts/${webstoreToken}/baskets`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({
        username,
        ip_address: sanitizedIp,
        complete_url: completeUrl,
        cancel_url: cancelUrl,
        complete_auto_redirect: true,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Tebex] Create basket error response:", {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });

    let error: TebexError = {};
    try {
      error = JSON.parse(errorText);
    } catch {
      // テキストのままエラーを投げる
    }

    throw new Error(
      error.message || error.error || `Failed to create basket: ${response.status} - ${errorText}`
    );
  }

  const result: TebexBasketResponse = await response.json();
  console.log("[Tebex] Basket created:", {
    ident: result.data.ident,
    username_id: result.data.username_id,
  });
  return result.data;
}

/**
 * バスケットにパッケージを追加する
 * @param basketIdent バスケットの識別子
 * @param packageId Tebexパッケージ ID
 * @param usernameId Game Server Commands用のユーザーID（バスケット作成時に取得）
 * @param quantity 数量（デフォルト: 1）
 */
export async function addPackageToBasket(
  basketIdent: string,
  packageId: number | string,
  usernameId?: string | null,
  quantity: number = 1
): Promise<TebexBasket> {
  // リクエストボディを構築
  const requestBody: Record<string, unknown> = {
    package_id: Number(packageId),
    quantity,
  };

  // username_idがある場合はvariable_dataに追加
  if (usernameId) {
    requestBody.variable_data = {
      username_id: usernameId,
    };
  }

  console.log("[Tebex] Adding package to basket:", {
    basketIdent,
    packageId: Number(packageId),
    usernameId,
    requestBody,
  });

  const response = await fetch(
    `${TEBEX_HEADLESS_API}/baskets/${basketIdent}/packages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Tebex] Add package error response:", {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });

    let error: TebexError = {};
    try {
      error = JSON.parse(errorText);
    } catch {
      // テキストのままエラーを投げる
    }

    throw new Error(
      error.message || error.error || `Failed to add package: ${response.status} - ${errorText}`
    );
  }

  const result: TebexBasketResponse = await response.json();
  console.log("[Tebex] Package added successfully:", result.data.ident);
  return result.data;
}

/**
 * バスケットの認証URLを取得する
 * @param basketIdent バスケットの識別子
 * @param returnUrl 認証後のリダイレクトURL
 */
export async function getBasketAuthUrl(
  basketIdent: string,
  returnUrl: string
): Promise<string> {
  const webstoreToken = getWebstoreToken();

  const response = await fetch(
    `${TEBEX_HEADLESS_API}/accounts/${webstoreToken}/baskets/${basketIdent}/auth?returnUrl=${encodeURIComponent(returnUrl)}`,
    {
      method: "GET",
      headers: {
        Authorization: getAuthHeader(),
      },
    }
  );

  if (!response.ok) {
    const error: TebexError = await response.json().catch(() => ({}));
    throw new Error(
      error.message || error.error || `Failed to get auth URL: ${response.status}`
    );
  }

  const result = await response.json();
  // 認証URLを返す（レスポンス形式に応じて調整が必要な場合あり）
  return result.data?.url || result.url;
}

/**
 * バスケット情報を取得する
 * @param basketIdent バスケットの識別子
 */
export async function getBasket(basketIdent: string): Promise<TebexBasket> {
  const webstoreToken = getWebstoreToken();

  const response = await fetch(
    `${TEBEX_HEADLESS_API}/accounts/${webstoreToken}/baskets/${basketIdent}`,
    {
      method: "GET",
      headers: {
        Authorization: getAuthHeader(),
      },
    }
  );

  if (!response.ok) {
    const error: TebexError = await response.json().catch(() => ({}));
    throw new Error(
      error.message || error.error || `Failed to get basket: ${response.status}`
    );
  }

  const result: TebexBasketResponse = await response.json();
  return result.data;
}

/**
 * ワンステップでチェックアウトURLを生成する
 * バスケット作成 → パッケージ追加 → チェックアウトURL取得
 *
 * @param username Minecraft ユーザー名
 * @param packageId Tebexパッケージ ID
 * @param ipAddress クライアントのIPアドレス
 * @param completeUrl 購入完了後のリダイレクトURL
 * @param cancelUrl キャンセル時のリダイレクトURL
 * @returns チェックアウトURL
 */
export async function createCheckoutUrl(
  username: string,
  packageId: number | string,
  ipAddress: string,
  completeUrl?: string,
  cancelUrl?: string
): Promise<string> {
  // 1. バスケットを作成
  const basket = await createBasket(username, ipAddress, completeUrl, cancelUrl);

  // 2. パッケージを追加（username_idをvariable_dataとして渡す）
  const updatedBasket = await addPackageToBasket(
    basket.ident,
    packageId,
    basket.username_id // Game Server Commands用のユーザーID
  );

  // 3. チェックアウトURLを返す
  if (!updatedBasket.links?.checkout) {
    throw new Error("Checkout URL not available");
  }

  return updatedBasket.links.checkout;
}
