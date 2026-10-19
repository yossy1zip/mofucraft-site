import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { getWeaponBySlug } from "~/utils/strapi";
import NotFound from "~/components/NotFound";

export async function loader({ params }: LoaderFunctionArgs) {
  const slug = params.slug;

  if (!slug) {
    throw new Response("Not Found", { status: 404 });
  }

  try {
    const weapon = await getWeaponBySlug(slug);

    if (!weapon) {
      throw new Response("Not Found", { status: 404 });
    }

    return json({ weapon }, {
      headers: {
        "Cache-Control": "public, max-age=300", // 5分間キャッシュ
      },
    });
  } catch (error) {
    console.error("Failed to fetch weapon from Strapi:", error);
    throw new Response("Strapi APIに接続できません", { status: 503 });
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) {
    return [{ title: "武器が見つかりません - MOFUCRAFT!!!" }];
  }

  const weaponName = data.weapon.weapon_name;
  return [
    { title: `${weaponName} - 武器詳細 - MOFUCRAFT!!!` },
    {
      name: "description",
      content: data.weapon.description || `${weaponName}の詳細情報`,
    },
  ];
};

export function ErrorBoundary() {
  return <NotFound />;
}

export default function WeaponPage() {
  const { weapon } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* パンくずリスト */}
      <nav className="mb-6 text-sm text-gray-600">
        <Link to="/" className="hover:text-blue-600">
          ホーム
        </Link>
        <span className="mx-2">/</span>
        <Link to="/weapons" className="hover:text-blue-600">
          武器一覧
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{weapon.weapon_name}</span>
      </nav>

      {/* 武器名 */}
      <h1 className="text-4xl font-bold mb-6 text-gray-900">
        {weapon.weapon_name}
      </h1>

      {/* 説明文 */}
      {weapon.description && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">説明</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{weapon.description}</p>
        </div>
      )}

      {/* Lore（フレーバーテキスト） */}
      {weapon.lore && weapon.lore.trim() !== "" && (
        <div className="mb-8 p-6 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg">
          <h2 className="text-2xl font-semibold mb-4 text-amber-900">Lore</h2>
          <div className="space-y-2">
            {weapon.lore.split("\n").map((line, index) => (
              <p key={index} className="text-amber-800 italic">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* インフォバーテキスト */}
      {weapon.info_bar_text && (
        <div className="mb-8 p-6 bg-blue-50 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4 text-blue-900">
            インフォバー
          </h2>
          <p className="text-blue-800 font-mono">{weapon.info_bar_text}</p>
        </div>
      )}

      {/* Raw Config（設定ファイル） */}
      {weapon.raw_config && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            設定ファイル
          </h2>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
            <code>{weapon.raw_config}</code>
          </pre>
        </div>
      )}

      {/* メタ情報 */}
      <div className="mt-8 p-4 bg-gray-100 rounded text-sm text-gray-600">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <span className="font-semibold">作成日:</span>{" "}
            {new Date(weapon.createdAt).toLocaleDateString("ja-JP")}
          </div>
          <div>
            <span className="font-semibold">更新日:</span>{" "}
            {new Date(weapon.updatedAt).toLocaleDateString("ja-JP")}
          </div>
          {weapon.publishedAt && (
            <div>
              <span className="font-semibold">公開日:</span>{" "}
              {new Date(weapon.publishedAt).toLocaleDateString("ja-JP")}
            </div>
          )}
          <div>
            <span className="font-semibold">スラッグ:</span> {weapon.slug}
          </div>
        </div>
      </div>

      {/* 戻るボタン */}
      <div className="mt-8">
        <Link
          to="/weapons"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← 武器一覧に戻る
        </Link>
      </div>
    </div>
  );
}
