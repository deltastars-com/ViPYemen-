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
/** لا نُكرّر اختبار النشر الفعلي أكثر من مرة كل ٦ ساعات (حماية من الإفراط). */
const PROBE_THROTTLE = 6 * 60 * 60 * 1000;

/**
 * معرّف تطبيق فيسبوك «Vipyemen» — **معرّف عام وليس سرّاً** (يظهر في أي رابط
 * facebook.com/dialog/oauth?client_id=…). وجوده هنا يُقلّل ما يجب إدخاله يدوياً
 * إلى متغير **واحد** فقط: `FACEBOOK_APP_SECRET`، لأن التبديل إلى توكن طويل
 * الأجل يحتاج (client_id + client_secret) معاً.
 * المعرّف المكتشف من التوكن نفسه يتقدّم على هذا الافتراضي دائماً.
 */
const DEFAULT_FACEBOOK_APP_ID = "1142667409976840";

/**
 * 🌱 تهيئة أولية: لو غاب توكن اللوحة تماماً، تُستخدم متغيرات البيئة
 * (FACEBOOK_ACCESS_TOKEN/APP_ID/APP_SECRET) كبذرة، فتستفيد دورة التجديد
 * الذاتي منها حتى بدون أي ربط يدوي من اللوحة.
 */
async function bootstrapInner(ctx: ActionCtx): Promise<Record<string, unknown>> {
    const config = (await ctx.runQuery(internal.facebookStore.getConfigInternal, {})) as FacebookConfig;
    const envToken = process.env.FACEBOOK_ACCESS_TOKEN?.trim() ?? "";
    const envPageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() ?? "";
    const envPageName = process.env.FACEBOOK_PAGE_NAME?.trim() ?? "";
    const envPageId = process.env.FACEBOOK_PAGE_ID?.trim() ?? "";
    const envAppId = process.env.FACEBOOK_APP_ID?.trim() ?? "";
    const envAppSecret = process.env.FACEBOOK_APP_SECRET?.trim() ?? "";
    const storedToken = config.facebookAccessToken?.trim() ?? "";
    const appId =
      config.facebookAppId?.trim() || envAppId || DEFAULT_FACEBOOK_APP_ID;
    const appSecret = config.facebookAppSecret?.trim() || envAppSecret || "";

    if (!envToken && !envPageToken && !storedToken) {
      return { ok: false, reason: "no-token-anywhere" };
    }

    /**
     * بيانات اعتماد التطبيق واسم الصفحة تُثبّت في الإعدادات فور توفّرها في
     * البيئة — حتى لو كان التوكن نفسه منتهياً — لأن العرض والتشخيص في اللوحة
     * يجب أن يطابقا واقع متغيرات Convex، لا آخر توكن ناجح فقط.
     */
    const credsValues: Record<string, unknown> = {};
    if (envAppId && envAppSecret) {
      credsValues.facebookAppId = envAppId;
      credsValues.facebookAppSecret = envAppSecret;
    }
    if (envPageName) credsValues.facebookPageName = envPageName;
    // معرّف الصفحة من متغيرات البيئة يُثبّت في الإعدادات إن لم يكن محفوظاً،
    // وإلا تعطّل اختبار النشر الفعلي والنشر على الصفحة معاً.
    if (envPageId && !config.facebookPageId) credsValues.facebookPageId = envPageId;
    const envGroupId = (process.env.FACEBOOK_GROUP_ID ?? "").trim();
    if (envGroupId && !config.facebookGroupId) credsValues.facebookGroupId = envGroupId;

    /** تقييم توكن: حيّ؟ ويمنح صلاحية النشر؟ */
    const evaluate = async (
      token: string
    ): Promise<{ alive: boolean; canPost: boolean | null; detail: string }> => {
      const inspected = await inspectToken(token, appId || undefined, appSecret || undefined);
      if (inspected.valid) {
        const posting = evaluatePostingPermission(inspected.scopes ?? []);
        return { alive: true, canPost: posting.canPost, detail: posting.detail };
      }
      // debug_token غير متاح (بلا سرّ التطبيق) — نختبر حياة التوكن مباشرة.
      const probe = await graphGet("/me", { fields: "id", access_token: token });
      return { alive: probe.ok, canPost: null, detail: probe.ok ? "" : inspected.error ?? probe.error ?? "" };
    };

    // ── 1) التوكن المحفوظ أولاً: إن كان حياً وممنوحاً للنشر فلا حاجة لشيء ──
    let storedEval: { alive: boolean; canPost: boolean | null; detail: string } | null = null;
    if (storedToken) {
      storedEval = await evaluate(storedToken);
      if (storedEval.alive && storedEval.canPost === true) {
        const paused = (await ctx.runQuery(internal.channelPush.getPausedInternal, {})) as Record<
          string,
          boolean
        >;
        if (paused.facebook_page === true || paused.facebook_group === true) {
          await ctx.runMutation(internal.channelPush.unpauseIfTokenHealthy, {});
          await ctx.runMutation(internal.channelPush.logChannelEvent, {
            title: "✅ رُفعت قناة فيسبوك من الإيقاف تلقائياً",
            message: "التوكن المحفوظ حيّ ويمنح صلاحية النشر — النشر التلقائي مستأنف للصفحة والمجموعة.",
          });
          return { ok: true, reason: "stored-resumed", canPost: true };
        }
        return { ok: true, reason: "stored-healthy", canPost: true };
      }
    }

    // ── 1.b) توكن صفحة دائم من البيئة (FACEBOOK_PAGE_ACCESS_TOKEN) ──
    // توكن الصفحة لا يحتاج عملية تبديل ولا App Secret — لذلك هو أسرع مسار
    // لتفعيل نشر دائم حين لا تتوفر بيانات اعتماد التطبيق. وهو دائم بطبيعته،
    // وصلاحياته لا تُقرأ من debug_token، فيُعتمد عند نجاح النشر فعلياً.
    if (envPageToken) {
      const pageEval = await evaluate(envPageToken);
      if (pageEval.alive) {
        const pageValues: Record<string, unknown> = {
          ...credsValues,
          facebookAccessToken: envPageToken,
          facebookTokenType: "PAGE",
          facebookTokenExpiresAt: 0,
          facebookConnectedAt: Date.now(),
          facebookLastError: pageEval.canPost === false ? pageEval.detail : "",
        };
        if (pageEval.canPost === false) {
          pageValues.facebookCanPost = false;
          pageValues.facebookPostingDetail = pageEval.detail;
        } else {
          pageValues.facebookCanPost = pageEval.canPost === true ? true : null;
          pageValues.facebookPostingDetail =
            pageEval.canPost === true
              ? "صلاحية النشر ممنوحة (توكن صفحة دائم)"
              : "توكن صفحة دائم لا ينتهي — تُتأكد صلاحية النشر عند أول نشر فعلي";
        }
        await ctx.runMutation(internal.facebookStore.saveConfigInternal, { values: pageValues });
        // 🎯 توكن الصفحة لا تُقرأ صلاحياته من debug_token — الحكم القاطع هو اختبار
        // نشر فعلي: منشور مخفي يُحذف فوراً. عند النجاح يرتفع الإيقاف تلقائياً.
        const pageProbe = await runProbePosting(ctx, true);
        await ctx.runMutation(internal.channelPush.logChannelEvent, {
          title: "🔗 رُبط توكن صفحة دائم من متغيرات البيئة",
          message:
            pageProbe.canPost === true
              ? "توكن الصفحة لا ينتهي، وتأكدت صلاحية النشر باختبار فعلي — النشر التلقائي على الصفحة مستأنف بلا حاجة إلى App ID أو App Secret."
              : `توكن الصفحة لا ينتهي، لكن اختبار النشر الفعلي لم ينجح: ${pageProbe.detail}`,
        });
        return {
          ok: pageProbe.canPost === true,
          reason: "page-token-from-env",
          canPost: pageProbe.canPost,
          resumed: pageProbe.canPost === true,
          detail: pageProbe.detail,
        };
      }
    }

    if (!envToken) {
      return {
        ok: false,
        reason: "stored-unverified-no-env",
        detail: storedEval?.detail || "لا يوجد توكن في بيئة Convex للتحقق منه",
      };
    }

    // ── 2) استيراد/استبدال التوكن من البيئة (ببناء على ما أضيف في الأسرار) ──
    const inspected = await inspectToken(envToken, appId || undefined, appSecret || undefined);
    const probe = inspected.valid
      ? { ok: true, error: undefined as string | undefined }
      : await graphGet("/me", { fields: "id", access_token: envToken });
    const envAlive = inspected.valid || probe.ok;
    if (!envAlive) {
      // رسالة رفض /me هي الأدق (خطأ Graph الحقيقي للتوكن نفسه).
      const why = probe.error ?? inspected.error ?? "رفض Graph التوكن (خطأ غير مفصّل)";
      await ctx.runMutation(internal.channelPush.logChannelEvent, {
        title: "⚠️ توكن البيئة غير صالح",
        message: `${why} — ${
          storedToken
            ? "أُبقي التوكن المحفوظ كما هو."
            : "لا يوجد توكن بديل محفوظ."
        } أعد توليد التوكن من Graph API Explorer مع pages_manage_posts ثم حدّث FACEBOOK_ACCESS_TOKEN في Convex Dashboard ← Settings ← Environment Variables.`,
      });
      // نُثبّت بيانات الاعتماد إن وُجدت، فيعرف التشخيص أنها وصلت فعلاً.
      if (Object.keys(credsValues).length > 0) {
        await ctx.runMutation(internal.facebookStore.saveConfigInternal, { values: credsValues });
      }
      return { ok: false, reason: "env-token-invalid", detail: why };
    }

    const values: Record<string, unknown> = { facebookConnectedAt: Date.now(), ...credsValues };
    if (envAppId && envAppSecret) {
      values.facebookAppId = envAppId;
      values.facebookAppSecret = envAppSecret;
    }

    // 🧠 معرّف التطبيق يُستخرج آلياً من debug_token — فلا نُثقل على المشرف طلبه.
    // ولكن سرّ التطبيق لا يمكن استنباطه أبداً (بتصميم Meta)؛ لذا نوضّح في اللوحة
    // أن المتبقي هو السر وحده تسميةً.
    const discoveredAppId = inspected.appId?.trim() ?? "";
    if (discoveredAppId) {
      values.facebookTokenAppId = discoveredAppId;
      if (!appId) values.facebookAppId = discoveredAppId;
      if (inspected.appName) values.facebookTokenAppName = inspected.appName;
    }
    // معرّف الصفحة من التوكن — لتوكنات الصفحات فقط (profile_id لتوكن المستخدم
    // هو معرّف المستخدم، وليس صفحة).
    if (inspected.type === "PAGE" && inspected.profileId && !config.facebookPageId) {
      values.facebookPageId = inspected.profileId;
    }

    let publishToken = envToken;
    if (inspected.type === "USER" && appId && appSecret) {
      // توكن مستخدم → توكن طويل الأجل (60 يوماً) → توكن الصفحة الدائم.
      const long = await exchangeForLongLived(appId, appSecret, envToken);
      if (long.token) {
        values.facebookUserToken = long.token;
        values.facebookUserTokenExpiresAt = long.expiresAt ?? 0;
        const pages = await listPages(long.token);
        const chosen =
          pages.find((p) => p.id === "102672588647591") ??
          pages.find((p) => /vip\s*yemen/i.test(p.name)) ??
          pages.find((p) => !!p.token);
        if (chosen?.token) {
          publishToken = chosen.token;
          values.facebookAccessToken = chosen.token;
          values.facebookPageId = chosen.id;
          values.facebookPageName = chosen.name;
          values.facebookTokenExpiresAt = 0;
        } else {
          publishToken = long.token;
          values.facebookAccessToken = long.token;
        }
      }
    } else {
      values.facebookAccessToken = envToken;
      if (inspected.type) values.facebookTokenType = inspected.type;
      if (inspected.valid) values.facebookTokenExpiresAt = inspected.expiresAt || 0;
      if (!(appId && appSecret) && inspected.type !== "PAGE") {
        // توكن مستخدم (Graph API Explorer) بلا بيانات اعتماد التطبيق: لا يمكن
        // قراءة صلاحياته ولا تمديد عمره، وهو ينتهي خلال ساعات فيتوقف النشر.
        // نوضّح السبب صراحةً بدل ترك اللوحة صامتة.
        values.facebookCanPost = null;
        values.facebookPostingDetail =
          "التوكن مقبول لكن غير قابل للتحقق: بدون FACEBOOK_APP_ID و FACEBOOK_APP_SECRET لا يستطيع النظام قراءة صلاحياته ولا تمديد عمره، وتوكن Graph API Explorer ينتهي خلال ساعات فيتوقف النشر. الحل: أضف FACEBOOK_APP_ID و FACEBOOK_APP_SECRET في متغيرات Convex، أو ألصق توكن صفحة دائم في FACEBOOK_PAGE_ACCESS_TOKEN.";
        values.facebookLastError = values.facebookPostingDetail;
      }
    }

    // تقييم صلاحية النشر على توكن النشر النهائي قبل الحفظ.
    const finalEval =
      publishToken === envToken
        ? { canPost: inspected.valid ? evaluatePostingPermission(inspected.scopes ?? []).canPost : null, detail: "" }
        : await evaluate(publishToken);
    if (finalEval.canPost !== null) {
      values.facebookCanPost = finalEval.canPost;
      values.facebookPostingDetail =
        finalEval.detail ||
        (finalEval.canPost === true ? "صلاحية النشر ممنوحة (pages_manage_posts)" : "");
      values.facebookLastError = finalEval.canPost === true ? "" : finalEval.detail;
    }    await ctx.runMutation(internal.facebookStore.saveConfigInternal, { values });

    let resumed = false;
    if (finalEval.canPost === true) {
      await ctx.runMutation(internal.channelPush.unpauseIfTokenHealthy, {});
      resumed = true;
    } else {
      // 🎯 ما زالت الصلاحية غير مؤكدة — نُشغّل اختبار النشر الفعلي (مرة كل ٦ ساعات
      // كحد أقصى) فيحسمها النظام بنفسه: إما يرفع الإيقاف، أو يسجّل خطأ Meta
      // الحقيقي بالعربية في اللوحة وسجل القنوات.
      const probed = await runProbePosting(ctx, false);
      if (probed.canPost === true) resumed = true;
      if (probed.canPost !== null) finalEval.canPost = probed.canPost;
      finalEval.detail = probed.detail || finalEval.detail;
    }
    await ctx.runMutation(internal.channelPush.logChannelEvent, {
      title: storedToken ? "🔄 استُبدل توكن فيسبوك بتحديث الأسرار" : "🔗 استُورد توكن فيسبوك من البيئة تلقائياً",
      message:
        finalEval.canPost === true
          ? `صلاحية النشر ممنوحة — النشر التلقائي مفعّل${resumed ? " ورُفعت القناتان من الإيقاف" : ""}.`
          : finalEval.canPost === false
            ? finalEval.detail
            : "حُفظ التوكن وسيُقيَّم عند أول فحص — تأكد من وجود FACEBOOK_APP_ID و FACEBOOK_APP_SECRET للفحص التفصيلي.",
    });

    return {
      ok: true,
      reason: storedToken ? "replaced-from-env" : "bootstrapped",
      canPost: finalEval.canPost,
      resumed,
    };
}

