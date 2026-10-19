import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAnglesDown, faCube } from "@fortawesome/free-solid-svg-icons";
import type { GalleryData } from "~/utils/strapi";
import { usePveMode } from "~/contexts/PveModeContext";
import { hapticTap } from "~/utils/haptic";
import PveModeToggle from "~/components/PveModeToggle";

interface Props {
  showVideo?: boolean;
  galleries?: GalleryData[];
  pveGalleries?: GalleryData[];
}

// PvE用フォールバックギャラリーデータ（Strapiにデータがない場合）
const createFallbackImage = (url: string, id: number) => ({
  id,
  documentId: `fallback-${id}`,
  name: `fallback-image-${id}`,
  width: 1920,
  height: 1080,
  url,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const fallbackPveGalleries: GalleryData[] = [
  { id: 1, documentId: 'fallback-gallery-1', alt: 'PvE Screenshot 1', description: 'PvEワールド', server: 'PvE Server', image: [createFallbackImage('/img/pve1.png', 1)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 2, documentId: 'fallback-gallery-2', alt: 'PvE Screenshot 2', description: 'PvEワールド', server: 'PvE Server', image: [createFallbackImage('/img/pve2.png', 2)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 3, documentId: 'fallback-gallery-3', alt: 'PvE Screenshot 3', description: 'PvEワールド', server: 'PvE Server', image: [createFallbackImage('/img/pve1.png', 3)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 4, documentId: 'fallback-gallery-4', alt: 'PvE Screenshot 4', description: 'PvEワールド', server: 'PvE Server', image: [createFallbackImage('/img/pve2.png', 4)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export default function TopPageFullWidth({ showVideo = true, galleries = [], pveGalleries = [] }: Props) {
  const [videoElement, setVideoElement] = useState<JSX.Element | null>(null);
  const { isPveMode } = usePveMode();

  useEffect(() => {
    if (showVideo && !isPveMode) {
      setVideoElement(
        <video
          className="w-full h-full object-cover"
          playsInline
          autoPlay
          loop
          muted
          poster="//mofucraft.net/image/2018-12-28_00.28.27.webp"
        >
          <source src="//mofucraft.net/image/480p.webm" type="video/webm" />
          <source src="//mofucraft.net/image/480p.mp4" type="video/mp4" />
        </video>
      );
    } else if (isPveMode) {
      setVideoElement(null);
    }
  }, [showVideo, isPveMode]);

  const handleScroll = () => {
    hapticTap();
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth'
    });
  };

  // 画像の完全なURLを生成（Strapi URLは https://strapi.example.com/）
  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) {
      return url;
    }
    // 相対パスの場合、Strapi URLを付加
    return `https://strapi.example.com${url}`;
  };

  // PvEモード時はPvEギャラリーを使用（Strapiデータがなければフォールバック）
  const activePveGalleries = pveGalleries.length > 0 ? pveGalleries : fallbackPveGalleries;
  const activeGalleries = isPveMode ? activePveGalleries : galleries;

  // ギャラリーデータを2行に分割
  const midPoint = Math.ceil(activeGalleries.length / 2);
  const row1Images = activeGalleries.slice(0, midPoint);
  const row2Images = activeGalleries.slice(midPoint);

  return (
    <div className="w-full">
      <div className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
        {/* Video Background (通常モード) */}
        <div className={`absolute inset-0 transition-opacity duration-700 ${isPveMode ? 'opacity-0' : 'opacity-100'}`}>
          {videoElement}
        </div>

        {/* PvE Mode Background Image */}
        <div className={`absolute inset-0 transition-opacity duration-700 ${isPveMode ? 'opacity-100' : 'opacity-0'}`}>
            <img
              src="/img/pve3.png"
              alt="PvE Server"
              className="w-full h-full object-cover"
            />
            {/* PvE用グラデーションオーバーレイ */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-purple-950/50 to-black/80" />
            {/* 赤と紫のアクセントグラデーション */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 via-transparent to-purple-900/30" />
        </div>

        {/* Overlay with dots (通常モード) */}
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-700 ${isPveMode ? 'opacity-0' : 'opacity-100'}`}>
          <div className="absolute inset-0 bg-[url('/dot.svg')] w-full h-full" />
        </div>

        {/* Content - PvE Mode */}
        <div className={`transition-opacity duration-700 ${isPveMode ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {/* PvE Mode Content */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center">
            <span className="text-white/60 text-sm md:text-base tracking-[0.4em] uppercase font-light">
              New World
            </span>
          </div>

          {/* PvE Welcome Text */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10">
            <h1 className="text-5xl sm:text-7xl md:text-6xl lg:text-8xl font-black tracking-wider drop-shadow-2xl whitespace-nowrap bg-gradient-to-r from-purple-400 via-white to-red-400 bg-clip-text text-transparent">
              PvE
            </h1>
            <p className="text-white/70 text-lg sm:text-xl md:text-2xl mt-4 font-light tracking-widest">
              — NOW OPEN —
            </p>
          </div>
        </div>

        {/* Content - Normal Mode */}
        <div className={`transition-opacity duration-700 ${isPveMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {/* Normal Mode Content */}
          <FontAwesomeIcon
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white w-24 h-24 sm:w-32 sm:h-32 md:w-24 md:h-24 opacity-70 z-10"
            icon={faCube}
          />

          {/* Welcome Text */}
          <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-4xl sm:text-6xl md:text-4xl lg:text-5xl border-b-2 border-white px-4 sm:px-8 py-2 sm:py-4 font-raleway z-10 whitespace-nowrap">
            Welcome.
          </p>
        </div>

        {/* Scroll Down Arrow */}
        <div
          className="absolute bottom-6 sm:bottom-10 left-1/2 transform -translate-x-1/2 cursor-pointer z-10"
          onClick={handleScroll}
        >
          <FontAwesomeIcon
            className={`w-20 h-20 sm:w-24 sm:h-24 md:w-16 md:h-16 opacity-70 animate-bounce hover:opacity-40 transition-opacity duration-300 ${isPveMode ? 'text-pve-purple' : 'text-white'}`}
            icon={faAnglesDown}
          />
        </div>
      </div>

      {/* First Time Visitor Section - PvEモード時は非表示 */}
      {!isPveMode && (
      <div className="relative w-full h-64 sm:h-80 md:h-96 py-6 md:py-12 overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('//mofucraft.net/image/2018-12-28_00.28.27.webp')"
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-purple-900/80 to-pink-900/80" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-2">
          <h2 className="text-white text-3xl sm:text-4xl md:text-5xl font-bold font-raleway mb-4 sm:mb-6 text-center">
            初めての方はこちら
          </h2>
          <p className="text-white text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-center max-w-2xl opacity-90">
            MOFUCRAFTへようこそ！サーバーの遊び方や参加方法をご案内します。
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="/about"
              onClick={() => hapticTap()}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-900 rounded-lg font-bold text-base sm:text-lg hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-center"
            >
              🔰MOFUCRAFTはどんなサーバー？
            </a>
          </div>
        </div>
      </div>
      )}

      {/* Photo Gallery Section */}
      <div className={`relative w-full py-6 md:py-12 overflow-hidden transition-colors duration-700 ${isPveMode ? 'bg-gradient-to-b from-black to-purple-950' : 'bg-gray-900'}`}>
        {/* Header */}
        <div className="text-center mb-8 px-4">
          <h2 className="text-white text-2xl sm:text-3xl md:text-5xl font-bold font-raleway mb-3">
            {isPveMode ? (
              <><span className="bg-gradient-to-r from-purple-400 to-red-400 bg-clip-text text-transparent">PvE</span> ギャラリー</>
            ) : (
              'MOFUCRAFTの世界を覗いてみよう'
            )}
          </h2>
        </div>

        {/* Scrolling Gallery - Row 1 (Left to Right) */}
        <div className="relative mb-4 overflow-hidden">
          <div className="flex gap-4 animate-scroll-left">
            {[...Array(2)].map((_, setIndex) => (
              <div key={setIndex} className="flex gap-4 shrink-0">
                {row1Images.map((gallery, index) => {
                  const imageUrl = gallery.image?.[0]?.url
                    ? getImageUrl(gallery.image[0].url)
                    : '//mofucraft.net/image/2018-12-28_00.28.27.webp';

                  return (
                    <div
                      key={`${setIndex}-${index}`}
                      className="relative w-80 h-48 rounded-lg overflow-hidden shadow-xl hover:scale-105 transition-transform duration-300 shrink-0"
                    >
                      <img
                        src={imageUrl}
                        alt={gallery.alt || 'MOFUCRAFT ギャラリー'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-white font-semibold">{gallery.description}</p>
                          {gallery.server && (
                            <p className="text-white text-xs mt-1 opacity-80">{gallery.server}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Scrolling Gallery - Row 2 (Right to Left) */}
        <div className="relative overflow-hidden">
          <div className="flex gap-4 animate-scroll-right">
            {[...Array(2)].map((_, setIndex) => (
              <div key={setIndex} className="flex gap-4 shrink-0">
                {row2Images.map((gallery, index) => {
                  const imageUrl = gallery.image?.[0]?.url
                    ? getImageUrl(gallery.image[0].url)
                    : '//mofucraft.net/image/2018-12-28_00.28.27.webp';

                  return (
                    <div
                      key={`${setIndex}-${index}`}
                      className="relative w-80 h-48 rounded-lg overflow-hidden shadow-xl hover:scale-105 transition-transform duration-300 shrink-0"
                    >
                      <img
                        src={imageUrl}
                        alt={gallery.alt || 'MOFUCRAFT ギャラリー'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-white font-semibold">{gallery.description}</p>
                          {gallery.server && (
                            <p className="text-white text-xs mt-1 opacity-80">{gallery.server}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes scroll-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }

        .animate-scroll-left {
          animation: scroll-left 30s linear infinite;
        }

        .animate-scroll-right {
          animation: scroll-right 30s linear infinite;
        }

        @media (max-width: 767px) {
          .animate-scroll-left {
            animation-duration: 15s;
          }
          .animate-scroll-right {
            animation-duration: 15s;
          }
        }

        .animate-scroll-left:hover,
        .animate-scroll-right:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* モード切り替えバー */}
      <div className={`relative w-full overflow-hidden py-10 md:py-14 transition-colors duration-700 ${isPveMode ? 'bg-gradient-to-b from-purple-950 to-black' : 'bg-gradient-to-b from-gray-900 to-gray-950'}`}>
        <div className="relative z-10 flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-xs md:text-sm tracking-[0.3em] uppercase font-light text-white/50">
            Choose Your World
          </p>
          <PveModeToggle />
        </div>
      </div>
    </div>
  );
}