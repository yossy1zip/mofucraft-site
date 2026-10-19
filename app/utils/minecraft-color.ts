/**
 * Minecraft カラーコードを HTML カラーに変換するユーティリティ
 */

// Minecraft の標準カラーコードマッピング（&0 から &f）
const COLOR_CODE_MAP: { [key: string]: string } = {
  '0': '#000000', // 黒
  '1': '#0000AA', // 濃い青
  '2': '#00AA00', // 濃い緑
  '3': '#00AAAA', // 濃いシアン
  '4': '#AA0000', // 濃い赤
  '5': '#AA00AA', // 濃い紫
  '6': '#FFAA00', // 金色
  '7': '#AAAAAA', // 灰色
  '8': '#555555', // 濃い灰色
  '9': '#5555FF', // 青
  'a': '#55FF55', // 緑
  'b': '#55FFFF', // シアン
  'c': '#FF5555', // 赤
  'd': '#FF55FF', // マゼンタ
  'e': '#FFFF55', // 黄色
  'f': '#FFFFFF', // 白
};

// フォーマットコード
const FORMAT_CODE_MAP: { [key: string]: string } = {
  'l': 'font-weight: bold',         // 太字
  'm': 'text-decoration: line-through', // 打ち消し線
  'n': 'text-decoration: underline',    // 下線
  'o': 'font-style: italic',            // イタリック
  'r': 'reset',                         // リセット
};

export interface MinecraftTextSegment {
  text: string;
  color?: string;
  bold?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  italic?: boolean;
}

/**
 * Minecraft カラーコード付きテキストをパースして、セグメントの配列に変換
 * &6テキスト や &#FFFFFFテキスト のような形式に対応
 */
export function parseMinecraftText(text: string): MinecraftTextSegment[] {
  const segments: MinecraftTextSegment[] = [];
  let currentSegment: MinecraftTextSegment = { text: '' };

  let i = 0;
  while (i < text.length) {
    if (text[i] === '&' && i + 1 < text.length) {
      // 現在のセグメントにテキストがあれば保存
      if (currentSegment.text) {
        segments.push({ ...currentSegment });
        currentSegment = {
          text: '',
          color: currentSegment.color,
          bold: currentSegment.bold,
          strikethrough: currentSegment.strikethrough,
          underline: currentSegment.underline,
          italic: currentSegment.italic,
        };
      }

      const nextChar = text[i + 1];

      // 16進数カラーコード &#FFFFFF の形式
      if (nextChar === '#' && i + 8 <= text.length) {
        const hexColor = text.substring(i + 2, i + 8);
        if (/^[0-9A-Fa-f]{6}$/.test(hexColor)) {
          currentSegment.color = '#' + hexColor.toUpperCase();
          i += 8;
          continue;
        }
      }

      // 標準カラーコード &0-f
      const lowerNextChar = nextChar.toLowerCase();
      if (COLOR_CODE_MAP[lowerNextChar]) {
        currentSegment.color = COLOR_CODE_MAP[lowerNextChar];
        i += 2;
        continue;
      }

      // フォーマットコード &l, &m, &n, &o, &r
      if (FORMAT_CODE_MAP[lowerNextChar]) {
        if (lowerNextChar === 'r') {
          // リセット
          currentSegment = { text: '' };
        } else if (lowerNextChar === 'l') {
          currentSegment.bold = true;
        } else if (lowerNextChar === 'm') {
          currentSegment.strikethrough = true;
        } else if (lowerNextChar === 'n') {
          currentSegment.underline = true;
        } else if (lowerNextChar === 'o') {
          currentSegment.italic = true;
        }
        i += 2;
        continue;
      }
    }

    // 通常の文字を追加
    currentSegment.text += text[i];
    i++;
  }

  // 最後のセグメントを追加
  if (currentSegment.text) {
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * セグメントから CSS スタイルを生成
 */
export function segmentToStyle(segment: MinecraftTextSegment): React.CSSProperties {
  const style: React.CSSProperties = {};

  if (segment.color) {
    style.color = segment.color;
  }
  if (segment.bold) {
    style.fontWeight = 'bold';
  }
  if (segment.strikethrough && segment.underline) {
    style.textDecoration = 'line-through underline';
  } else if (segment.strikethrough) {
    style.textDecoration = 'line-through';
  } else if (segment.underline) {
    style.textDecoration = 'underline';
  }
  if (segment.italic) {
    style.fontStyle = 'italic';
  }

  return style;
}

/**
 * 最初のカラーコードの色を抽出（prefix の背景色を調整するのに使用）
 */
export function extractFirstColor(text: string): string | null {
  const segments = parseMinecraftText(text);
  for (const segment of segments) {
    if (segment.color) {
      return segment.color;
    }
  }
  return null;
}

/**
 * カラーコードを除去したプレーンテキストを取得
 */
export function stripColorCodes(text: string): string {
  return text.replace(/&[0-9a-fA-FlmnorLMNOR#]/g, '').replace(/&#[0-9A-Fa-f]{6}/g, '');
}
