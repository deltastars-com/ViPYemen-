// 💬 مساعدات رسائل واتساب (وحدة نقية بلا أي تسجيل دوال Convex) — تُستورَد من
// ملف قناة الواتساب (whatsapp.ts) ومن ناشر القنوات (channels.ts) بأمان.

/** يوحّد الأرقام: يقبل +967… أو 00967… أو أرقاماً محلية ويُرجع صيغة E.164 بلا +. */
export function normalizeRecipients(input: string[]): string[] {
  const out = new Set<string>();
  for (const raw of input) {
    for (const piece of String(raw).split(/[,،\s;]+/)) {
      let n = piece.replace(/[^\d+]/g, "");
      if (!n) continue;
      if (n.startsWith("+")) n = n.slice(1);
      if (n.startsWith("00")) n = n.slice(2);
      if (n.startsWith("0")) n = `967${n.slice(1)}`;
      if (n.length < 8) continue;
      out.add(n);
    }
  }
  return [...out];
}

/**
 * يبني جسم رسالة واتساب:
 *  • قالب مُعتمد (template) عند وجود اسم قالب — وهو المسار الدائم الذي لا
 *    يتأثر بقاعدة الـ 24 ساعة، بمعامل واحد {{1}} يحتوي نص المنشور.
 *  • وإلا رسالة حرة (free-form) — تُسلَّم فقط خلال 24 ساعة من آخر رسالة واردة.
 */
export function buildMessageBody(
  to: string,
  text: string,
  templateName?: string,
  templateLang?: string
): Record<string, unknown> {
  if (templateName) {
    return {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: templateLang || "ar" },
        components: [
          { type: "body", parameters: [{ type: "text", text: text.slice(0, 1024) }] },
        ],
      },
    };
  }
  return {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text.slice(0, 4096) },
  };
}
