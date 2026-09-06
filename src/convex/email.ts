import { action } from "./_generated/server";
import { v } from "convex/values";

export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (_ctx, { to, subject, html }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { ok: false, reason: "RESEND_API_KEY غير مضبوط" };
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ViP Yemen <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      return { ok: false, reason: `فشل الإرسال: ${res.status}` };
    }
    return { ok: true };
  },
});