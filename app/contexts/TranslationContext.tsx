import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useLocation } from "@remix-run/react";

type TranslationStatus = "idle" | "translating" | "translated" | "error";

interface TranslationContextType {
  translationStatus: TranslationStatus;
  errorMessage: string | null;
  translatePage: () => Promise<void>;
  revertTranslation: () => void;
  isAvailable: boolean;
  isTranslationEnabled: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined
);

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "CODE",
  "NOSCRIPT",
  "SVG",
  "IFRAME",
  "PRE",
  "TEXTAREA",
  "INPUT",
]);

const TARGET_LANG = "EN";

interface TranslationProviderProps {
  children: ReactNode;
  isAvailable: boolean;
}

export function TranslationProvider({ children, isAvailable }: TranslationProviderProps) {
  const [translationStatus, setTranslationStatus] =
    useState<TranslationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
  const originalTextsRef = useRef<Map<Node, string>>(new Map());
  const location = useLocation();
  const prevPathnameRef = useRef(location.pathname);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const collectTextNodes = useCallback((): {
    nodes: Node[];
    texts: string[];
  } => {
    const nodes: Node[] = [];
    const texts: string[] = [];

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          if (parent.closest(".notranslate")) return NodeFilter.FILTER_REJECT;
          const style = window.getComputedStyle(parent);
          if (style.display === "none" || style.visibility === "hidden")
            return NodeFilter.FILTER_REJECT;
          const text = node.textContent?.trim();
          if (!text || text.length === 0) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
      texts.push(walker.currentNode.textContent || "");
    }

    return { nodes, texts };
  }, []);

  const doTranslate = useCallback(async () => {
    if (!isHydrated || !isAvailable) return;
    setTranslationStatus("translating");
    setErrorMessage(null);

    try {
      const { nodes, texts } = collectTextNodes();
      if (texts.length === 0) {
        setTranslationStatus("idle");
        return;
      }

      // 元テキストを保存
      const origMap = new Map<Node, string>();
      nodes.forEach((node, i) => origMap.set(node, texts[i]));
      originalTextsRef.current = origMap;

      // sessionStorageキャッシュチェック
      const cacheKey = `translate:${window.location.pathname}:${TARGET_LANG}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const cachedTranslations: string[] = JSON.parse(cached);
          if (cachedTranslations.length === nodes.length) {
            nodes.forEach((node, i) => {
              node.textContent = cachedTranslations[i];
            });
            setTranslationStatus("translated");
            return;
          }
        } catch {
          sessionStorage.removeItem(cacheKey);
        }
      }

      // チャンク分割してサーバーに送信
      const CHUNK_SIZE = 200;
      const allTranslations: string[] = new Array(texts.length);

      for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
        const chunk = texts.slice(i, i + CHUNK_SIZE);
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: chunk, targetLang: TARGET_LANG }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        data.translations.forEach((t: string, j: number) => {
          allTranslations[i + j] = t;
        });
      }

      // DOMに翻訳を適用
      nodes.forEach((node, i) => {
        node.textContent = allTranslations[i];
      });

      // sessionStorageにキャッシュ
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(allTranslations));
      } catch {
        // sessionStorage容量不足時は無視
      }

      setTranslationStatus("translated");
    } catch (err) {
      console.error("[Translation] Error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "翻訳中にエラーが発生しました"
      );
      setTranslationStatus("error");
      // エラー時は元テキストに戻す
      originalTextsRef.current.forEach((text, node) => {
        node.textContent = text;
      });
      originalTextsRef.current = new Map();
    }
  }, [isHydrated, isAvailable, collectTextNodes]);

  // ページ遷移時: 翻訳モードONなら新ページを自動翻訳
  useEffect(() => {
    if (prevPathnameRef.current === location.pathname) return;
    prevPathnameRef.current = location.pathname;

    // 前ページの元テキスト参照をクリア（DOMが変わるので不要）
    originalTextsRef.current = new Map();

    if (isTranslationEnabled) {
      // DOMが更新された後に翻訳を実行
      setTranslationStatus("idle");
      const timer = setTimeout(() => {
        doTranslate();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setTranslationStatus("idle");
      setErrorMessage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // トグルON: 翻訳を実行してモードを有効化
  const translatePage = useCallback(async () => {
    setIsTranslationEnabled(true);
    await doTranslate();
  }, [doTranslate]);

  // トグルOFF: 元テキストに戻してモードを無効化
  const revertTranslation = useCallback(() => {
    setIsTranslationEnabled(false);
    originalTextsRef.current.forEach((text, node) => {
      node.textContent = text;
    });
    originalTextsRef.current = new Map();
    setTranslationStatus("idle");
    setErrorMessage(null);
  }, []);

  return (
    <TranslationContext.Provider
      value={{
        translationStatus,
        errorMessage,
        translatePage,
        revertTranslation,
        isAvailable,
        isTranslationEnabled,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within TranslationProvider");
  }
  return context;
}
