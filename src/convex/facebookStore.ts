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
//   facebookTokenType          نوع التوكن المخزّن: PAGE (دائم) أو USER (ينتهي)
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
  "facebookTokenType",
  "facebookLastProbeAt",
  "facebookRenewAttemptAt",
  "facebookTokenAppId",
  "facebookTokenAppName",
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
  /** نوع التوكن المخزّن كما أفادت Graph API: PAGE (دائم) أو USER (ينتهي). */
  facebookTokenType?: string;
  /** وقت آخر اختبار نشر فعلي (منشور مخفي يُحذف فوراً) — ms. */
  facebookLastProbeAt?: number;
  /** وقت آخر محاولة تجديد التوكن — لمنع تكرار المحاولة الفاشلة. */
  facebookRenewAttemptAt?: number;
  /** معرّف التطبيق المالك للتوكن — يُستخرج آلياً من debug_token. */
  facebookTokenAppId?: string;
  /** اسم التطبيق المالك للتوكن — للعرض فقط. */
  facebookTokenAppName?: string;
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
    // أسماء متغيرات البيئة — قيم منطقية فقط، لا تُكشف أي قيمة سرية.
    const envAppId = (process.env.FACEBOOK_APP_ID ?? "").trim();
    const envAppSecret = (process.env.FACEBOOK_APP_SECRET ?? "").trim();
    const appCredsInEnv = envAppId.length > 0 && envAppSecret.length > 0;
    const accessTokenInEnv = (process.env.FACEBOOK_ACCESS_TOKEN ?? "").trim().length > 0;
    const pageTokenInEnv = (process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "").trim().length > 0;

    // قائمة تحقق التفعيل — كل بند بحالة صريحة ليعرف المشرف الناقص بالضبط.
    const activation = [
      {
        id: "env-token",
        label: "توكن فيسبوك متاح للنظام",
        state: accessToken.length > 0 || accessTokenInEnv || pageTokenInEnv ? "ok" : "fail",
        detail:
          accessToken.length > 0 || accessTokenInEnv || pageTokenInEnv
            ? accessToken.length > 0
              ? "محفوظ في المنصة"
              : "موجود في متغيرات Convex"
            : "أضف FACEBOOK_ACCESS_TOKEN في Convex Dashboard ← Settings ← Environment Variables",
      },
      {
        id: "token-permanent",
        label: "التوكن لا ينتهي (توكن صفحة دائم)",
        state: expiresAt === 0 && accessToken.length > 0 ? "ok" : "warn",
        detail:
          expiresAt === 0 && accessToken.length > 0
            ? config.facebookTokenType === "PAGE"
              ? "توكن صفحة دائم"
              : "لا ينتهي"
            : daysLeft !== null
              ? `ينتهي خلال ${daysLeft} يوماً`
              : "غير مثبّت بعد",
      },
      {
        id: "posting-permission",
        label: "صلاحية النشر pages_manage_posts",
        state: config.facebookCanPost === true ? "ok" : config.facebookCanPost === false ? "fail" : "warn",
        detail:
          config.facebookCanPost === true
            ? "ممنوحة — النشر التلقائي يعمل"
            : config.facebookCanPost === false
              ? config.facebookPostingDetail || "غير ممنوحة — أعد توليد التوكن مع تحديد pages_manage_posts"
              : "ستُتأكد عند أول نشر فعلي (توكن صفحة لا تُقرأ صلاحياته من debug_token)",
      },
      {
        id: "app-credentials",
        label: "App ID + App Secret (التبديل والتجديد الذاتي)",
        state: config.facebookAppId && config.facebookAppSecret ? "ok" : appCredsInEnv ? "warn" : "fail",
        detail:
          config.facebookAppId && config.facebookAppSecret
            ? "محفوظان — التجديد الذاتي ممكن"
            : config.facebookAppId && !config.facebookAppSecret
              ? `معرّف التطبيق مُستخرج آلياً (${config.facebookTokenAppName || config.facebookAppId}) — المتبقي: سرّ التطبيق FACEBOOK_APP_SECRET في متغيرات Convex`
              : appCredsInEnv
                ? "موجودان في متغيرات Convex — سيُستوردان في الدورة القادمة (٥ دقائق)"
                : "أضف FACEBOOK_APP_SECRET في متغيرات Convex (معرّف التطبيق يُستخرج آلياً من التوكن)",
      },
      {
        id: "posting-probe",
        label: "اختبار النشر الفعلي (منشور مخفي يُحذف) — الحكم القاطع",
        state: config.facebookCanPost === true ? "ok" : config.facebookCanPost === false ? "fail" : "warn",
        detail:
          config.facebookCanPost === true
            ? "نجح الاختبار الفعلي — النشر على الصفحة ممكن"
            : config.facebookLastProbeAt
              ? `${config.facebookPostingDetail || "لم ينجح"} (آخر اختبار: ${new Date(config.facebookLastProbeAt).toISOString().slice(0, 16).replace("T", " ")} UTC)`
              : "لم يُجرَ بعد — سيُجرى آلياً كل ٦ ساعات، ويمكن تشغيله فوراً بزر «اختبار النشر الفعلي»",
      },
      {
        id: "auto-renew",
        label: "التجديد التلقائي الدائم",
        state:
          !!config.facebookAppId && !!config.facebookAppSecret && !!config.facebookUserToken
            ? "ok"
            : "warn",
        detail:
          !!config.facebookAppId && !!config.facebookAppSecret && !!config.facebookUserToken
            ? `مُفعّل${userDaysLeft !== null ? ` — توكن المستخدم يبقى ${userDaysLeft} يوماً ويُجدَّد آلياً` : ""}`
            : config.facebookTokenType === "PAGE" && accessToken.length > 0
              ? "غير مطلوب: توكن الصفحة الدائم لا ينتهي فلا يحتاج تبديلاً"
              : "يُفعَّل تلقائياً عند أول تبديل ناجح (App ID + Secret + توكن مستخدم)",
      },
    ];

    return {
      connected: accessToken.length > 0,
      tokenPrefix: accessToken.length > 4 ? `${accessToken.slice(0, 4)}…` : "",
      tokenType: config.facebookTokenType ?? "",
      appCredsInEnv,
      accessTokenInEnv,
      pageTokenInEnv,
      activation,
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