/**
 * الغلاف: يسجّل نتيجة آخر تشغيل (حالة فقط — بلا أي سر) ويحدّث فحص صحة
 * القنوات فوراً، حتى يعرض `/channels` الحقيقة لحظية لا بيانات قديمة.
 */
export const bootstrapFromEnv = internalAction({
  args: {},
  handler: async (ctx: ActionCtx): Promise<Record<string, unknown>> => {
    // أسماء متغيرات البيئة المرئية فقط (لا قيم) — لتحديد نقصان أي مفتاح.
    const envKeys = Object.keys(process.env)
      .filter((k) => k.startsWith("FACEBOOK_"))
      .sort();
    const envPresent = !!(process.env.FACEBOOK_ACCESS_TOKEN ?? "").trim();
    const pageTokenInEnv = !!(process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "").trim();
    const appCredsInEnv =
      !!(process.env.FACEBOOK_APP_ID ?? "").trim() &&
      !!(process.env.FACEBOOK_APP_SECRET ?? "").trim();
    const result = await bootstrapInner(ctx);
    let storedPresent = false;
    try {
      const cfg = (await ctx.runQuery(internal.facebookStore.getConfigInternal, {})) as FacebookConfig;
      storedPresent = !!(cfg.facebookAccessToken?.trim() || cfg.facebookUserToken?.trim());
    } catch {
      /* تجاهل — يبقى false */
    }
    await ctx.runMutation(internal.facebookStore.saveConfigInternal, {
      values: {
        facebookBootstrapState: {
          at: Date.now(),
          ok: result.ok === true,
          reason: String(result.reason ?? ""),
          canPost: typeof result.canPost === "boolean" ? result.canPost : null,
          resumed: result.resumed === true,
          envPresent,
          pageTokenInEnv,
          appCredsInEnv,
          envKeys,
          storedPresent,
          detail: typeof result.detail === "string" ? result.detail.slice(0, 300) : "",
        },
      },
    });
    if (envPresent || storedPresent) {
      await ctx.scheduler.runAfter(0, internal.channels.checkChannels, {});
    }
    return result;
  },
});

