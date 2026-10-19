import { Link, useLocation } from '@remix-run/react';
import { useState } from 'react';
import type { MenuSection } from '~/types/menu';
import { usePveMode } from '~/contexts/PveModeContext';
import { useTranslation } from '~/contexts/TranslationContext';
import { hapticTap, hapticToggle } from '~/utils/haptic';

interface HeaderProps {
  menuSections: MenuSection[];
}

export default function Header({ menuSections }: HeaderProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isPveMode } = usePveMode();
  const { translationStatus, translatePage, revertTranslation, isAvailable, isTranslationEnabled } = useTranslation();

  // 主要なメニュー項目（トップレベル）を抽出
  const mainMenuItems = [
    { title: '初めての方へ', slug: '/about' },
    { title: 'ニュース', slug: '/news' },
    { title: 'マップ', slug: '/map' },
    { title: '処罰', slug: '/punishments/bans' },
    { title: '寄付', slug: '/donators' },
    { title: 'ストア', slug: '/store' },
    { title: 'ルール', slug: '/rules' },
  ];

  return (
    <header className={`block w-full text-neutral-50 font-raleway sticky top-0 z-50 shadow-lg transition-colors duration-700 ${isPveMode ? 'bg-black' : 'bg-neutral-800'}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img
              src="//static.mofucraft.net/img/MOFUact1_128.webp"
              alt="Mofucraft Logo"
              className="h-12 w-12 rounded-full shadow-md select-none"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
            <span className="text-2xl font-bold tracking-wide">MOFUCRAFT</span>
          </Link>

          {/* デスクトップメニュー */}
          <nav className="hidden md:flex items-center space-x-1">
            {mainMenuItems.map((item, index) => {
              if (item.slug === '/') {
                return (
                  <Link
                    key={index}
                    to={item.slug}
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-neutral-700 transition-colors"
                  >
                    {item.title}
                  </Link>
                );
              }

              return (
                <Link
                  key={index}
                  to={item.slug}
                  className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-neutral-700 transition-colors ${
                    location.pathname.startsWith(item.slug) ? 'bg-neutral-700' : ''
                  }`}
                >
                  {item.title}
                </Link>
              );
            })}
            {/* 翻訳ボタン */}
            {isAvailable ? (
              isTranslationEnabled ? (
                <button
                  onClick={() => { hapticTap(); revertTranslation(); }}
                  disabled={translationStatus === "translating"}
                  className={`notranslate ml-2 px-3 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1.5 ${
                    translationStatus === "translating" ? "opacity-50" : ""
                  }`}
                  title="日本語に戻す"
                >
                  {translationStatus === "translating" ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  )}
                  JA
                </button>
              ) : (
                <button
                  onClick={() => { hapticTap(); translatePage(); }}
                  disabled={translationStatus === "translating"}
                  className={`notranslate ml-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-neutral-700 transition-colors flex items-center gap-1.5 ${
                    translationStatus === "translating" ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  title="Translate to English"
                >
                  {translationStatus === "translating" ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  )}
                  EN
                </button>
              )
            ) : (
              <span
                className="notranslate ml-2 px-3 py-2 rounded-md text-sm font-medium text-neutral-500 cursor-not-allowed flex items-center gap-1.5"
                title="翻訳機能は準備中です"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                EN
              </span>
            )}
          </nav>

          {/* モバイル言語切り替えボタン（スマホのみ表示） */}
          <div className="flex md:hidden items-center">
            {isAvailable ? (
              isTranslationEnabled ? (
                <button
                  onClick={() => { hapticTap(); revertTranslation(); }}
                  disabled={translationStatus === "translating"}
                  className={`notranslate p-2 rounded-md text-xs font-bold bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1 ${
                    translationStatus === "translating" ? "opacity-50" : ""
                  }`}
                  title="日本語に戻す"
                >
                  {translationStatus === "translating" ? (
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  )}
                  JA
                </button>
              ) : (
                <button
                  onClick={() => { hapticTap(); translatePage(); }}
                  disabled={translationStatus === "translating"}
                  className={`notranslate p-2 rounded-md text-xs font-bold hover:bg-neutral-700 transition-colors flex items-center gap-1 ${
                    translationStatus === "translating" ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  title="Translate to English"
                >
                  {translationStatus === "translating" ? (
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  )}
                  EN
                </button>
              )
            ) : null}
          </div>

          {/* モバイルメニューボタン */}
          <button
            onClick={() => { hapticToggle(); setIsMobileMenuOpen(!isMobileMenuOpen); }}
            className="hidden p-2 rounded-md hover:bg-neutral-700 transition-colors"
            aria-label="メニューを開く"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* モバイルドロップダウンメニュー */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 animate-slideDown">
            <nav className="flex flex-col space-y-1">
              {mainMenuItems.map((item, index) => (
                <Link
                  key={index}
                  to={item.slug}
                  onClick={() => { hapticTap(); setIsMobileMenuOpen(false); }}
                  className={`px-4 py-3 rounded-md text-sm font-medium hover:bg-neutral-700 transition-colors ${
                    location.pathname === item.slug ? 'bg-neutral-700' : ''
                  }`}
                >
                  {item.title}
                </Link>
              ))}
              {/* モバイル翻訳ボタン */}
              {isAvailable ? (
                isTranslationEnabled ? (
                  <button
                    onClick={() => { hapticTap(); revertTranslation(); setIsMobileMenuOpen(false); }}
                    disabled={translationStatus === "translating"}
                    className={`notranslate px-4 py-3 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 transition-colors text-left flex items-center gap-2 ${
                      translationStatus === "translating" ? "opacity-50" : ""
                    }`}
                  >
                    {translationStatus === "translating" ? (
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                    )}
                    {translationStatus === "translating" ? "翻訳中..." : "日本語に戻す"}
                  </button>
                ) : (
                  <button
                    onClick={() => { hapticTap(); translatePage(); setIsMobileMenuOpen(false); }}
                    disabled={translationStatus === "translating"}
                    className={`notranslate px-4 py-3 rounded-md text-sm font-medium hover:bg-neutral-700 transition-colors text-left flex items-center gap-2 ${
                      translationStatus === "translating" ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {translationStatus === "translating" ? (
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                    )}
                    {translationStatus === "translating" ? "翻訳中..." : "Translate to English"}
                  </button>
                )
              ) : (
                <span className="notranslate px-4 py-3 rounded-md text-sm font-medium text-neutral-500 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  翻訳機能は準備中です
                </span>
              )}
            </nav>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </header>
  );
}
