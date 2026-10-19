import { Link } from "@remix-run/react";
import { useEffect, useState } from "react";
import SitemapCard from "./SitemapCard";

// Xロゴコンポーネント
const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// エラーページ用のリンクリスト
const links = [
  { title: 'スタッフリスト', url: '/staff', type: 'internal' },
  { title: 'コミュニティリスト', url: '/communities', type: 'internal' },
  { title: 'BANリスト', url: '/punishments/bans', type: 'internal' },
  { title: '所持金ランキング', url: '/miscs/money_ranking', type: 'internal' },
  { title: 'ストア', url: '/store', type: 'internal' },
  { title: '非公式Wiki', url: '//mofunotoffi.playing.wiki/d/%a5%c8%a5%c3%a5%d7%a5%da%a1%bc%a5%b8', type: 'external' },
  { title: '公式', url: '//x.com/mofucraft', type: 'external', icon: 'x' },
  { title: '公式YouTubeチャンネル', url: '//youtube.com/@mofucraft', type: 'external' },
  { title: 'minecraft.jp', url: '//minecraft.jp/servers/mofucraft.net', type: 'external' }
] as const;

function LinksCard() {
  return (
    <div className="bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-lg shadow">
      <h2 className="p-4 font-bold border-b dark:border-neutral-700 m-0">Links</h2>
      <div className="p-4 space-y-3 text-center">
        {links.map((link, index) => {
          if (link.type === 'external') {
            return (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all duration-200 group"
              >
                <span className="font-medium flex items-center gap-1 text-gray-700 group-hover:text-blue-600 dark:text-gray-300 dark:group-hover:text-blue-300">
                  {link.title}
                  {'icon' in link && link.icon === 'x' && (
                    <XLogo className="w-4 h-4 inline-block fill-gray-700 group-hover:fill-blue-600 dark:fill-gray-300 dark:group-hover:fill-blue-300" />
                  )}
                </span>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            );
          }
          if (link.type === 'internal') {
            return (
              <Link
                key={index}
                to={link.url}
                className="block w-full text-left px-4 py-3 text-white rounded-lg transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {link.title}
              </Link>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

function DiscordWidget() {
  // Discordウィジェット（iframe）はSSRとCSRで内容が異なるため、
  // マウント後（ハイドレーション完了後）にのみ描画してミスマッチを防ぐ
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-lg shadow">
      <div className="p-4">
        {!isClient ? null : (
          <iframe
            src={`https://discord.com/widget?id=416316636979658763&theme=${
              window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light'
            }`}
            width="100%"
            height="500"
            allowTransparency={true}
            frameBorder={0}
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          ></iframe>
        )}
      </div>
    </div>
  );
}

export default function ErrorSidebar() {
  return (
    <div className="space-y-4">
      <SitemapCard />
      <LinksCard />
      <DiscordWidget />
    </div>
  );
}
