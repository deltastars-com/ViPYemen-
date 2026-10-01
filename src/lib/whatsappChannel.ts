// 💬 نشر في قناة واتساب (WhatsApp Channel) بالطريقة المعتمدة:
//    1. يفتح رابط قناة واتساب في نافذة جديدة.
//    2. ينسخ نص المنشور إلى الحافظة جاهزاً للّصق بنقرة واحدة.
//
// لا يحتاج أي توكن ولا Cloud API — يعمل في الويب والتطبيق الأصلي دائماً،
// وهو المسار الاحتياطي الدائم لنشر العروض والإعلانات على القناة.
import { openExternal } from "@/lib/utils";

/** الرابط الرسمي الحقيقي لقناة واتساب في هذا المشروع (Footer · /channels · صفحة القنوات). */
export const DEFAULT_WHATSAPP_CHANNEL_LINK = "https://chat.whatsapp.com/FWq6W6zHbDF8kgWlGHSMqb";

/** نموذج المعاينة — يُتجاهل إن حُفظ ليحل محل الرابط الرسمي. */
const SAMPLE_CHANNEL_LINK = "https://whatsapp.com/channel/0029VaYourChannelID";

/** رابط قناة الواتساب المحفوظ في إعدادات اللوحة (أو الرابط الرسمي الافتراضي). */
export function getWhatsAppChannelLink(): string {
  try {
    const saved = localStorage.getItem("vip_whatsapp_channel_link")?.trim() ?? "";
    if (saved && saved !== SAMPLE_CHANNEL_LINK) return saved;
  } catch {
    /* التخزين المحلي غير متاح */
  }
  return DEFAULT_WHATSAPP_CHANNEL_LINK;
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
