// 🔐 مخزن إعدادات فيسبوك (mutations/queries عادية — لا node actions).
// الأسرار تُحفظ في جدول الإعدادات بمفاتيح موحّدة، ويُقرأ منها:
//   facebookAccessToken        توكن الصفحة المستخدم للنشر (لا ينتهي عادةً)
//   facebookPageId             معرّف الصفحة
//   facebookGroupId            معرّف المجموعة
//   facebookAppId              معرّف التطبيق (لتبديل التوكن آلياً)
//   facebookAppSecret          سرّ التطبيق (لتبديل التوكن آلياً)
//   facebookUserToken          التوكن طويل الأجل للمستخدم (للتجديد الآلي)
//   facebookUserTokenExpiresAt انتهاء توكن المستخدم (ms · 0 = لا ينتهي)
//   facebookTokenExpiresAt     انتهاء توكن الصفحة (ms · 0 = لا ينتهي)
//   facebookConnectedAt        وقت آخر ربط ناجح
//   facebookPageName           اسم الصفحة كما أكّدته Graph API
//   facebookLastError          آخر خطأ تحقق (للعرض في اللوحة)
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";
import { api, internal } from "./_generated/api";

export const KEYS = [
  "facebookAccessToken",
  "facebookPageId",
  "facebookGroupId",
  "facebookAppId",
  "facebookAppSecret",
  "facebookUserToken",
  "facebookUserTokenExpiresAt",
  "facebookTokenExpiresAt",
  "facebookConnectedAt",
  "facebookPageName",
  "facebookLastError",
  "facebookCanPost",
  "facebookPostingDetail",
] as const;

export type FacebookKey = (typeof KEYS)[number];

export interface FacebookConfig {
  facebookAccessToken?: string;
  facebookPageId?: string;
  facebookGroupId?: string;
  facebookAppId?: string;
  facebookAppSecret?: string;
  facebookUserToken?: string;
  facebookUserTokenExpiresAt?: number;
  facebookTokenExpiresAt?: number;
  facebookConnectedAt?: number;
  facebookPageName?: string;
  facebookLastError?: string;
  /** هل يمنح التوكن صلاحية النشر على الصفحة (pages_manage_posts)؟ */
  facebookCanPost?: boolean;
  facebookPostingDetail?: string;
}

async function readConfig(ctx: { db: any }): Promise<FacebookConfig> {
  const rows = await ctx.db.query("settings").collect();
  const out: FacebookConfig = {};
  for (const key of KEYS) {
    const row = rows.find((r: { key: string }) => r.key === key);
    if (row !== undefined) (out as Record<string, unknown>)[key] = row.value;
  }
  return out;
}

/** إعدادات فيسبوك (داخلي — بلا تحقق جلسة، يُستدعى من الأفعال الآلية). */
export const getConfigInternal = internalQuery({
  args: {},
  handler: async (ctx) => await readConfig(ctx),
});

/** حفظ مجموعة مفاتيح فيسبوك دفعة واحدة (داخلي). */
export const saveConfigInternal = internalMutation({
  args: { values: v.record(v.string(), v.any()) },
  handler: async (ctx, { values }) => {
    for (const [key, value] of Object.entries(values)) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (existing) await ctx.db.patch(existing._id, { value });
      else await ctx.db.insert("settings", { key, value });
    }
    return { ok: true, saved: Object.keys(values).length };
  },
});

/**
 * ♻️ تجديد توكن فيسبوك فوراً من لوحة التحكم (نفس مسار التجديد الذاتي).
 * يحتاج App ID + App Secret + توكن مستخدم طويل الأجل محفوظين — أي أنه يعمل
 * تلقائياً بعد أول ربط بالوضع «تبديل».
 */
export const refreshNow = action({
  args: { token: v.string() },
  handler: async (
    ctx,
    { token }
  ): Promise<{
    ok: boolean;
    renewed: boolean;
    reason?: string;
    error?: string;
    pageId?: string;
    pageName?: string;
    daysLeft?: number | null;
  }> => {
    // يرمي خطأً إن لم تكن الجلسة إدارية
    await ctx.runQuery(api.settings.getAll, { token });
    const result = (await ctx.runAction(internal.facebook.refreshTokenInternal, {
      force: true,
    })) as {
      ok: boolean;
      renewed: boolean;
      reason?: string;
      error?: string;
      pageId?: string;
      pageName?: string;
      daysLeft?: number | null;
    };
    return result;
  },
});

/**
 * 🔎 حالة ربط فيسبوك للمشرف — تعرض حالة التوكن ومدته المتبقية بلا كشف
 * قيمة أي سر (أول 4 أحرف فقط للتشخيص).
 */
export const getFacebookStatus = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const config = await readConfig(ctx);
    const accessToken = config.facebookAccessToken?.trim() ?? "";
    const now = Date.now();
    const expiresAt = config.facebookTokenExpiresAt ?? 0;
    const userExpiresAt = config.facebookUserTokenExpiresAt ?? 0;
    const daysLeft = expiresAt > 0 ? Math.ceil((expiresAt - now) / 86_400_000) : null;
    const userDaysLeft =
      userExpiresAt > 0 ? Math.ceil((userExpiresAt - now) / 86_400_000) : null;
    return {
      connected: accessToken.length > 0,
      tokenPrefix: accessToken.length > 4 ? `${accessToken.slice(0, 4)}…` : "",
      pageId: config.facebookPageId ?? "",
      pageName: config.facebookPageName ?? "",
      groupId: config.facebookGroupId ?? "",
      hasAppCredentials: !!(config.facebookAppId && config.facebookAppSecret),
      hasUserToken: !!config.facebookUserToken,
      autoRenew: !!(config.facebookAppId && config.facebookAppSecret && config.facebookUserToken),
      tokenExpiresAt: expiresAt || null,
      tokenDaysLeft: daysLeft,
      permanent: expiresAt === 0 && accessToken.length > 0,
      userTokenDaysLeft: userDaysLeft,
      connectedAt: config.facebookConnectedAt ?? null,
      lastError: config.facebookLastError ?? null,
      canPost: typeof config.facebookCanPost === "boolean" ? config.facebookCanPost : null,
      postingDetail: config.facebookPostingDetail ?? "",
    };
  },
});
