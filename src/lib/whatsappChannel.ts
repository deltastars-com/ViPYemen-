// 💬 نشر في قناة واتساب (WhatsApp Channel) بالطريقة المعتمدة:
//    1. يفتح رابط قناة واتساب في نافذة جديدة.
//    2. ينسخ نص المنشور إلى الحافظة جاهزاً للّصق بنقرة واحدة.
//
// لا يحتاج أي توكن ولا Cloud API — يعمل في الويب والتطبيق الأصلي دائماً،
// وهو المسار الاحتياطي الدائم لنشر العروض والإعلانات على القناة.
import { openExternal } from "@/lib/utils";

export const DEFAULT_WHATSAPP_CHANNEL_LINK = "https://whatsapp.com/channel/0029VaYourChannelID";

/** رابط قناة الواتساب المحفوظ في إعدادات اللوحة (أو الرابط الافتراضي). */
export function getWhatsAppChannelLink(): string {
  try {
    return localStorage.getItem("vip_whatsapp_channel_link") || DEFAULT_WHATSAPP_CHANNEL_LINK;
  } catch {
    return DEFAULT_WHATSAPP_CHANNEL_LINK;
  }
}

/** يحفظ رابط قناة الواتساب (يُستدعى من بطاقة إعدادات واتساب). */
export function setWhatsAppChannelLink(link: string): void {
  try {
    localStorage.setItem("vip_whatsapp_channel_link", link.trim());
  } catch {
    /* التخزين المحلي غير متاح — نتجاهل بهدوء */
  }
}

/**
 * ينشر نصاً على قناة واتساب: يفتح الرابط وينسخ النص في نفس اللحظة —
 * المشرف يلصق النص في القناة بنقرة واحدة (Ctrl/Cmd+V).
 */
export async function publishToWhatsAppChannel(
  text: string,
  channelLink?: string
): Promise<void> {
  const link = (channelLink ?? getWhatsAppChannelLink()).trim() || DEFAULT_WHATSAPP_CHANNEL_LINK;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* Clipboard قد يُمنع في بعض الأجهزة — تجاهل واستمر بفتح الرابط */
  }
  window.open(link, "_blank", "noopener,noreferrer");
}

/** نص موحّد للعروض جاهز للنشر في القناة. */
export function buildWhatsAppChannelMessage(
  title: string,
  priceLine?: string,
  link?: string
): string {
  const parts = [`🔥 عرض جديد في ViP Yemen`, title];
  if (priceLine) parts.push(priceLine);
  if (link) parts.push(link);
  return parts.join("\n");
}
