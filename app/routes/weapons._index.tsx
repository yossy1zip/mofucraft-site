import type { MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { getWeapons } from "~/utils/strapi";

export async function loader() {
  try {
    const weapons = await getWeapons();

    return json({ weapons, error: null }, {
      headers: {
        "Cache-Control": "public, max-age=300", // 5分間キャッシュ
      },
    });
  } catch (error) {
    console.error("Failed to fetch weapons from Strapi:", error);
    // Strapiが利用できない場合は空配列を返す
    return json({ weapons: [], error: "Strapi APIに接続できません" }, {
      headers: {
        "Cache-Control": "public, max-age=60", // エラー時は1分間キャッシュ
      },
    });
  }
}

export const meta: MetaFunction = () => {
  return [
    { title: "武器一覧 - MOFUCRAFT!!!" },
    {
      name: "description",
      content: "MOFUCRAFTサーバーで使用可能な武器の一覧です。",
    },
  ];
};

export default function WeaponsIndex() {
  const { weapons, error } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* パンくずリスト */}
      <nav className="mb-6 text-sm text-gray-600">
        <Link to="/" className="hover:text-blue-600">
          ホーム
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">武器一覧</span>
      </nav>

      {/* ページタイトル */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">武器一覧</h1>
        <p className="text-gray-600">
          MOFUCRAFTサーバーで使用可能な武器の一覧です。クリックして詳細を確認できます。
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">⚠️ {error}</p>
        </div>
      )}

      {/* 武器数表示 */}
      {!error && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-900">
            <span className="font-semibold">全 {weapons.length} 種類</span>の武器が登録されています
          </p>
        </div>
      )}

      {/* 武器リスト */}
      {weapons.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-lg">武器データがありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {weapons.filter(w => w != null).map((weapon) => (
            <Link
              key={weapon.id}
              to={`/weapons/${weapon.slug}`}
              className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 hover:border-blue-400"
            >
              {/* 武器名 */}
              <h2 className="text-xl font-semibold mb-3 text-gray-900">
                {weapon.weapon_name.replace(/<[^>]*>/g, "")}
              </h2>

              {/* 説明文（最初の100文字） */}
              {weapon.description && (
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {weapon.description.length > 100
                    ? `${weapon.description.substring(0, 100)}...`
                    : weapon.description}
                </p>
              )}

              {/* Lore プレビュー */}
              {weapon.lore && weapon.lore.trim() !== "" && (
                <div className="mb-4 p-3 bg-amber-50 rounded border-l-2 border-amber-500">
                  <p className="text-sm text-amber-800 italic line-clamp-2">
                    {weapon.lore.split("\n")[0]}
                  </p>
                  {weapon.lore.split("\n").length > 1 && (
                    <p className="text-xs text-amber-600 mt-1">
                      +{weapon.lore.split("\n").length - 1} more lines
                    </p>
                  )}
                </div>
              )}

              {/* メタ情報 */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>ID: {weapon.id}</span>
                  <span className="text-blue-600 font-medium">
                    詳細を見る →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 更新情報 */}
      {weapons.length > 0 && (
        <div className="mt-8 p-4 bg-gray-100 rounded text-sm text-gray-600">
          <p>
            最終更新:{" "}
            {new Date(
              Math.max(
                ...weapons.filter(w => w != null).map((w) => new Date(w.updatedAt).getTime())
              )
            ).toLocaleString("ja-JP")}
          </p>
        </div>
      )}
    </div>
  );
}
