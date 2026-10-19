/**
 * web-haptics を使ったハプティックフィードバック（触覚フィードバック）ユーティリティ
 *
 * モバイルデバイスでボタンタップやインタラクション時に振動フィードバックを提供する。
 * iOSのVibration API非対応もweb-hapticsが内部的にワークアラウンドで対応。
 * デスクトップなど非対応デバイスでは何も起きない。
 */

import { WebHaptics } from "web-haptics";

let instance: InstanceType<typeof WebHaptics> | null = null;

function getHaptics(): InstanceType<typeof WebHaptics> | null {
  if (typeof window === "undefined") return null;
  if (!instance) {
    instance = new WebHaptics();
  }
  return instance;
}

/** 軽いタップ（ボタン、リンク） */
export function hapticTap() {
  getHaptics()?.trigger(10);
}

/** 中程度のフィードバック（トグル切替、メニュー開閉） */
export function hapticToggle() {
  getHaptics()?.trigger("nudge");
}

/** 成功フィードバック（フォーム送信完了など） */
export function hapticSuccess() {
  getHaptics()?.trigger("success");
}