/**
 * الصلاحية الوحيدة التي تفصل بين «ربط ناجح» و«نشر ناجح». بدونها يُوصل فيسبوك
 * الخطأ (#200): If posting to a page, requires both pages_read_engagement and
 * pages_manage_posts. لذلك نفحصها صراحةً ونخبر بها بوضوح.
 */
const POSTING_SCOPES = ["pages_manage_posts"] as const;

/** يقيّم صلاحيات النشر من قائمة الصلاحيات المقروءة من debug_token. */
function evaluatePostingPermission(scopes: string[]): {
  canPost: boolean | null;
  missing: string[];
  detail: string;
} {
  if (scopes.length === 0) {
    return { canPost: null, missing: [], detail: "" };
  }
  const missing = POSTING_SCOPES.filter((scope) => !scopes.includes(scope));
  if (missing.length === 0) return { canPost: true, missing: [], detail: "" };
  return {
    canPost: false,
    missing: [...missing],
    detail: `التوكن لا يمنح صلاحية النشر على الصفحة (${missing.join(", ")}) — أعد توليد التوكن من Graph API Explorer مع تحديد هذه الصلاحية ثم اربطه من هنا`,  };
}

interface GraphResult {
  ok: boolean;
  status: number;
  data: any;
  error?: string;
}

