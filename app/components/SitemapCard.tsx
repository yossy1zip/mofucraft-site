import { Link } from "@remix-run/react";

const sitemapLinks = [
  { title: 'トップページ', url: '/' },
  { title: 'ニュース', url: '/news' },
  { title: '処罰リスト', url: '/punishments/bans' },
  { title: 'スタッフ', url: '/staff' },
  { title: '武器一覧', url: '/weapons' },
  { title: 'コミュニティ', url: '/communities' },
  { title: 'ストア', url: '/store' },
  { title: 'サーバー情報', url: '/about' },
  { title: 'マップ', url: '/map' },
];

export default function SitemapCard() {
  return (
    <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg shadow">
      <h2 className="p-4 font-bold border-b dark:border-neutral-700 m-0 text-gray-700 dark:text-gray-300">
        サイトマップ
      </h2>
      <div className="p-4">
        <ul className="space-y-2 m-0 p-0 list-none">
          {sitemapLinks.map((link, index) => (
            <li key={index}>
              <Link
                to={link.url}
                className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                {link.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
