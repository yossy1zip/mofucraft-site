import React, { useEffect, useRef, useState } from "react";
import { decodeHtmlEntities } from "~/utils/htmlDecode";
import { hapticTap, hapticSuccess } from "~/utils/haptic";

export type TocItem = { text: string; id: string; level: number };

export function extractTocAndContentWithH1H2Toc(html: string | null | undefined) {
  if (!html || typeof html !== "string") {
    return { toc: "", tocItems: [] as TocItem[], newHtml: "" };
  }
  // TOC抽出
  const tocMatch = html.match(/<div[^>]*class=["'][^"']*toc[^"']*["'][^>]*>[\s\S]*?<\/div>/i);
  let toc = "";
  let content = html;
  if (tocMatch) {
    toc = tocMatch[0];
    content = html.replace(toc, "");
  }

  // h1, h2抽出
  const headingRegex = /<(h[12])([^>]*)>(.*?)<\/h[12]>/gi;
  const matches = [...content.matchAll(headingRegex)];
  const tocItems: TocItem[] = [];

  // マッチを逆順で処理することで、後ろから置換していく
  // これにより、インデックスのズレを防ぐ
  const replacements: { index: number; length: number; replacement: string; id: string }[] = [];

  matches.forEach((match, idx) => {
    const tag = match[1];
    const textWithoutTags = match[3]
      .replace(/<a[^>]*class=["'][^"']*toc-anchor[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
    const text = decodeHtmlEntities(textWithoutTags);

    // 既存のIDを抽出
    const existingIdMatch = match[2].match(/id=["']([^"']+)["']/);
    let id: string;

    if (existingIdMatch) {
      // 既存のIDがある場合はそれを使用
      id = existingIdMatch[1];
    } else {
      // IDがない場合は新規作成
      id = `custom-toc-${idx}`;
      if (match.index !== undefined) {
        const replacementHeading = `<${tag}${match[2]} id="${id}">${match[3]}</${tag}>`;
        replacements.push({
          index: match.index,
          length: match[0].length,
          replacement: replacementHeading,
          id: id
        });
      }
    }

    tocItems.push({ text, id, level: tag === "h1" ? 1 : 2 });
  });

  // 逆順でソートして後ろから置換
  replacements.sort((a, b) => b.index - a.index);

  let newHtml = content;
  replacements.forEach(({ index, length, replacement }) => {
    newHtml = newHtml.substring(0, index) + replacement + newHtml.substring(index + length);
  });

  return { toc, tocItems, newHtml };
}

export const TocNav: React.FC<{ tocItems: TocItem[]; variant?: "blue" | "amber" }> = ({
  tocItems,
  variant = "blue"
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!tocItems.length) return null;

  const styles = {
    blue: {
      bg: "bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30",
      border: "border-cyan-400 dark:border-cyan-500",
      text: "text-cyan-700 dark:text-cyan-400",
      title: "text-cyan-800 dark:text-cyan-300"
    },
    amber: {
      bg: "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
      border: "border-amber-400 dark:border-amber-500",
      text: "text-amber-700 dark:text-amber-400",
      title: "text-amber-800 dark:text-amber-300"
    }
  };

  const colorStyle = styles[variant];

  // 番号を生成
  let h1Counter = 0;
  let h2Counter = 0;
  const numberedItems = tocItems.map(item => {
    if (item.level === 1) {
      h1Counter++;
      h2Counter = 0;
      return { ...item, number: `${h1Counter}` };
    } else {
      h2Counter++;
      return { ...item, number: `${h1Counter}-${h2Counter}` };
    }
  });

  return (
    <nav className="mb-8">
      <div className={`${colorStyle.bg} border-l-4 ${colorStyle.border} rounded-lg shadow-md overflow-hidden`}>
        <button
          type="button"
          className={`w-full flex items-center justify-between px-5 py-4 ${colorStyle.title} font-bold text-lg cursor-pointer bg-transparent border-none text-left`}
          onClick={() => { hapticTap(); setIsOpen(o => !o); }}
          aria-expanded={isOpen}
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            目次
          </span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="px-5 pb-4">
            <ul className="flex flex-col gap-2">
              {numberedItems.map(item => (
                <li
                  key={item.id}
                  className={item.level === 2 ? "ml-6 text-sm" : "font-semibold text-base"}
                >
                  <button
                    type="button"
                    className={`${colorStyle.text} hover:underline hover:opacity-80 transition-all duration-150 bg-transparent border-none p-0 cursor-pointer text-left`}
                    onClick={() => {
                      hapticTap();
                      const el = document.getElementById(item.id);
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }}
                  >
                    {item.number}. {item.text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
};

// WordPress コンテンツレンダラーコンポーネント
export const WpContentRenderer: React.FC<{ content: string | null | undefined; variant?: "blue" | "amber" }> = ({
  content,
  variant = "blue"
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const safeContent = typeof content === "string" ? content : "";

  // インラインコードブロックの前後のバッククォートを削除
  // WordPress側で `code` のように書かれた場合に `<code>`code`</code>` となってしまう問題に対応
  const cleanedContent = safeContent
    .replace(/<code>(`+)(.*?)\1<\/code>/g, '<code>$2</code>')  // 両端にバッククォートがある場合
    .replace(/<code>`(.*?)`<\/code>/g, '<code>$1</code>');      // 片方だけの場合

  // コードブロックにコピーボタンを追加 & アラートボックスのスタイルを適用
  useEffect(() => {
    if (!contentRef.current) return;

    // テーブルを overflow-x-auto のラッパーで包む（コマンド集等のオーバーフロー対策）
    const tables = contentRef.current.querySelectorAll('table');
    tables.forEach((table) => {
      if ((table.parentElement as HTMLElement)?.dataset?.tableWrapper) return;
      const wrapper = document.createElement('div');
      wrapper.dataset.tableWrapper = '1';
      wrapper.style.overflowX = 'auto';
      wrapper.style.width = '100%';
      wrapper.style.marginBottom = '1.5rem';
      table.parentElement?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
      // セル内テキストの折り返しを有効化
      table.querySelectorAll('td, th').forEach((cell) => {
        const el = cell as HTMLElement;
        el.style.wordBreak = 'break-word';
        el.style.overflowWrap = 'break-word';
        el.style.whiteSpace = 'normal';
        // 明示的な width が親を超えないよう制限
        el.style.maxWidth = '400px';
      });
    });

    // アラートボックスのスタイルを適用（Preline Alert風デザイン）
    const alertBoxes = contentRef.current.querySelectorAll('.wp-block-abb-alert-box');
    alertBoxes.forEach((alertBox) => {
      const dataAttr = alertBox.getAttribute('data-attributes');
      if (!dataAttr) return;

      try {
        const attrs = JSON.parse(dataAttr);
        const element = alertBox as HTMLElement;

        // typeに基づいてクラスを設定
        const alertType = attrs.type || 'info';

        // 既存のクラスをクリアしてから新しいクラスを追加
        element.className = `wp-block-abb-alert-box wp-alert-${alertType}`;

        // アイコンを追加
        if (attrs.icon?.svg && !element.querySelector('.wp-alert-icon')) {
          const iconWrapper = document.createElement('div');
          iconWrapper.className = 'wp-alert-icon';
          iconWrapper.innerHTML = attrs.icon.svg;

          element.insertBefore(iconWrapper, element.firstChild);
        }

        // メッセージテキストを追加
        if (attrs.message && !element.querySelector('.wp-alert-message')) {
          const messageWrapper = document.createElement('div');
          messageWrapper.className = 'wp-alert-message';
          messageWrapper.innerHTML = attrs.message;  // HTMLタグを解釈するためinnerHTMLを使用
          element.appendChild(messageWrapper);
        }
      } catch (err) {
        console.error('Failed to parse alert box attributes:', err);
      }
    });

    // Wiki.js アラートblockquote（is-info / is-success / is-warning / is-danger）のアイコンを注入
    const wikiAlertIcons: Record<string, string> = {
      'is-info': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
      'is-success': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="9 12 11 14 15 10"></polyline></svg>`,
      'is-warning': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
      'is-danger': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    };
    (['is-info', 'is-success', 'is-warning', 'is-danger'] as const).forEach((cls) => {
      contentRef.current!.querySelectorAll(`blockquote.${cls}`).forEach((bq) => {
        if (bq.querySelector('.wiki-alert-content')) return;
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'wiki-alert-content';
        while (bq.firstChild) contentWrapper.appendChild(bq.firstChild);
        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'wiki-alert-icon';
        iconWrapper.innerHTML = wikiAlertIcons[cls];
        bq.appendChild(iconWrapper);
        bq.appendChild(contentWrapper);
      });
    });

    // コードブロックにコピーボタンを追加
    const preElements = contentRef.current.querySelectorAll('pre');

    preElements.forEach((pre) => {
      // 既にボタンが追加されている場合はスキップ
      if (pre.querySelector('.copy-button')) return;

      // preを相対位置に設定
      pre.style.position = 'relative';

      // コピーボタンを作成
      const button = document.createElement('button');
      button.className = 'copy-button';
      button.type = 'button';
      button.innerHTML = `
        <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <svg class="check-icon hidden" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;

      // スタイルを追加
      Object.assign(button.style, {
        position: 'absolute',
        top: '0.75rem',
        right: '0.75rem',
        padding: '0.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        border: 'none',
        borderRadius: '0.375rem',
        cursor: 'pointer',
        color: '#9ca3af',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
      });

      // ホバー時のスタイル
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        button.style.color = '#ffffff';
      });
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        button.style.color = '#9ca3af';
      });

      // クリックイベント
      button.addEventListener('click', async () => {
        const code = pre.textContent || '';

        // navigator.clipboardが利用可能かチェック
        if (!navigator.clipboard) {
          console.error('Clipboard API is not available');
          return;
        }

        try {
          await navigator.clipboard.writeText(code);
          hapticSuccess();

          // アイコンを切り替え
          const copyIcon = button.querySelector('.copy-icon') as HTMLElement;
          const checkIcon = button.querySelector('.check-icon') as HTMLElement;

          if (copyIcon && checkIcon) {
            copyIcon.classList.add('hidden');
            checkIcon.classList.remove('hidden');
            button.style.color = '#10b981';

            setTimeout(() => {
              copyIcon.classList.remove('hidden');
              checkIcon.classList.add('hidden');
              button.style.color = '#9ca3af';
            }, 2000);
          }
        } catch (err) {
          console.error('Failed to copy code:', err);
        }
      });

      pre.appendChild(button);
    });

    // Wiki.js タブセット（.tabset）の初期化とクリックハンドラ
    // Wiki.js v2 は ul.tabset-tabs > li（is-active クラス）+ .tabset-panel（is-active クラス）構造を使用
    if (!document.getElementById('wiki-tabset-styles')) {
      const style = document.createElement('style');
      style.id = 'wiki-tabset-styles';
      style.textContent = `
        .tabset { margin: 1rem 0; border: 1px solid #e5e7eb; border-radius: 0.5rem; overflow: hidden; }
        .tabset-tabs { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; }
        .tabset-tabs > li { padding: 0.625rem 1rem; font-size: 0.875rem; font-weight: 500; color: #6b7280; cursor: pointer; user-select: none; transition: background 0.15s, color 0.15s; border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; }
        .tabset-tabs > li:hover { background: #e5e7eb; color: #374151; }
        .tabset-tabs > li.is-active { background: #ffffff; color: #d97706; border-bottom-color: #f59e0b; font-weight: 600; }
        .tabset-content { padding: 1rem; }
        .tabset-panel { display: none; }
        .tabset-panel.is-active { display: block; }
        .dark .tabset { border-color: #374151; }
        .dark .tabset-tabs { background: #1f2937; border-bottom-color: #374151; }
        .dark .tabset-tabs > li { color: #9ca3af; }
        .dark .tabset-tabs > li:hover { background: #374151; color: #d1d5db; }
        .dark .tabset-tabs > li.is-active { background: #111827; color: #fbbf24; border-bottom-color: #f59e0b; }
        .dark .tabset-content { background: #111827; }
      `;
      document.head.appendChild(style);
    }

    const tabsets = contentRef.current.querySelectorAll<HTMLElement>('.tabset');
    tabsets.forEach((tabset) => {
      const tabList = tabset.querySelector<HTMLElement>('.tabset-tabs');
      if (!tabList) return;
      const tabs = Array.from(tabList.querySelectorAll<HTMLElement>(':scope > li'));
      const panels = Array.from(tabset.querySelectorAll<HTMLElement>('.tabset-panel'));
      if (tabs.length === 0 || panels.length === 0) return;

      // is-active がどのタブにも付いていない場合、最初をアクティブにする
      if (!tabs.some((t) => t.classList.contains('is-active'))) {
        tabs[0]?.classList.add('is-active');
        panels[0]?.classList.add('is-active');
      }

      // クリックハンドラを登録（重複防止）
      tabs.forEach((tab, index) => {
        if (tab.dataset.tabInitialized) return;
        tab.dataset.tabInitialized = '1';

        tab.addEventListener('click', () => {
          tabs.forEach((t) => t.classList.remove('is-active'));
          panels.forEach((p) => p.classList.remove('is-active'));
          tab.classList.add('is-active');
          panels[index]?.classList.add('is-active');
        });
      });
    });
  }, [cleanedContent]);

  // Amberバリアントの場合、日本のブログ風デザインを適用
  if (variant === "amber") {
    return (
      <div
        ref={contentRef}
        className={`prose prose-lg max-w-none
          prose-headings:font-bold
          prose-h1:text-2xl md:prose-h1:text-3xl prose-h1:mt-12 prose-h1:mb-6 prose-h1:pb-3 prose-h1:border-b-4 prose-h1:border-double prose-h1:border-amber-500 prose-h1:text-gray-800 dark:prose-h1:text-white
          prose-h2:text-xl md:prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:px-4 prose-h2:py-3 prose-h2:rounded-md prose-h2:shadow-sm prose-h2:bg-amber-500 dark:prose-h2:bg-amber-600 prose-h2:text-white
          prose-h3:text-lg md:prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-h3:pb-2 prose-h3:pl-4 prose-h3:border-l-4 prose-h3:border-amber-300 dark:prose-h3:border-amber-600 prose-h3:text-gray-800 dark:prose-h3:text-white
          prose-h4:text-base md:prose-h4:text-lg prose-h4:mt-5 prose-h4:mb-2 prose-h4:text-gray-700 dark:prose-h4:text-gray-300
          prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4 prose-p:text-base
          prose-a:text-amber-600 dark:prose-a:text-amber-400 hover:prose-a:text-amber-800 dark:hover:prose-a:text-amber-300 prose-a:underline prose-a:decoration-2 prose-a:underline-offset-2
          prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-bold
          prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4 prose-ul:space-y-2 dark:prose-ul:text-gray-300
          prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4 prose-ol:space-y-2 dark:prose-ol:text-gray-300
          prose-li:text-gray-700 dark:prose-li:text-gray-300
          prose-td:text-gray-700 dark:prose-td:text-gray-300 prose-td:px-4 prose-td:py-2 prose-td:align-middle prose-td:!border-gray-300 dark:prose-td:!border-gray-600
          prose-th:text-gray-700 dark:prose-th:text-gray-300 prose-th:px-4 prose-th:py-2 prose-th:bg-gray-100 dark:prose-th:bg-gray-700 prose-th:!border-gray-300 dark:prose-th:!border-gray-600
          prose-table:!border-gray-300 dark:prose-table:!border-gray-600
          prose-thead:!border-gray-300 dark:prose-thead:!border-gray-600
          prose-tbody:!border-gray-300 dark:prose-tbody:!border-gray-600
          prose-tr:!border-gray-300 dark:prose-tr:!border-gray-600
          prose-img:rounded-lg prose-img:shadow-lg prose-img:my-6
          [&_.wp-caption]:max-w-full [&_.wp-caption]:w-auto [&_.wp-caption]:my-6
          [&_.wp-caption>img]:my-0
          [&_.wp-caption-text]:text-sm [&_.wp-caption-text]:text-gray-600 dark:[&_.wp-caption-text]:text-gray-400 [&_.wp-caption-text]:mt-2 [&_.wp-caption-text]:text-center [&_.wp-caption-text]:text-wrap-balance
          [&_.wp-block-image]:my-6
          [&_figure.wp-block-image]:max-w-full [&_figure.wp-block-image]:w-auto [&_figure.wp-block-image]:block
          [&_figure.wp-block-image>img]:my-0
          [&_figure.aligncenter]:block [&_figure.aligncenter]:mx-auto [&_figure.aligncenter]:text-center
          [&_figure.alignleft]:block [&_figure.alignleft]:mr-auto [&_figure.alignleft]:text-left
          [&_figure.alignright]:block [&_figure.alignright]:ml-auto [&_figure.alignright]:text-right
          [&_figcaption.wp-element-caption]:text-sm [&_figcaption.wp-element-caption]:text-gray-600 dark:[&_figcaption.wp-element-caption]:text-gray-400 [&_figcaption.wp-element-caption]:mt-2 [&_figcaption.wp-element-caption]:text-center [&_figcaption.wp-element-caption]:text-wrap-balance
          prose-blockquote:border-amber-500 prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-800 prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300
          [&_blockquote.is-info]:!bg-blue-50 [&_blockquote.is-info]:!border-blue-500 [&_blockquote.is-info]:text-blue-800 [&_blockquote.is-info]:!border-l-4 [&_blockquote.is-info]:!not-italic [&_blockquote.is-info]:!p-4 [&_blockquote.is-info]:rounded-r-lg [&_blockquote.is-info]:flex [&_blockquote.is-info]:items-start [&_blockquote.is-info]:gap-3 dark:[&_blockquote.is-info]:!bg-blue-500/10 dark:[&_blockquote.is-info]:!border-blue-400 dark:[&_blockquote.is-info]:text-blue-100
          [&_blockquote.is-success]:!bg-green-50 [&_blockquote.is-success]:!border-green-500 [&_blockquote.is-success]:text-green-800 [&_blockquote.is-success]:!border-l-4 [&_blockquote.is-success]:!not-italic [&_blockquote.is-success]:!p-4 [&_blockquote.is-success]:rounded-r-lg [&_blockquote.is-success]:flex [&_blockquote.is-success]:items-start [&_blockquote.is-success]:gap-3 dark:[&_blockquote.is-success]:!bg-green-500/10 dark:[&_blockquote.is-success]:!border-green-400 dark:[&_blockquote.is-success]:text-green-100
          [&_blockquote.is-warning]:!bg-amber-50 [&_blockquote.is-warning]:!border-amber-500 [&_blockquote.is-warning]:text-amber-800 [&_blockquote.is-warning]:!border-l-4 [&_blockquote.is-warning]:!not-italic [&_blockquote.is-warning]:!p-4 [&_blockquote.is-warning]:rounded-r-lg [&_blockquote.is-warning]:flex [&_blockquote.is-warning]:items-start [&_blockquote.is-warning]:gap-3 dark:[&_blockquote.is-warning]:!bg-amber-500/10 dark:[&_blockquote.is-warning]:!border-amber-400 dark:[&_blockquote.is-warning]:text-amber-100
          [&_blockquote.is-danger]:!bg-red-50 [&_blockquote.is-danger]:!border-red-500 [&_blockquote.is-danger]:text-red-800 [&_blockquote.is-danger]:!border-l-4 [&_blockquote.is-danger]:!not-italic [&_blockquote.is-danger]:!p-4 [&_blockquote.is-danger]:rounded-r-lg [&_blockquote.is-danger]:flex [&_blockquote.is-danger]:items-start [&_blockquote.is-danger]:gap-3 dark:[&_blockquote.is-danger]:!bg-red-500/10 dark:[&_blockquote.is-danger]:!border-red-400 dark:[&_blockquote.is-danger]:text-red-100
          [&_blockquote.is-info_.wiki-alert-icon]:text-blue-500 dark:[&_blockquote.is-info_.wiki-alert-icon]:text-blue-400
          [&_blockquote.is-success_.wiki-alert-icon]:text-green-500 dark:[&_blockquote.is-success_.wiki-alert-icon]:text-green-400
          [&_blockquote.is-warning_.wiki-alert-icon]:text-amber-500 dark:[&_blockquote.is-warning_.wiki-alert-icon]:text-amber-400
          [&_blockquote.is-danger_.wiki-alert-icon]:text-red-500 dark:[&_blockquote.is-danger_.wiki-alert-icon]:text-red-400
          [&_.wiki-alert-icon]:flex-shrink-0 [&_.wiki-alert-icon]:mt-0.5
          [&_.wiki-alert-content]:flex-1 [&_.wiki-alert-content]:min-w-0
          [&_.wiki-alert-content_p]:!my-0 [&_.wiki-alert-content_p]:text-sm [&_.wiki-alert-content_p]:leading-relaxed
          prose-code:bg-amber-50 dark:prose-code:bg-amber-900/30 dark:prose-code:text-amber-200 prose-code:text-amber-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm
          prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-gray-900 dark:prose-pre:bg-slate-800 prose-pre:text-gray-100 dark:prose-pre:text-gray-100 prose-pre:p-4 prose-pre:pr-12 prose-pre:rounded-lg prose-pre:shadow-md prose-pre:relative
          [&_.wp-block-abb-alert-box]:flex [&_.wp-block-abb-alert-box]:items-start [&_.wp-block-abb-alert-box]:gap-3 [&_.wp-block-abb-alert-box]:p-4 [&_.wp-block-abb-alert-box]:mb-6 [&_.wp-block-abb-alert-box]:rounded-lg [&_.wp-block-abb-alert-box]:border [&_.wp-block-abb-alert-box]:w-full
          [&_.wp-alert-icon]:flex-shrink-0 [&_.wp-alert-icon]:w-5 [&_.wp-alert-icon]:h-5 [&_.wp-alert-icon]:mt-0.5
          [&_.wp-alert-message]:flex-1 [&_.wp-alert-message]:text-sm [&_.wp-alert-message]:leading-relaxed [&_.wp-alert-message]:font-medium
          [&_.wp-alert-message_a]:underline [&_.wp-alert-message_a]:font-semibold
          [&_.wp-alert-info]:bg-blue-50 [&_.wp-alert-info]:border-blue-500 [&_.wp-alert-info]:text-blue-800 dark:[&_.wp-alert-info]:bg-blue-500/10 dark:[&_.wp-alert-info]:border-blue-400 dark:[&_.wp-alert-info]:text-blue-100
          [&_.wp-alert-info_.wp-alert-icon]:fill-blue-500 dark:[&_.wp-alert-info_.wp-alert-icon]:fill-blue-400
          [&_.wp-alert-success]:bg-green-50 [&_.wp-alert-success]:border-green-500 [&_.wp-alert-success]:text-green-800 dark:[&_.wp-alert-success]:bg-green-500/10 dark:[&_.wp-alert-success]:border-green-400 dark:[&_.wp-alert-success]:text-green-100
          [&_.wp-alert-success_.wp-alert-icon]:fill-green-500 dark:[&_.wp-alert-success_.wp-alert-icon]:fill-green-400
          [&_.wp-alert-warning]:bg-amber-50 [&_.wp-alert-warning]:border-amber-500 [&_.wp-alert-warning]:text-amber-800 dark:[&_.wp-alert-warning]:bg-amber-500/10 dark:[&_.wp-alert-warning]:border-amber-400 dark:[&_.wp-alert-warning]:text-amber-100
          [&_.wp-alert-warning_.wp-alert-icon]:fill-amber-500 dark:[&_.wp-alert-warning_.wp-alert-icon]:fill-amber-400
          [&_.wp-alert-error]:bg-red-50 [&_.wp-alert-error]:border-red-500 [&_.wp-alert-error]:text-red-800 dark:[&_.wp-alert-error]:bg-red-500/10 dark:[&_.wp-alert-error]:border-red-400 dark:[&_.wp-alert-error]:text-red-100
          [&_.wp-alert-error_.wp-alert-icon]:fill-red-500 dark:[&_.wp-alert-error_.wp-alert-icon]:fill-red-400
          [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:w-full [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:px-3 [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:py-2 [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:border [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:border-gray-300 [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:rounded-md [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:bg-white [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:text-gray-900 [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:text-sm [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:focus:outline-none [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:focus:ring-2 [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:focus:ring-amber-500 [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:focus:border-amber-500 dark:[&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:border-gray-600 dark:[&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:bg-neutral-700 dark:[&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:text-gray-100
          [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:border [&_textarea]:border-gray-300 [&_textarea]:rounded-md [&_textarea]:bg-white [&_textarea]:text-gray-900 [&_textarea]:text-sm [&_textarea]:focus:outline-none [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-amber-500 [&_textarea]:focus:border-amber-500 dark:[&_textarea]:border-gray-600 dark:[&_textarea]:bg-neutral-700 dark:[&_textarea]:text-gray-100
          [&_select]:w-full [&_select]:px-3 [&_select]:py-2 [&_select]:border [&_select]:border-gray-300 [&_select]:rounded-md [&_select]:bg-white [&_select]:text-gray-900 [&_select]:text-sm [&_select]:focus:outline-none [&_select]:focus:ring-2 [&_select]:focus:ring-amber-500 dark:[&_select]:border-gray-600 dark:[&_select]:bg-neutral-700 dark:[&_select]:text-gray-100
          [&_label]:block [&_label]:text-sm [&_label]:font-medium [&_label]:text-gray-700 [&_label]:mb-1 dark:[&_label]:text-gray-300
          [&_input[type="submit"]]:px-6 [&_input[type="submit"]]:py-2 [&_input[type="submit"]]:bg-amber-600 [&_input[type="submit"]]:text-white [&_input[type="submit"]]:rounded-md [&_input[type="submit"]]:font-medium [&_input[type="submit"]]:text-sm [&_input[type="submit"]]:cursor-pointer hover:[&_input[type="submit"]]:bg-amber-700
          [&_input[type="checkbox"]]:w-4 [&_input[type="checkbox"]]:h-4 [&_input[type="checkbox"]]:rounded [&_input[type="checkbox"]]:border-gray-300 [&_input[type="checkbox"]]:text-amber-600 [&_input[type="checkbox"]]:cursor-pointer
          [&_input[type="radio"]]:w-4 [&_input[type="radio"]]:h-4 [&_input[type="radio"]]:border-gray-300 [&_input[type="radio"]]:text-amber-600 [&_input[type="radio"]]:cursor-pointer
          [&_form]:space-y-4`}
        dangerouslySetInnerHTML={{ __html: cleanedContent }}
      />
    );
  }

  // Blueバリアント（ニュース記事）も同じブログ風デザインを適用（色は青系）
  return (
    <div
      ref={contentRef}
      className={`prose prose-lg max-w-none
        prose-headings:font-bold
        prose-h1:text-2xl md:prose-h1:text-3xl prose-h1:mt-12 prose-h1:mb-6 prose-h1:pb-3 prose-h1:border-b-4 prose-h1:border-double prose-h1:border-blue-500 prose-h1:text-gray-800 dark:prose-h1:text-white
        prose-h2:text-xl md:prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:px-4 prose-h2:py-3 prose-h2:rounded-md prose-h2:shadow-sm prose-h2:bg-cyan-500 dark:prose-h2:bg-cyan-600 prose-h2:text-white
        prose-h3:text-lg md:prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-h3:pb-2 prose-h3:pl-4 prose-h3:border-l-4 prose-h3:border-cyan-300 dark:prose-h3:border-cyan-600 prose-h3:text-gray-800 dark:prose-h3:text-white
        prose-h4:text-base md:prose-h4:text-lg prose-h4:mt-5 prose-h4:mb-2 prose-h4:text-gray-700 dark:prose-h4:text-gray-300
        prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4 prose-p:text-base
        prose-a:text-blue-600 dark:prose-a:text-blue-400 hover:prose-a:text-blue-800 dark:hover:prose-a:text-blue-300 prose-a:underline prose-a:decoration-2 prose-a:underline-offset-2
        prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-bold
        prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4 prose-ul:space-y-2 dark:prose-ul:text-gray-300
        prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4 prose-ol:space-y-2 dark:prose-ol:text-gray-300
        prose-li:text-gray-700 dark:prose-li:text-gray-300
        prose-td:text-gray-700 dark:prose-td:text-gray-300 prose-td:px-4 prose-td:py-2 prose-td:align-middle prose-td:!border-gray-300 dark:prose-td:!border-gray-600
        prose-th:text-gray-700 dark:prose-th:text-gray-300 prose-th:px-4 prose-th:py-2 prose-th:bg-gray-100 dark:prose-th:bg-gray-700 prose-th:!border-gray-300 dark:prose-th:!border-gray-600
        prose-table:!border-gray-300 dark:prose-table:!border-gray-600
        prose-thead:!border-gray-300 dark:prose-thead:!border-gray-600
        prose-tbody:!border-gray-300 dark:prose-tbody:!border-gray-600
        prose-tr:!border-gray-300 dark:prose-tr:!border-gray-600
        prose-img:rounded-lg prose-img:shadow-lg prose-img:my-6
        [&_.wp-caption]:max-w-full [&_.wp-caption]:w-auto [&_.wp-caption]:my-6
        [&_.wp-caption>img]:my-0
        [&_.wp-caption-text]:text-sm [&_.wp-caption-text]:text-gray-600 dark:[&_.wp-caption-text]:text-gray-400 [&_.wp-caption-text]:mt-2 [&_.wp-caption-text]:text-center [&_.wp-caption-text]:text-wrap-balance
        [&_.wp-block-image]:my-6
        [&_figure.wp-block-image]:max-w-full [&_figure.wp-block-image]:w-auto [&_figure.wp-block-image]:block
        [&_figure.wp-block-image>img]:my-0
        [&_figure.aligncenter]:block [&_figure.aligncenter]:mx-auto [&_figure.aligncenter]:text-center
        [&_figure.alignleft]:block [&_figure.alignleft]:mr-auto [&_figure.alignleft]:text-left
        [&_figure.alignright]:block [&_figure.alignright]:ml-auto [&_figure.alignright]:text-right
        [&_figcaption.wp-element-caption]:text-sm [&_figcaption.wp-element-caption]:text-gray-600 dark:[&_figcaption.wp-element-caption]:text-gray-400 [&_figcaption.wp-element-caption]:mt-2 [&_figcaption.wp-element-caption]:text-center [&_figcaption.wp-element-caption]:text-wrap-balance
        prose-blockquote:border-blue-500 prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-800 prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300
        [&_blockquote.is-info]:!bg-blue-50 [&_blockquote.is-info]:!border-blue-500 [&_blockquote.is-info]:text-blue-800 [&_blockquote.is-info]:!border-l-4 [&_blockquote.is-info]:!not-italic [&_blockquote.is-info]:!p-4 [&_blockquote.is-info]:rounded-r-lg [&_blockquote.is-info]:flex [&_blockquote.is-info]:items-start [&_blockquote.is-info]:gap-3 dark:[&_blockquote.is-info]:!bg-blue-500/10 dark:[&_blockquote.is-info]:!border-blue-400 dark:[&_blockquote.is-info]:text-blue-100
        [&_blockquote.is-success]:!bg-green-50 [&_blockquote.is-success]:!border-green-500 [&_blockquote.is-success]:text-green-800 [&_blockquote.is-success]:!border-l-4 [&_blockquote.is-success]:!not-italic [&_blockquote.is-success]:!p-4 [&_blockquote.is-success]:rounded-r-lg [&_blockquote.is-success]:flex [&_blockquote.is-success]:items-start [&_blockquote.is-success]:gap-3 dark:[&_blockquote.is-success]:!bg-green-500/10 dark:[&_blockquote.is-success]:!border-green-400 dark:[&_blockquote.is-success]:text-green-100
        [&_blockquote.is-warning]:!bg-amber-50 [&_blockquote.is-warning]:!border-amber-500 [&_blockquote.is-warning]:text-amber-800 [&_blockquote.is-warning]:!border-l-4 [&_blockquote.is-warning]:!not-italic [&_blockquote.is-warning]:!p-4 [&_blockquote.is-warning]:rounded-r-lg [&_blockquote.is-warning]:flex [&_blockquote.is-warning]:items-start [&_blockquote.is-warning]:gap-3 dark:[&_blockquote.is-warning]:!bg-amber-500/10 dark:[&_blockquote.is-warning]:!border-amber-400 dark:[&_blockquote.is-warning]:text-amber-100
        [&_blockquote.is-danger]:!bg-red-50 [&_blockquote.is-danger]:!border-red-500 [&_blockquote.is-danger]:text-red-800 [&_blockquote.is-danger]:!border-l-4 [&_blockquote.is-danger]:!not-italic [&_blockquote.is-danger]:!p-4 [&_blockquote.is-danger]:rounded-r-lg [&_blockquote.is-danger]:flex [&_blockquote.is-danger]:items-start [&_blockquote.is-danger]:gap-3 dark:[&_blockquote.is-danger]:!bg-red-500/10 dark:[&_blockquote.is-danger]:!border-red-400 dark:[&_blockquote.is-danger]:text-red-100
        [&_blockquote.is-info_.wiki-alert-icon]:text-blue-500 dark:[&_blockquote.is-info_.wiki-alert-icon]:text-blue-400
        [&_blockquote.is-success_.wiki-alert-icon]:text-green-500 dark:[&_blockquote.is-success_.wiki-alert-icon]:text-green-400
        [&_blockquote.is-warning_.wiki-alert-icon]:text-amber-500 dark:[&_blockquote.is-warning_.wiki-alert-icon]:text-amber-400
        [&_blockquote.is-danger_.wiki-alert-icon]:text-red-500 dark:[&_blockquote.is-danger_.wiki-alert-icon]:text-red-400
        [&_.wiki-alert-icon]:flex-shrink-0 [&_.wiki-alert-icon]:mt-0.5
        [&_.wiki-alert-content]:flex-1 [&_.wiki-alert-content]:min-w-0
        [&_.wiki-alert-content_p]:!my-0 [&_.wiki-alert-content_p]:text-sm [&_.wiki-alert-content_p]:leading-relaxed
        prose-code:bg-blue-50 dark:prose-code:bg-blue-900/30 dark:prose-code:text-blue-200 prose-code:text-blue-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm
        prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-gray-900 dark:prose-pre:bg-slate-800 prose-pre:text-gray-100 dark:prose-pre:text-gray-100 prose-pre:p-4 prose-pre:pr-12 prose-pre:rounded-lg prose-pre:shadow-md prose-pre:relative
        [&_.wp-block-abb-alert-box]:flex [&_.wp-block-abb-alert-box]:items-start [&_.wp-block-abb-alert-box]:gap-3 [&_.wp-block-abb-alert-box]:p-4 [&_.wp-block-abb-alert-box]:mb-6 [&_.wp-block-abb-alert-box]:rounded-lg [&_.wp-block-abb-alert-box]:border [&_.wp-block-abb-alert-box]:w-full
        [&_.wp-alert-icon]:flex-shrink-0 [&_.wp-alert-icon]:w-5 [&_.wp-alert-icon]:h-5 [&_.wp-alert-icon]:mt-0.5
        [&_.wp-alert-message]:flex-1 [&_.wp-alert-message]:text-sm [&_.wp-alert-message]:leading-relaxed [&_.wp-alert-message]:font-medium
        [&_.wp-alert-message_a]:underline [&_.wp-alert-message_a]:font-semibold
        [&_.wp-alert-info]:bg-blue-50 [&_.wp-alert-info]:border-blue-500 [&_.wp-alert-info]:text-blue-800 dark:[&_.wp-alert-info]:bg-blue-500/10 dark:[&_.wp-alert-info]:border-blue-400 dark:[&_.wp-alert-info]:text-blue-100
        [&_.wp-alert-info_.wp-alert-icon]:fill-blue-500 dark:[&_.wp-alert-info_.wp-alert-icon]:fill-blue-400
        [&_.wp-alert-success]:bg-green-50 [&_.wp-alert-success]:border-green-500 [&_.wp-alert-success]:text-green-800 dark:[&_.wp-alert-success]:bg-green-500/10 dark:[&_.wp-alert-success]:border-green-400 dark:[&_.wp-alert-success]:text-green-100
        [&_.wp-alert-success_.wp-alert-icon]:fill-green-500 dark:[&_.wp-alert-success_.wp-alert-icon]:fill-green-400
        [&_.wp-alert-warning]:bg-amber-50 [&_.wp-alert-warning]:border-amber-500 [&_.wp-alert-warning]:text-amber-800 dark:[&_.wp-alert-warning]:bg-amber-500/10 dark:[&_.wp-alert-warning]:border-amber-400 dark:[&_.wp-alert-warning]:text-amber-100
        [&_.wp-alert-warning_.wp-alert-icon]:fill-amber-500 dark:[&_.wp-alert-warning_.wp-alert-icon]:fill-amber-400
        [&_.wp-alert-error]:bg-red-50 [&_.wp-alert-error]:border-red-500 [&_.wp-alert-error]:text-red-800 dark:[&_.wp-alert-error]:bg-red-500/10 dark:[&_.wp-alert-error]:border-red-400 dark:[&_.wp-alert-error]:text-red-100
        [&_.wp-alert-error_.wp-alert-icon]:fill-red-500 dark:[&_.wp-alert-error_.wp-alert-icon]:fill-red-400
        [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:w-full [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:px-3 [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:py-2 [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:border [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:border-gray-300 [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:rounded-md [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:bg-white [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:text-gray-900 [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:text-sm [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:focus:outline-none [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:focus:ring-2 [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:focus:ring-blue-500 [&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:focus:border-blue-500 dark:[&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:border-gray-600 dark:[&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:bg-neutral-700 dark:[&_input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])]:text-gray-100
        [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:border [&_textarea]:border-gray-300 [&_textarea]:rounded-md [&_textarea]:bg-white [&_textarea]:text-gray-900 [&_textarea]:text-sm [&_textarea]:focus:outline-none [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-blue-500 [&_textarea]:focus:border-blue-500 dark:[&_textarea]:border-gray-600 dark:[&_textarea]:bg-neutral-700 dark:[&_textarea]:text-gray-100
        [&_select]:w-full [&_select]:px-3 [&_select]:py-2 [&_select]:border [&_select]:border-gray-300 [&_select]:rounded-md [&_select]:bg-white [&_select]:text-gray-900 [&_select]:text-sm [&_select]:focus:outline-none [&_select]:focus:ring-2 [&_select]:focus:ring-blue-500 dark:[&_select]:border-gray-600 dark:[&_select]:bg-neutral-700 dark:[&_select]:text-gray-100
        [&_label]:block [&_label]:text-sm [&_label]:font-medium [&_label]:text-gray-700 [&_label]:mb-1 dark:[&_label]:text-gray-300
        [&_input[type="submit"]]:px-6 [&_input[type="submit"]]:py-2 [&_input[type="submit"]]:bg-blue-600 [&_input[type="submit"]]:text-white [&_input[type="submit"]]:rounded-md [&_input[type="submit"]]:font-medium [&_input[type="submit"]]:text-sm [&_input[type="submit"]]:cursor-pointer hover:[&_input[type="submit"]]:bg-blue-700
        [&_input[type="checkbox"]]:w-4 [&_input[type="checkbox"]]:h-4 [&_input[type="checkbox"]]:rounded [&_input[type="checkbox"]]:border-gray-300 [&_input[type="checkbox"]]:text-blue-600 [&_input[type="checkbox"]]:cursor-pointer
        [&_input[type="radio"]]:w-4 [&_input[type="radio"]]:h-4 [&_input[type="radio"]]:border-gray-300 [&_input[type="radio"]]:text-blue-600 [&_input[type="radio"]]:cursor-pointer
        [&_form]:space-y-4`}
      dangerouslySetInnerHTML={{ __html: cleanedContent }}
    />
  );
};

// Wiki.js 由来コンテンツ用のレンダラー。
// 現状は WpContentRenderer のロジック（prose CSS / pre コピーボタン / TOC 抽出）が
// Wiki.js HTML にもそのまま適用可能なため、振る舞いを共有する薄いラッパー。
// Wiki.js 固有の処理が必要になったときはここで分岐させる。
export const WikiContentRenderer: React.FC<{ content: string | null | undefined; variant?: "blue" | "amber" }> = (props) => {
  return <WpContentRenderer {...props} />;
};