/** إرسال POST إلى Graph (يُستخدم لاختبار النشر الفعلي). */
async function graphPost(path: string, body: Record<string, unknown>): Promise<GraphResult> {
  try {
    const res = await fetch(`${GRAPH}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store" as RequestCache,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) {
      return { ok: false, status: res.status, data, error: data?.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 0, data: {}, error: err?.message ?? String(err) };
  }
}

/** حذف كائن من Graph (لتنظيف مسودة الاختبار فوراً). */
async function graphDelete(id: string, token: string): Promise<GraphResult> {
  try {
    const url = new URL(`${GRAPH}/${id}`);
    url.searchParams.set("access_token", token);
    const res = await fetch(url, { method: "DELETE", cache: "no-store" as RequestCache });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) {
      return { ok: false, status: res.status, data, error: data?.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 0, data: {}, error: err?.message ?? String(err) };
  }
}

/**
 * 🎯 الحكم القاطع على صلاحية النشر.
 *
 * `debug_token` لا يُظهر صلاحيات توكن الصفحة إطلاقاً، ولهذا تبقى الحالة
 * «غير معروفة» أبدياً ما لم يُنشر شيء فعلاً. الحل المستعمل هنا: إنشاء منشور
 * **غير منشور** (published=false) على الصفحة، ثم حذفه فوراً — فلا يراه الجمهور
 * ولا يبقى له أثر، والنتيجة قاطعة: إما يُنشأ فعلاً، أو يُعيد فيسبوك خطأه
 * الحقيقي بالعربية في السجل.
 *
 * وعند النجاح يرتفع الإيقاف عن قناة فيسبوك تلقائياً بلا أي تدخل.
 */
async function runProbePosting(
  ctx: ActionCtx,
  force = false
): Promise<{ ok: boolean; canPost: boolean | null; detail: string; skipped?: boolean }> {
  const config = (await ctx.runQuery(internal.facebookStore.getConfigInternal, {})) as FacebookConfig;
  const token = config.facebookAccessToken?.trim() ?? "";
  // معرّف الصفحة: من الإعدادات أولاً، ثم من متغيرات البيئة، ثم الافتراضي — فلا
  // يتعطّل الاختبار إن كان الربط قد جاء من متغيرات Convex وحدها.
  const pageId =
    config.facebookPageId?.trim() ||
    (process.env.FACEBOOK_PAGE_ID ?? "").trim() ||
    DEFAULT_PAGE_ID;
  if (!token || !pageId) {
    return { ok: false, canPost: null, detail: "لا يوجد توكن أو معرّف صفحة للاختبار" };
  }
  if (!force && config.facebookCanPost === true) {
    return { ok: true, canPost: true, detail: "الصلاحية مؤكدة سابقاً", skipped: true };
  }
  const last = config.facebookLastProbeAt ?? 0;
  if (!force && Date.now() - last < PROBE_THROTTLE) {
    return {
      ok: true,
      canPost: typeof config.facebookCanPost === "boolean" ? config.facebookCanPost : null,
      detail: "اختُبر خلال آخر ٦ ساعات",
      skipped: true,
    };
  }

  const res = await graphPost(`/${pageId}/feed`, {
    message: "فحص آلي لصلاحية النشر — يُحذف فوراً",
    published: false,
    access_token: token,
  });
  const values: Record<string, unknown> = { facebookLastProbeAt: Date.now() };

  if (res.ok && res.data?.id) {
    const cleanup = await graphDelete(String(res.data.id), token);
    values.facebookCanPost = true;
    values.facebookPostingDetail =
      "✅ تأكدت صلاحية النشر باختبار فعلي (أُنشئ منشور مخفي وحُذف فوراً)";
    values.facebookLastError = "";
    await ctx.runMutation(internal.facebookStore.saveConfigInternal, { values });
    await ctx.runMutation(internal.channelPush.unpauseIfTokenHealthy, {});
    await ctx.runMutation(internal.channelPush.logChannelEvent, {
      title: "✅ تأكدت صلاحية النشر على الصفحة باختبار فعلي",
      message: cleanup.ok
        ? "أُنشئ منشور مخفي على الصفحة وحُذف فوراً — صلاحية pages_manage_posts مؤكدة، ورُفعت قناة فيسبوك من الإيقاف تلقائياً."
        : `كُتب المنشور المخفي ونجح الاختبار، لكن تعذّر حذفه آلياً (${cleanup.error ?? "سبب غير معروف"}) — احذفه من إدارة الصفحة.`,
    });
    return { ok: true, canPost: true, detail: "صلاحية النشر مؤكدة باختبار فعلي" };
  }

  const detail = res.error ?? "فشل غير معروف";
  // خطأ الصلاحية يظهر بصور متعددة: (#200) أو (#3) أو permission أو نفس رسالة Meta
  const permissionIssue =
    res.status === 403 ||
    /permission|pages_manage_posts|#200|#3\b|pages_read_engagement/i.test(detail);
  values.facebookPostingDetail = permissionIssue
    ? `⛔ اختبار النشر الفعلي رُفض: ${detail} — الصلاحية المطلوبة غير ممنوحة للتوكن`
    : `⚠️ اختبار النشر الفعلي لم يكتمل: ${detail}`;
  values.facebookLastError = String(values.facebookPostingDetail);
  if (permissionIssue) values.facebookCanPost = false;
  await ctx.runMutation(internal.facebookStore.saveConfigInternal, { values });
  await ctx.runMutation(internal.channelPush.logChannelEvent, {
    title: permissionIssue
      ? "⛔ اختبار النشر الفعلي: صلاحية النشر غير ممنوحة"
      : "🧲 اختبار النشر الفعلي لم يكتمل",
    message: String(values.facebookPostingDetail),
  });
  return { ok: false, canPost: permissionIssue ? false : null, detail };
}

/** داخلي — يُشغّل اختبار النشر الدورى من دورة الأتمتة. */
export const probePostingInternal = internalAction({
  args: {},
  handler: async (ctx: ActionCtx) => await runProbePosting(ctx, false),
});

/**
 * 🔬 اختبار النشر الفعلي بطلب المشرف — يحسم صلاحية `pages_manage_posts` نهائياً
 * (منشور مخفي يُحذف فوراً)، ويُرفع الإيقاف عن القناة عند النجاح.
 */
export const testPosting = action({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    // يرمي خطأً إن لم تكن الجلسة إدارية
    await ctx.runQuery(api.settings.getAll, { token });
    return await runProbePosting(ctx, true);
  },
});

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
  /** معرّف التطبيق المالك للتوكن — يُستخرج آلياً فلا يُطلب من المشرف. */
  appId?: string;
  appName?: string;
  /** معرّف الصفحة/الملف الذي يخصّه توكن الصفحة. */
  profileId?: string;
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
    app_id?: string | number;
    application?: string;
    profile_id?: string | number;
  };
  return {
    valid: !!data.is_valid,
    type: data.type,
    expiresAt: Number(data.expires_at ?? 0) * 1000,
    scopes: data.scopes ?? [],
    userId: data.user_id,
    appId: data.app_id !== undefined ? String(data.app_id) : undefined,
    appName: data.application,
    profileId: data.profile_id !== undefined ? String(data.profile_id) : undefined,
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
    let observedScopes: string[] = [];

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
      observedScopes = inspected.scopes ?? [];
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

    // فحص التوكن النهائي لتحديد الانتهاء بدقة + صلاحية النشر
    const finalInspect = await inspectToken(pageToken, appId, appSecret);
    if (finalInspect.valid) {
      pageTokenExpiresAt = finalInspect.expiresAt;
    }
    const allScopes = [...new Set([...(finalInspect.scopes ?? []), ...observedScopes])];
    const posting = evaluatePostingPermission(allScopes);
    if (posting.canPost === false) {
      warnings.push(
        `${posting.detail} — وبدونها ينشر النظام على تلجرام والقنوات الأخرى ويُعلن حالة الصفحة كـ«تحتاج صلاحية» في فحص القنوات.`
      );
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
        facebookLastError: page.ok
          ? (posting.canPost === false ? posting.detail : "")
          : (page.error ?? "تعذر التحقق من الصفحة"),
        ...(posting.canPost === null
          ? {}
          : { facebookCanPost: posting.canPost, facebookPostingDetail: posting.detail }),
      },
    });

    // فحص صحة فوري لكل القنوات بعد الربط
    try {
      await ctx.scheduler.runAfter(0, internal.channels.checkChannels, {});
    } catch {
      /* الفحص إضافة — لا يُسقط الربط */
    }

    // 📴 رفع إيقاف قنوات فيسبوك تلقائياً عند ربط توكن صالح يمنح صلاحية النشر:
    // المنصة تبدأ بقنوات فيسبوك متوقفة، وتعمل فور ربط التوكن الجديد.
    if (posting.canPost === true) {
      try {
        await ctx.runMutation(internal.channelPush.unpauseIfTokenHealthy, {});
      } catch {
        /* رفع الإيقاف إضافة — لا يُسقط الربط */
      }
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
      scopes: allScopes,
      canPost: posting.canPost,
      missingPostScopes: posting.missing,
      postingDetail: posting.detail,
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
    // معرّف التطبيق: من الإعدادات ← ثم البيئة ← ثم المعرّف العام الافتراضي
    // (المعرّف ليس سرّاً)، فلا يحتاج التجديد الذاتي إلا سرّ التطبيق وحده.
    const appId =
      config.facebookAppId?.trim() ||
      (process.env.FACEBOOK_APP_ID ?? "").trim() ||
      DEFAULT_FACEBOOK_APP_ID;
    const appSecret =
      config.facebookAppSecret?.trim() || (process.env.FACEBOOK_APP_SECRET ?? "").trim();
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
      // إعادة تقييم صلاحية النشر على التوكن الجديد
      const fresh = await inspectToken(chosen.token, appId, appSecret);
      const posting = evaluatePostingPermission(fresh.scopes ?? []);
      if (posting.canPost !== null) {
        values.facebookCanPost = posting.canPost;
        values.facebookPostingDetail = posting.detail;
        if (posting.canPost === false) values.facebookLastError = posting.detail;
      }
    }

    await ctx.runMutation(internal.facebookStore.saveConfigInternal, { values });
    await ctx.runMutation(internal.channelPush.logChannelEvent, {
      title: "♻️ تم تجديد توكن فيسبوك تلقائياً",
      message: chosen?.token
        ? `تم تجديد التوكن واستخراج توكن الصفحة "${chosen.name}" (لا ينتهي) — النشر مستمر بلا انقطاع.`
        : "تم تجديد توكن المستخدم طويل الأجل، وسيُعاد استخراج توكن الصفحة عند أول نشر.",
    });
    // بعد التجديد: إن منح التوكن الجديد صلاحية النشر، ارفع الإيقاف وحدّث فحص الصحة.
    if (values.facebookCanPost === true) {
      await ctx.runMutation(internal.channelPush.unpauseIfTokenHealthy, {});
      await ctx.scheduler.runAfter(0, internal.channels.checkChannels, {});
    }

    return {
      ok: true,
      renewed: true,
      pageId: chosen?.id ?? config.facebookPageId,
      pageName: chosen?.name ?? config.facebookPageName,
    };
  },
});
