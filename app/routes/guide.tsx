import { json, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getWikiMenuSections } from '~/utils/wikijs.server';
import type { MenuSection } from '~/types/menu';
import MenuSections from '~/components/MenuSections';

export const meta: MetaFunction = () => [
  { title: "ガイド - MOFUCRAFT!!!" }
];

export const loader = async () => {
  const menuSections = await getWikiMenuSections();
  return json({ menuSections }, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=300"
    }
  });
};

export default function Guide() {
  const { menuSections } = useLoaderData<{ menuSections: MenuSection[] }>();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">ガイド</h1>
        <p className="text-gray-600 dark:text-gray-400">MOFUCRAFTのガイドページです。各項目をクリックして詳細をご覧ください。</p>
      </div>
      <MenuSections menuSections={menuSections} />
    </div>
  );
}
