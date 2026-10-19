import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface PveModeContextType {
  isPveMode: boolean;
  togglePveMode: () => void;
}

const PveModeContext = createContext<PveModeContextType | undefined>(undefined);

export function PveModeProvider({ children }: { children: ReactNode }) {
  const [isPveMode, setIsPveMode] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // クライアントサイドでのみsessionStorageから初期値を読み込み
  // sessionStorageを使用することで、タブを閉じると状態がリセットされる
  useEffect(() => {
    setIsHydrated(true);
    const saved = sessionStorage.getItem('pveMode');
    if (saved === 'true') {
      setIsPveMode(true);
    }
  }, []);

  // 状態変更時にsessionStorageに保存
  useEffect(() => {
    if (isHydrated) {
      sessionStorage.setItem('pveMode', String(isPveMode));
    }
  }, [isPveMode, isHydrated]);

  const togglePveMode = () => {
    setIsPveMode(prev => !prev);
    // 切り替え時にページ上部にスムーズにスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <PveModeContext.Provider value={{ isPveMode: isHydrated ? isPveMode : false, togglePveMode }}>
      {children}
    </PveModeContext.Provider>
  );
}

export function usePveMode() {
  const context = useContext(PveModeContext);
  if (!context) {
    throw new Error('usePveMode must be used within PveModeProvider');
  }
  return context;
}
