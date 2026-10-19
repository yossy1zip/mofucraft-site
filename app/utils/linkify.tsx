import React from "react";

/**
 * テキスト内のURLを検出してクリック可能なリンクに変換する
 * Discord URLは「Discordリンク」、mofucraft.net URLは「ニュースリンク」と表示
 */
export function linkifyText(text: string): React.ReactNode[] {
  // URL検出用の正規表現
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    // マッチ前のテキストを追加
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const url = match[0];
    let linkText = url;

    // URLの種類に応じてリンクテキストを変更
    if (url.includes('discord.com') || url.includes('discord.gg')) {
      linkText = 'Discordリンク';
    } else if (url.includes('mofucraft.net')) {
      linkText = 'ニュースリンク';
    }

    // リンクを追加
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
        onClick={(e) => e.stopPropagation()}
      >
        {linkText}
      </a>
    );

    lastIndex = match.index + url.length;
  }

  // 残りのテキストを追加
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
