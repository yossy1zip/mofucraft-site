import React from "react";

interface SpeechBubbleProps {
  /** アバター画像のURL（Minecraft UUIDまたは直接URL） */
  avatarUrl: string;
  /** アバター画像のalt属性 */
  avatarAlt: string;
  /** アバター下に表示するラベル（例: "鯖主", "管理者"） */
  avatarLabel?: string;
  /** アバターラベルの色（Tailwindクラス） */
  avatarLabelColor?: string;
  /** メッセージのタイトル */
  title: string;
  /** メッセージの本文 */
  message: string;
  /** 署名（メッセージ下部に表示） */
  signature?: string;
  /** 吹き出しの背景色（Tailwindクラス）デフォルト: "bg-white dark:bg-neutral-700" */
  bubbleBgColor?: string;
  /** 吹き出しの枠線色（Tailwindクラス）デフォルト: "border-teal-200 dark:border-teal-700" */
  bubbleBorderColor?: string;
  /** 署名の文字色（Tailwindクラス）デフォルト: "text-teal-600 dark:text-teal-400" */
  signatureColor?: string;
  /** 吹き出しの最大幅（Tailwindクラス）デフォルト: "max-w-md" */
  maxWidth?: string;
}

/**
 * アバターと吹き出しを表示するコンポーネント
 *
 * @example
 * ```tsx
 * <SpeechBubble
 *   avatarUrl="https://mc-heads.net/avatar/ExampleAdmin/64"
 *   avatarAlt="ExampleAdmin"
 *   avatarLabel="鯖主"
 *   avatarLabelColor="text-red-600 dark:text-red-400"
 *   title="心より感謝申し上げます！"
 *   message="皆様のご支援により、MOFUCRAFTは運営を続けることができています。"
 *   signature="- ExampleAdmin (サーバー管理者)"
 * />
 * ```
 */
export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  avatarUrl,
  avatarAlt,
  avatarLabel,
  avatarLabelColor = "text-gray-600 dark:text-gray-400",
  title,
  message,
  signature,
  bubbleBgColor = "bg-white dark:bg-neutral-700",
  bubbleBorderColor = "border-teal-200 dark:border-teal-700",
  signatureColor = "text-teal-600 dark:text-teal-400",
  maxWidth = "max-w-md"
}) => {
  // アバターURLがMinecraft UUIDの場合とそうでない場合を判定
  const isMinecraftUuid = !avatarUrl.startsWith('http');
  const finalAvatarUrl = isMinecraftUuid
    ? `https://mc-heads.net/avatar/${avatarUrl}/64`
    : avatarUrl;

  // 吹き出しの三角形の色を抽出（背景色と枠線色から）
  const triangleBgColor = bubbleBgColor.includes('dark:')
    ? bubbleBgColor.split('dark:')[1].replace('bg-', 'border-r-')
    : bubbleBgColor.replace('bg-', 'border-r-');

  const triangleBorderColor = bubbleBorderColor.includes('dark:')
    ? bubbleBorderColor.split('dark:')[1].replace('border-', 'border-r-')
    : bubbleBorderColor.replace('border-', 'border-r-');

  return (
    <div className="flex items-start gap-4">
      {/* アバター部分 */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1">
        <div className={`w-16 h-16 rounded-lg shadow-lg border-2 ${bubbleBorderColor} overflow-hidden`}>
          <img
            src={finalAvatarUrl}
            alt={avatarAlt}
            className="w-full h-full object-cover"
          />
        </div>
        {avatarLabel && (
          <span className={`text-xs font-bold ${avatarLabelColor}`}>
            {avatarLabel}
          </span>
        )}
      </div>

      {/* 吹き出し部分 */}
      <div className={`relative ${bubbleBgColor} rounded-lg shadow-lg border-2 ${bubbleBorderColor} p-4 ${maxWidth}`}>
        {/* 吹き出しの三角形（内側） */}
        <div className={`absolute left-0 top-6 w-0 h-0 border-r-8 ${triangleBgColor} border-t-8 border-t-transparent border-b-8 border-b-transparent transform -translate-x-2`}></div>

        {/* 吹き出しの三角形（外側・枠線） */}
        <div className={`absolute left-0 top-6 w-0 h-0 border-r-8 ${triangleBorderColor} border-t-8 border-t-transparent border-b-8 border-b-transparent transform -translate-x-2.5`}></div>

        {/* タイトル */}
        <p className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
          {title}
        </p>

        {/* メッセージ本文 */}
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {message}
        </p>

        {/* 署名 */}
        {signature && (
          <p className={`text-xs ${signatureColor} mt-2 font-medium`}>
            {signature}
          </p>
        )}
      </div>
    </div>
  );
};
