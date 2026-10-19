import { Link } from '@remix-run/react';
import { useState, useEffect } from 'react';
import type { MenuSection } from '~/types/menu';
import { decodeHtmlEntities } from '~/utils/htmlDecode';
import { usePveMode } from '~/contexts/PveModeContext';
import { hapticTap, hapticToggle } from '~/utils/haptic';

interface MenuItem {
  title: string;
  slug: string;
  image: string;
  isFolder?: boolean;
  items?: MenuItem[];
}

// 画像がない場合のプレースホルダーコンポーネント
const ImagePlaceholder = ({ title, size = "large" }: { title: string; size?: "small" | "large" }) => (
  <div className="w-full h-full bg-gradient-to-br from-neutral-300 to-neutral-400 dark:from-neutral-500 dark:to-neutral-600 flex items-center justify-center">
    <span className={`font-bold text-white/90 select-none ${size === "small" ? "text-sm" : "text-3xl"}`}>
      {title ? title.charAt(0).toUpperCase() : "?"}
    </span>
  </div>
);

// 画像コンポーネント（エラー時にプレースホルダーを表示）
const MenuImage = ({ src, title, size = "large" }: { src: string; title: string; size?: "small" | "large" }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <ImagePlaceholder title={title} size={size} />;
  }

  return (
    <img
      src={src}
      alt=""
      className="w-full h-full object-cover"
      onError={() => setHasError(true)}
    />
  );
};

// フォルダアイコン（4つのサムネイルグリッド）
const FolderIcon = ({ items, title }: { items: MenuItem[]; title: string }) => {
  const displayItems = items.slice(0, 4);
  const emptySlots = 4 - displayItems.length;

  // アイテムが0の場合はフォルダ全体をプレースホルダーで表示
  if (displayItems.length === 0) {
    return (
      <div className="w-[120px] aspect-square rounded-2xl overflow-hidden shadow-lg">
        <ImagePlaceholder title={title} size="large" />
      </div>
    );
  }

  return (
    <div className="w-[120px] aspect-square grid grid-cols-2 gap-1.5 p-2.5 rounded-2xl bg-neutral-400 dark:bg-neutral-600 shadow-lg">
      {displayItems.map((item, index) => (
        <div key={index} className="overflow-hidden rounded-lg aspect-square">
          <MenuImage src={item.image} title={item.title} size="small" />
        </div>
      ))}
      {[...Array(emptySlots)].map((_, i) => (
        <div key={`empty-${i}`} className="rounded-lg bg-neutral-500/50 dark:bg-neutral-500/50 aspect-square" />
      ))}
    </div>
  );
};

interface MenuSectionsProps {
  menuSections: MenuSection[];
}

export default function MenuSections({ menuSections }: MenuSectionsProps) {
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const { isPveMode } = usePveMode();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const modal = document.getElementById('folder-modal');
      if (modal && !modal.contains(event.target as Node)) {
        setOpenFolderId(null);
      }
    };
    if (openFolderId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openFolderId]);

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      <div className="space-y-8">
        {menuSections.map((section) => (
          <div key={section.id} className={`backdrop-blur-xl rounded-2xl shadow-xl border transition-colors duration-700 ${isPveMode ? 'bg-black/60 border-purple-500/30' : 'bg-white/60 dark:bg-neutral-800/60 border-white/40 dark:border-white/10'}`}>
            {/* 控えめなヘッダー */}
            <div className={`border-b px-5 py-3 rounded-t-2xl transition-colors duration-700 ${isPveMode ? 'bg-gradient-to-r from-purple-900/80 to-red-900/80 border-purple-600/50' : 'bg-gradient-to-r from-slate-50 to-slate-100 dark:from-neutral-700/80 dark:to-neutral-800/80 border-slate-200/50 dark:border-neutral-600/50'}`}>
              <h2 className={`text-lg font-bold font-raleway m-0 ${isPveMode ? 'text-purple-100' : 'text-slate-700 dark:text-slate-200'}`}>{section.title}</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {section.items.map((item, index) => {
                  const uniqueId = `${section.id}-${index}`;
                  return (
                    <div key={uniqueId}>
                      {item.isFolder ? (
                        <>
                          <button
                            type="button"
                            onClick={() => { hapticToggle(); setOpenFolderId(openFolderId === uniqueId ? null : uniqueId); }}
                            className="flex flex-col items-center group p-2 w-full"
                          >
                            <div className="mb-3 group-hover:scale-105 transition-transform duration-200">
                              <FolderIcon items={item.items || []} title={item.title} />
                            </div>
                            <p className={`text-sm font-medium text-center transition-colors ${isPveMode ? 'text-purple-200 group-hover:text-white' : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                              {decodeHtmlEntities(item.title)}
                            </p>
                          </button>
                          {openFolderId === uniqueId && (
                            <div
                              className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
                              style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                animation: 'fadeIn 0.2s ease-out forwards'
                              }}
                            >
                                <div
                                  id="folder-modal"
                                  className="w-full max-w-lg bg-white dark:bg-neutral-800 rounded-2xl shadow-xl z-[1001]"
                                  style={{
                                    animation: 'modalIn 0.2s ease-out forwards'
                                  }}
                                >
                                <div className="flex justify-between items-center p-4 border-b dark:border-neutral-700">
                                  <h3 className="font-bold dark:text-white">{decodeHtmlEntities(item.title)}</h3>
                                  <button
                                    onClick={() => { hapticTap(); setOpenFolderId(null); }}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 bg-gray-100 dark:bg-neutral-700 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
                                    aria-label="閉じる"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="24"
                                      height="24"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="w-6 h-6"
                                    >
                                      <line x1="18" y1="6" x2="6" y2="18" />
                                      <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                  </button>
                                </div>
                                <div className="p-4">
                                  <div className="grid grid-cols-3 gap-4">
                                    {item.items?.map((subItem, subIndex) => (
                                      <Link
                                        key={subIndex}
                                        to={subItem.slug}
                                        className="flex flex-col items-center group p-2"
                                        onClick={() => { hapticTap(); setOpenFolderId(null); }}
                                      >
                                        <div className="w-[72px] h-[72px] mb-2 rounded-2xl overflow-hidden shadow-lg group-hover:scale-110 transition-transform duration-200">
                                          <MenuImage src={subItem.image} title={subItem.title} />
                                        </div>
                                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 text-center group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                                          {decodeHtmlEntities(subItem.title)}
                                        </p>
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        item.slug.startsWith('http') || ["about", "map"].includes(item.slug) ? (
                          <a
                            href={item.slug.startsWith('http') ? item.slug : `https://mofucraft.net/${item.slug}`}
                            className="flex flex-col items-center group p-2"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => hapticTap()}
                          >
                            <div className="w-[120px] h-[120px] mb-3 rounded-2xl overflow-hidden shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                              <MenuImage src={item.image} title={item.title} />
                            </div>
                            <p className={`text-sm font-medium text-center transition-colors font-raleway ${isPveMode ? 'text-purple-200 group-hover:text-white' : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                              {item.title}
                            </p>
                          </a>
                        ) : (
                          <Link
                            to={item.slug}
                            className="flex flex-col items-center group p-2"
                            onClick={() => hapticTap()}
                          >
                            <div className="w-[120px] h-[120px] mb-3 rounded-2xl overflow-hidden shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                              <MenuImage src={item.image} title={item.title} />
                            </div>
                            <p className={`text-sm font-medium text-center transition-colors font-raleway ${isPveMode ? 'text-purple-200 group-hover:text-white' : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                              {item.title}
                            </p>
                          </Link>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
