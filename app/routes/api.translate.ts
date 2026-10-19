import { json, type ActionFunctionArgs } from "@remix-run/node";
import { translateTexts } from "~/utils/deepl.server";
import { SUPPORTED_LANGUAGES, type SupportedLangCode } from "~/utils/translation-languages";
import { checkRateLimit, checkGlobalRateLimit, getClientIp } from "~/utils/rate-limit.server";

const validLangs = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const clientIp = getClientIp(request);

  const rateLimit = checkRateLimit(`translate:${clientIp}`, {
    limit: 10,
    windowMs: 60 * 1000,
  });
  // IPスプーフィングでIP単位の制限が回避された場合に備え、
  // 有料APIであるDeepLの呼び出し数をエンドポイント全体でも上限する
  const globalRateLimit = checkGlobalRateLimit("translate", {
    limit: 300,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.success || !globalRateLimit.success) {
    const resetIn = !rateLimit.success ? rateLimit.resetIn : globalRateLimit.resetIn;
    return json(
      { error: `リクエストが多すぎます。${resetIn}秒後に再度お試しください。` },
      { status: 429, headers: { "Retry-After": String(resetIn) } }
    );
  }

  try {
    const body = await request.json();
    const { texts, targetLang } = body as {
      texts: string[];
      targetLang: string;
    };

    if (!targetLang || !validLangs.has(targetLang as SupportedLangCode)) {
      return json({ error: "サポートされていない言語です" }, { status: 400 });
    }

    if (!Array.isArray(texts) || texts.length === 0) {
      return json(
        { error: "翻訳するテキストがありません" },
        { status: 400 }
      );
    }

    if (texts.length > 200) {
      return json(
        { error: "一度に翻訳できるテキスト数を超えています" },
        { status: 400 }
      );
    }

    const totalChars = texts.reduce((sum, t) => sum + t.length, 0);
    if (totalChars > 50000) {
      return json(
        { error: "テキストの合計文字数が制限を超えています" },
        { status: 400 }
      );
    }

    const result = await translateTexts(
      texts,
      targetLang as SupportedLangCode
    );

    return json({
      translations: result.translations,
      meta: {
        fromCache: result.fromCache,
        fromApi: result.fromApi,
        charCount: result.charCount,
      },
    });
  } catch (error) {
    console.error("[Translate API] Error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return json(
      { error: "翻訳中にエラーが発生しました", details: message },
      { status: 500 }
    );
  }
}

export async function loader() {
  return json({ error: "Method not allowed" }, { status: 405 });
}
