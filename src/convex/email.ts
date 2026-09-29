// ✉️ إرسال رسالة بريد واحدة — بنفس مزوّد الحملات (مفتاح من لوحة التحكم أو
// متغير البيئة)، ليبقى هناك مصدر واحد للإرسال في المنصة.
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, { to, subject, html }) => {
    const config = (await ctx.runQuery(internal.campaigns.getEmailSettingsInternal, {
      empty: true,
    })) as Record<string, unknown>;

    const key =
      (typeof config.emailProviderKey === "string" ? config.emailProviderKey.trim() : "") ||
      process.env.RESEND_API_KEY?.trim() ||
      "";
    if (!key) {
      return {
        ok: false,
        reason:
          "مزوّد البريد غير مهيأ — أدخل مفتاح المزوّد من لوحة التحكم ← «إعداد البريد الإلكتروني»",
      };
    }

    const fromName =
      (typeof config.emailFromName === "string" && config.emailFromName.trim()) || "ViP Yemen";
    const fromAddress =
      (typeof config.emailFromAddress === "string" && config.emailFromAddress.trim()) ||
      "onboarding@resend.dev";
    const replyTo = typeof config.emailReplyTo === "string" ? config.emailReplyTo.trim() : "";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromAddress}>`,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as any;
      return {
        ok: false,
        reason: data?.message ?? data?.error?.message ?? `فشل الإرسال: ${res.status}`,
      };
    }
    return { ok: true };
  },
});
