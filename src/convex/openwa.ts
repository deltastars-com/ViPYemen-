/**
 * 🔌 بوابة OpenWA المجانية — WhatsApp API Gateway مفتوح المصدر
 * (https://github.com/rmyndharis/OpenWA)
 *
 * بديل مجاني بالكامل عن WhatsApp Cloud API المدفوع: خادم NestJS + Docker
 * يعمل على Render/Docker free مع جلسة واتساب واحدة (QR أو رمز اقتران)،
 * ويستقبل الرسائل عبر `POST /api/sessions/:id/messages/send-text`
 * بترويسة `X-API-Key`.
 *
 * الإعدادات تُحفظ في جدول settings (لوحة التحكم ← الإعدادات ← واتساب):
 *   openwaBaseUrl    — مثل https://openwa.onrender.com
 *   openwaApiKey     — مفتاح API من لوحة OpenWA (دور OPERATOR)
 *   openwaSessionId  — معرّف جلسة UUID من POST /api/sessions
 */
import { v, ConvexError } from "convex/values";
import { action, internalQuery, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { requireAdmin } from "./auth";

export const KEYS = ["openwaBaseUrl", "openwaApiKey", "openwaSessionId"] as const;

export interface OpenWAConfig {
  baseUrl: string;
  apiKey: string;
  sessionId: string;
}

export function isOpenWAConfigured(cfg: OpenWAConfig): boolean {
  return !!cfg.baseUrl && !!cfg.apiKey && !!cfg.sessionId;
}

async function readConfig(ctx: QueryCtx | MutationCtx): Promise<OpenWAConfig> {
  const rows = await ctx.db.query("settings").collect();
  const get = (key: string): string => {
    const row = rows.find((r) => r.key === key);
    return typeof row?.value === "string" ? row.value.trim() : "";
  };
  return { baseUrl: get("openwaBaseUrl"), apiKey: get("openwaApiKey"), sessionId: get("openwaSessionId") };
}

/** قراءة إعدادات البوابة من دورة الأتمتة/النشر (داخلي). */
export const getConfigInternal = internalQuery({
  args: {},
  handler: async (ctx): Promise<OpenWAConfig> => readConfig(ctx),
});

/** حفظ إعدادات البوابة من لوحة التحكم. */
export const saveConfig = mutation({
  args: {
    token: v.string(),
    baseUrl: v.string(),
    apiKey: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, { token, baseUrl, apiKey, sessionId }): Promise<{ ok: true }> => {
    await requireAdmin(ctx, token);
    const url = baseUrl.trim().replace(/\/+$/, "");
    if (url && !/^https?:\/\//i.test(url)) {
      throw new ConvexError("رابط البوابة يجب أن يبدأ بـ http(s)://");
    }
    const values: Record<string, string> = {
      openwaBaseUrl: url,
      openwaApiKey: apiKey.trim(),
      openwaSessionId: sessionId.trim(),
    };
    for (const [key, value] of Object.entries(values)) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (existing) await ctx.db.patch(existing._id, { value });
      else await ctx.db.insert("settings", { key, value });
    }
    return { ok: true };
  },
});

/** اختبار الاتصال بالبوابة: يعرض الجلسات المتاحة وزمن الاستجابة. */
export const testConnection = action({
  args: { baseUrl: v.string(), apiKey: v.string() },
  handler: async (
    _ctx,
    { baseUrl, apiKey }
  ): Promise<{ ok: boolean; message: string; latencyMs?: number }> => {
    const base = baseUrl.trim().replace(/\/+$/, "");
    if (!base || !apiKey.trim()) {
      return { ok: false, message: "أدخل رابط البوابة ومفتاح API أولاً." };
    }
    const started = Date.now();
    try {
      const res = await fetch(`${base}/api/sessions?limit=5`, {
        headers: { "X-API-Key": apiKey.trim(), Accept: "application/json" },
      });
      const latencyMs = Date.now() - started;
      const text = await res.text();
      let data: unknown = null;
      try {
        data = JSON.parse(text);
      } catch {
        /* استجابة غير JSON */
      }
      if (res.ok) {
        const sessions = Array.isArray(data) ? data.length : 0;
        return {
          ok: true,
          latencyMs,
          message: `✅ متصل بالبوابة — ${sessions} جلسة متاحة · ${latencyMs}ms`,
        };
      }
      const errText = (data as any)?.message ?? text.slice(0, 160) ?? res.statusText;
      return { ok: false, latencyMs, message: `البوابة رفضت الاتصال (${res.status}): ${errText}` };
    } catch (err) {
      return {
        ok: false,
        message: `تعذّر الوصول إلى البوابة — تأكد من الرابط وأن الخادم يعمل (${err instanceof Error ? err.message : "خطأ شبكة"})`,
      };
    }
  },
});
