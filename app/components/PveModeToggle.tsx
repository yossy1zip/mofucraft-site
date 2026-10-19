import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCube, faDragon } from '@fortawesome/free-solid-svg-icons';
import { usePveMode } from '~/contexts/PveModeContext';
import { hapticToggle } from '~/utils/haptic';

export default function PveModeToggle() {
  const { isPveMode, togglePveMode } = usePveMode();

  const handleSelect = (target: boolean) => {
    if (target === isPveMode) return;
    hapticToggle();
    togglePveMode();
  };

  return (
    <div className="relative grid grid-cols-2 rounded-full bg-neutral-900/80 backdrop-blur-sm border border-white/10 p-1 shadow-lg">
      {/* 選択中セグメントの背後にスライドするハイライト */}
      <div
        className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out ${
          isPveMode
            ? 'translate-x-full bg-gradient-to-r from-pve-purple to-pve-red'
            : 'translate-x-0 bg-gradient-to-r from-blue-600 to-cyan-600'
        }`}
      />
      <button
        onClick={() => handleSelect(false)}
        aria-pressed={!isPveMode}
        title="生活に切り替え"
        className={`relative z-10 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors duration-300 ${
          isPveMode ? 'text-neutral-400 hover:text-neutral-200' : 'text-white'
        }`}
      >
        <FontAwesomeIcon icon={faCube} className="w-3.5 h-3.5" />
        生活
      </button>
      <button
        onClick={() => handleSelect(true)}
        aria-pressed={isPveMode}
        title="PvEに切り替え"
        className={`relative z-10 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors duration-300 ${
          isPveMode ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <FontAwesomeIcon icon={faDragon} className="w-3.5 h-3.5" />
        PvE
      </button>
    </div>
  );
}
