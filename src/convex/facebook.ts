"use node";

// 🔗 ربط فيسبوك بتوكن طويل الأجل — تبديل آلي وتجديد ذاتي
//
// المشكلة: توكن Graph API Explorer ينتهي بعد ساعة، وتوكن المستخدم طويل الأجل
// بعد 60 يوماً — وعندها يتوقف النشر على الصفحة والمجموعة.
//
// الحل هنا (خطوتان آليتان لا تحتاج أي عمل يدوي متكرر):
//   1. «تبديل»: نأخذ توكن قصير الأجل + معرّف التطبيق وسرّه، ونبدله بتوكن
//      مستخدم طويل الأجل (60 يوماً)، ثم نستخرج منه توكن الصفحة — وتوكن الصفحة
//      المستخرج من توكن مستخدم طويل الأجل **لا ينتهي**.
//   2. «تجديد ذاتي»: نحفظ توكن المستخدم طويل الأجل، وعند اقتراب انتهائه
//      (أقل من 20 يوماً) يجدّده النظام تلقائياً ويعيد استخراج توكن الصفحة،
//      ويُشعر الإدارة بالنتيجة — فلا تتوقف قناة فيسبوك أبداً.
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { FacebookConfig } from "./facebookStore";

const GRAPH = "https://graph.facebook.com/v21.0";
const RENEW_WINDOW_DAYS = 20;
const DAY = 86_400_000;

interface GraphResult {
  ok: boolean;
  status: number;
  data: any;
  error?: string;
}

async function graphGet(path: string, params: Record<string, string>): Promise<GraphResult> {
  const url = new URL(`${GRAPH}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  try {
    const res = await fetch(url, { cache: "no-store" as RequestCache });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) {
      return {
        ok: false,
        status: res.status,
        data,
        error: data?.error?.message ?? `HTTP ${res.status}`,
      };
    }
    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 0, data: {}, error: err?.message ?? String(err) };
  }
}

/** يبدّل توكن قصير الأجل بتوكن مستخدم طويل الأجل (60 يوماً). */
async function exchangeForLongLived(
  appId: string,
  appSecret: string,
  shortToken: string
): Promise<{ token?: string; expiresAt?: number; error?: string }> {
  const res = await graphGet("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  });
  if (!res.ok || !res.data?.access_token) {
    return { error: res.error ?? "تعذر تبديل التوكن — تحقق من معرّف التطبيق وسرّه وصلاحية التوكن" };
  }
  const expiresIn = Number(res.data.expires_in ?? 0);
  return {
    token: res.data.access_token as string,
    expiresAt: expiresIn > 0 ? Date.now() + expiresIn * 1000 : 0,
  };
}

/** يقرأ صلاحية التوكن ومدته من debug_token (بلا كشف أي سر). */
async function inspectToken(
  token: string,
  appId?: string,
  appSecret?: string
): Promise<{
  valid: boolean;
  type?: string;
  expiresAt: number;
  scopes: string[];
  userId?: string;
  error?: string;
}> {
  const accessToken = appId && appSecret ? `${appId}|${appSecret}` : token;
  const res = await graphGet("/debug_token", { input_token: token, access_token: accessToken });
  if (!res.ok || !res.data?.data) {
    return { valid: false, expiresAt: 0, scopes: [], error: res.error ?? "تعذر فحص التوكن" };
  }
  const data = res.data.data as {
    is_valid?: boolean;
    type?: string;
    expires_at?: number;
    scopes?: string[];
    user_id?: string;
  };
  return {
    valid: !!data.is_valid,
    type: data.type,
    expiresAt: Number(data.expires_at ?? 0) * 1000,
    scopes: data.scopes ?? [],
    userId: data.user_id,
  };
}

/** صفحات المستخدم مع توكن كل صفحة (توكن الصفحة لا ينتهي عادةً). */
async function listPages(
  userToken: string
): Promise<{ id: string; name: string; token?: string }[]> {
  const res = await graphGet("/me/accounts", {
    access_token: userToken,
    fields: "id,name,access_token,tasks",
    limit: "50",
  });
  if (!res.ok || !Array.isArray(res.data?.data)) return [];
  return (res.data.data as { id: string; name: string; access_token?: string }[]).map((page) => ({
    id: page.id,
    name: page.name,
    token: page.access_token,
  }));
}

async function verifyPage(
  pageId: string,
  token: string
): Promise<{ ok: boolean; name?: string; fans?: number; error?: string }> {
  const res = await graphGet(`/${pageId}`, {
    fields: "id,name,fan_count",
    access_token: token,
  });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, name: res.data?.name, fans: Number(res.data?.fan_count ?? 0) };
}

async function verifyGroup(
  groupId: string,
  token: string
): Promise<{ ok: boolean; name?: string; error?: string }> {
  const res = await graphGet(`/${groupId}`, { fields: "id,name", access_token: token });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, name: res.data?.name };
}

const DEFAULT_PAGE_ID = "102672588647591";
const DEFAULT_GROUP_ID = "346010664332427";

/**
 * 🔗 ربط/تجديد فيسبوك — يُستدعى من لوحة التحكم.
 *
 * mode = "exchange": توكن قصير الأجل + App ID/Secret → توكن مستخدم طويل الأجل
 *                     → توكن الصفحة (لا ينتهي) → حفظ + فحص فوري للقنوات.
 * mode = "direct":   توكن صفحة/مستخدم جاهز → فحص وحفظ مباشرة.
 */
export const connectFacebook = action({
  args: {
    token: v.string(),
    mode: v.union(v.literal("exchange"), v.literal("direct")),
    accessToken: v.string(),
    appId: v.optional(v.string()),
    appSecret: v.optional(v.string()),
    pageId: v.optional(v.string()),
    groupId: v.optional(v.string()),
    rememberAppCredentials: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // التحقق من صلاحية المشرف (نستفيد من نفس حاجز الإعدادات)
    await ctx.runQuery(api.settings.getAll, { token: args.token });

    const stored = (await ctx.runQuery(internal.facebookStore.getConfigInternal, {})) as FacebookConfig;
    const appId = (args.appId ?? stored.facebookAppId ?? "").trim();
    const appSecret = (args.appSecret ?? stored.facebookAppSecret ?? "").trim();
    // قابل للتحديث: نختار الصفحة الصحيحة من الصفحات المتاحة عند التبديل
    let pageId = (args.pageId ?? stored.facebookPageId ?? DEFAULT_PAGE_ID).trim();
    const groupId = (args.groupId ?? stored.facebookGroupId ?? DEFAULT_GROUP_ID).trim();
    const input = args.accessToken.trim();
    const warnings: string[] = [];

    if (input.length < 20) {
      throw new Error("التوكن غير صالح — انسخه كاملاً من Graph API Explorer");
    }

    let pageToken = input;
    let userToken = "";
    let userTokenExpiresAt = 0;
    let pageTokenExpiresAt = 0;
    let pageName = "";

    if (args.mode === "exchange") {
      if (!appId || !appSecret) {
        throw new Error(
          "التبديل يحتاج معرّف التطبيق (App ID) وسرّ التطبيق (App Secret) من لوحة مطوّري فيسبوك"
        );
      }
      const long = await exchangeForLongLived(appId, appSecret, input);
      if (!long.token) throw new Error(long.error ?? "تعذر تبديل التوكن");
      userToken = long.token;
      userTokenExpiresAt = long.expiresAt ?? 0;

      const pages = await listPages(userToken);
      if (pages.length === 0) {
        warnings.push(
          "لم يُعد فيسبوك أي صفحة لهذا التوكن — تأكد أنك تختار الصفحة الصحيحة عند توليد التوكن"
        );
      }
      const chosen =
        pages.find((page) => page.id === pageId) ??
        pages.find((page) => /vip\s*yemen/i.test(page.name)) ??
        pages[0];
      if (chosen?.token) {
        pageToken = chosen.token;
        pageId = chosen.id;
        pageName = chosen.name;
      } else if (chosen) {
        pageId = chosen.id;
        pageName = chosen.name;
        warnings.push("الصفحة وُجدت لكن بدون توكن خاص بها — سيُستخدم توكن المستخدم");
      }
    } else {
      const inspected = await inspectToken(input, appId, appSecret);
      if (!inspected.valid) {
        throw new Error(inspected.error ?? "التوكن غير صالح أو منتهي الصلاحية");
      }
      pageTokenExpiresAt = inspected.expiresAt;
      if (inspected.type === "USER") {
        userToken = input;
        userTokenExpiresAt = inspected.expiresAt;
        const pages = await listPages(userToken);
        const chosen =
          pages.find((page) => page.id === pageId) ??
          pages.find((page) => /vip\s*yemen/i.test(page.name)) ??
          pages[0];
        if (chosen?.token) {
          pageToken = chosen.token;
          pageId = chosen.id;
          pageName = chosen.name;
          pageTokenExpiresAt = 0; // توكن صفحة مستخرج من توكن مستخدم صالح = دائم
        } else {
          warnings.push(
            "التوكن توكن مستخدم بلا صفحات — للحصول على توكن لا ينتهي اختر الصفحة عند توليد التوكن"
          );
        }
      }
    }

    // توكن الصفحة: نتأكد من صلاحيته لنشر الصفحة تحديداً
    const page = await verifyPage(pageId, pageToken);
    if (!page.ok) {
      // ربما التوكن لصفحة أخرى — نبحث في الصفحات المتاحة
      if (userToken) {
        const pages = await listPages(userToken);
        const retry = pages.find((p) => p.token);
        if (retry?.token) {
          const second = await verifyPage(retry.id, retry.token);
          if (second.ok) {
            pageToken = retry.token;
            pageId = retry.id;
            pageName = second.name ?? retry.name;
            pageTokenExpiresAt = 0;
          } else {
            warnings.push(`تعذر التحقق من الصفحة: ${second.error ?? "خطأ غير معروف"}`);
          }
        }
      }
      if (!pageName) {
        warnings.push(`تعذر التحقق من الصفحة ${pageId}: ${page.error ?? "خطأ غير معروف"}`);
      }
    } else {
      pageName = page.name ?? pageName;
    }

    // فحص التوكن النهائي لتحديد الانتهاء بدقة
    const finalInspect = await inspectToken(pageToken, appId, appSecret);
    if (finalInspect.valid) {
      pageTokenExpiresAt = finalInspect.expiresAt;
    }

    const group = await verifyGroup(groupId, pageToken);
    if (!group.ok) {
      warnings.push(
        `مجموعة فيسبوك: ${group.error ?? "تعذر الوصول"} — النشر على المجموعة عبر الـ API متوقف من فيسبوك لبعض التطبيقات (تُنشر تلقائياً على الصفحة والقنوات الأخرى)`
      );
    }

    await ctx.runMutation(internal.facebookStore.saveConfigInternal, {
      values: {
        facebookAccessToken: pageToken,
        facebookPageId: pageId,
        facebookGroupId: groupId,
        ...(args.rememberAppCredentials !== false && appId && appSecret
          ? { facebookAppId: appId, facebookAppSecret: appSecret }
          : {}),
        ...(userToken ? { facebookUserToken: userToken } : {}),
        facebookUserTokenExpiresAt: userTokenExpiresAt,
        facebookTokenExpiresAt: pageTokenExpiresAt,
        facebookConnectedAt: Date.now(),
        facebookPageName: pageName || pageId,
        facebookLastError: page.ok ? "" : (page.error ?? "تعذر التحقق من الصفحة"),
      },
    });

    // فحص صحة فوري لكل القنوات بعد الربط
    try {
      await ctx.scheduler.runAfter(0, internal.channels.checkChannels, {});
    } catch {
      /* الفحص إضافة — لا يُسقط الربط */
    }

    const daysLeft =
      pageTokenExpiresAt > 0
        ? Math.max(0, Math.ceil((pageTokenExpiresAt - Date.now()) / DAY))
        : null;

    return {
      ok: page.ok,
      mode: args.mode,
      pageId,
      pageName: pageName || pageId,
      pageFans: page.fans ?? null,
      groupId,
      groupName: group.name ?? null,
      groupOk: group.ok,
      tokenType: finalInspect.type ?? (page.ok ? "PAGE" : "UNKNOWN"),
      permanent: pageTokenExpiresAt === 0,
      expiresAt: pageTokenExpiresAt || null,
      daysLeft,
      userTokenExpiresAt: userTokenExpiresAt || null,
      autoRenew: !!(appId && appSecret && userToken),
      scopes: finalInspect.scopes,
      warnings,
    };
  },
});

/**
 * ♻️ تجديد ذاتي لتوكن فيسبوك — يُستدعى من فحص القنوات (كل 6 ساعات).
 * يعمل فقط عند الحاجة: توكن المستخدم لم يبقَ منه أكثر من 20 يوماً، أو توكن
 * الصفحة انتهى. وعند النجاح يعيد استخراج توكن الصفحة (الدائم) ويحفظه.
 */
export const refreshTokenInternal = internalAction({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx: ActionCtx, { force }) => {
    const config = (await ctx.runQuery(internal.facebookStore.getConfigInternal, {})) as FacebookConfig;
    const appId = config.facebookAppId?.trim();
    const appSecret = config.facebookAppSecret?.trim();
    const userToken = config.facebookUserToken?.trim();
    if (!appId || !appSecret || !userToken) {
      return { ok: false, reason: "no-app-credentials", renewed: false };
    }
    const expiresAt = config.facebookUserTokenExpiresAt ?? 0;
    const soon = expiresAt > 0 && expiresAt - Date.now() < RENEW_WINDOW_DAYS * DAY;
    if (!force && !soon) {
      return { ok: true, reason: "not-needed", renewed: false, daysLeft: expiresAt ? Math.ceil((expiresAt - Date.now()) / DAY) : null };
    }

    const long = await exchangeForLongLived(appId, appSecret, userToken);
    if (!long.token) {
      await ctx.runMutation(internal.facebookStore.saveConfigInternal, {
        values: { facebookLastError: long.error ?? "تعذر تجديد توكن فيسبوك" },
      });
      await ctx.runMutation(internal.channelPush.logChannelEvent, {
        title: "⚠️ فشل تجديد توكن فيسبوك",
        message: `${long.error ?? "خطأ غير معروف"} — أعد الربط من لوحة التحكم → الإعدادات → ربط فيسبوك.`,
      });
      return { ok: false, reason: "exchange-failed", renewed: false, error: long.error };
    }

    const pages = await listPages(long.token);
    const chosen =
      pages.find((page) => page.id === config.facebookPageId) ??
      pages.find((page) => /vip\s*yemen/i.test(page.name)) ??
      pages.find((page) => !!page.token);

    const values: Record<string, unknown> = {
      facebookUserToken: long.token,
      facebookUserTokenExpiresAt: long.expiresAt ?? 0,
      facebookConnectedAt: Date.now(),
      facebookLastError: "",
    };
    if (chosen?.token) {
      values.facebookAccessToken = chosen.token;
      values.facebookPageId = chosen.id;
      values.facebookPageName = chosen.name;
      values.facebookTokenExpiresAt = 0; // توكن صفحة مستخرج من توكن طويل الأجل = دائم
    }

    await ctx.runMutation(internal.facebookStore.saveConfigInternal, { values });
    await ctx.runMutation(internal.channelPush.logChannelEvent, {
      title: "♻️ تم تجديد توكن فيسبوك تلقائياً",
      message: chosen?.token
        ? `تم تجديد التوكن واستخراج توكن الصفحة "${chosen.name}" (لا ينتهي) — النشر مستمر بلا انقطاع.`
        : "تم تجديد توكن المستخدم طويل الأجل، وسيُعاد استخراج توكن الصفحة عند أول نشر.",
    });

    return {
      ok: true,
      renewed: true,
      pageId: chosen?.id ?? config.facebookPageId,
      pageName: chosen?.name ?? config.facebookPageName,
    };
  },
});
