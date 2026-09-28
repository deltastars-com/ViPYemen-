// 💬 قناة واتساب (WhatsApp Cloud API) — تُدار بالكامل من لوحة التحكم.
//
// لا تحتاج أي متغيرات بيئة: تُدخل بيانات Meta في اللوحة، يتحقق النظام منها
// فعلياً عبر Graph API، ثم يحفظها ويشغّل القناة فوراً.
//
//   whatsappAccessToken     توكن Meta الدائم (System User Token أو توكن التطبيق)
//   whatsappPhoneNumberId   معرّف رقم الإرسال (Phone number ID)
//   whatsappBroadcastTo     قائمة أرقام المستلمين (E.164 بلا +)
//   whatsappTemplateName    قالب معتمد (اختياري لكن ضروري للنشر الدائم)
//   whatsappTemplateLang    لغة القالب (افتراضياً ar)
//   whatsappConnectedAt     وقت آخر ربط ناجح
//   whatsappVerifiedName    الاسم المعتمد للرقم كما تؤكده Meta
//   whatsappDisplayPhone    الرقم المعروض
//   whatsappLastError       آخر خطأ تحقق
//
// ⚠️ قاعدة Meta: الرسائل الحرة (free-form) لا تُسلَّم إلا خلال 24 ساعة من آخر
// رسالة وردت من العميل. للنشر التلقائي الدائم يُستخدم قالب مُعتمد (template)
// بمعامل واحد {{1}} يحتوي نص المنشور — وهذا ما يدعمه هذا الملف تلقائياً.
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { requireAdmin } from "./auth";
import { buildMessageBody, normalizeRecipients } from "./whatsappBody";

const GRAPH = "https://graph.facebook.com/v21.0";

export const KEYS = [
  "whatsappAccessToken",
  "whatsappPhoneNumberId",
  "whatsappBroadcastTo",
  "whatsappTemplateName",
  "whatsappTemplateLang",
  "whatsappConnectedAt",
  "whatsappVerifiedName",
  "whatsappDisplayPhone",
  "whatsappLastError",
] as const;

export type WhatsAppKey = (typeof KEYS)[number];

export interface WhatsAppConfig {
  whatsappAccessToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappBroadcastTo?: string[];
  whatsappTemplateName?: string;
  whatsappTemplateLang?: string;
  whatsappConnectedAt?: number;
  whatsappVerifiedName?: string;
  whatsappDisplayPhone?: string;
  whatsappLastError?: string;
}

async function readConfig(ctx: { db: any }): Promise<WhatsAppConfig> {
  const rows = await ctx.db.query("settings").collect();
  const out: WhatsAppConfig = {};
  for (const key of KEYS) {
    const row = rows.find((r: { key: string }) => r.key === key);
    if (row !== undefined) (out as Record<string, unknown>)[key] = row.value;
  }
  return out;
}

/** إعدادات واتساب (داخلي — للاستخدام من الأفعال الآلية بلا تحقق جلسة). */
export const getConfigInternal = internalQuery({
  args: {},
  handler: async (ctx) => await readConfig(ctx),
});

/** حفظ مفاتيح واتساب دفعة واحدة (داخلي). */
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

async function graphFetch(
  path: string,
  token: string,
  init?: { method: string; body: unknown }
): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
  const url = init
    ? `${GRAPH}${path}`
    : `${GRAPH}${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      cache: "no-store" as RequestCache,
      ...(init
        ? {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(init.body),
          }
        : {}),
    });
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

/**
 * 💬 ربط قناة واتساب — يُستدعى من لوحة التحكم ← الإعدادات.
 *
 * الخطوات: فحص التوكن والرقم فعلياً عبر Graph API → (اختياري) إرسال رسالة
 * تجريبية للمستلم الأول → حفظ الإعدادات → فحص فوري لصحة القنوات.
 */
export const connectWhatsApp = action({
  args: {
    token: v.string(),
    accessToken: v.string(),
    phoneNumberId: v.string(),
    recipients: v.array(v.string()),
    templateName: v.optional(v.string()),
    templateLang: v.optional(v.string()),
    sendTest: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    ok: boolean;
    verifiedName?: string | null;
    displayPhone?: string | null;
    recipients: string[];
    template: string | null;
    testSent: boolean;
    testError: string | null;
    warnings: string[];
  }> => {
    // حاجز المشرف — يرمي خطأً إن لم تكن الجلسة إدارية
    await ctx.runQuery(api.settings.getAll, { token: args.token });

    const stored = (await ctx.runQuery(internal.whatsapp.getConfigInternal, {})) as WhatsAppConfig;
    const accessToken = args.accessToken.trim() || stored.whatsappAccessToken?.trim() || "";
    const phoneNumberId = args.phoneNumberId.trim() || stored.whatsappPhoneNumberId?.trim() || "";
    const recipients = normalizeRecipients(
      args.recipients.length > 0 ? args.recipients : (stored.whatsappBroadcastTo ?? [])
    );
    const templateName = (args.templateName ?? stored.whatsappTemplateName ?? "").trim();
    const templateLang = (args.templateLang ?? stored.whatsappTemplateLang ?? "ar").trim();
    const warnings: string[] = [];

    if (accessToken.length < 20) {
      throw new Error(
        "توكن واتساب غير صالح — انسخ التوكن الدائم من Meta for Developers ← WhatsApp ← API Setup"
      );
    }
    if (!/^\d{6,20}$/.test(phoneNumberId)) {
      throw new Error(
        "معرّف رقم الإرسال (Phone number ID) يجب أن يكون رقماً — تجده في WhatsApp ← API Setup"
      );
    }
    if (recipients.length === 0) {
      warnings.push(
        "لم تُضف أي رقم مستلم بعد — النشر سيُعلَّق حتى تضيف أرقام المستلمين (بالصيغة الدولية 9677xxxxxxxx)"
      );
    }

    const info = await graphFetch(
      `/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,platform_type`,
      accessToken
    );
    if (!info.ok) {
      throw new Error(
        `تعذر التحقق من رقم واتساب: ${info.error ?? "راجع التوكن ومعرّف الرقم"}`
      );
    }
    const verifiedName = info.data?.verified_name ?? null;
    const displayPhone = info.data?.display_phone_number ?? null;

    // فحص "إمكانية الإرسال" بلا إنشاء أي شيء: نقرأ قوالب الحساب للتأكد من صلاحية
    // whatsapp_business_management، ونقرأ صلاحيات التوكن.
    const permissions = await graphFetch("/debug_token?input_token=" + encodeURIComponent(accessToken), accessToken);
    const scopes: string[] = permissions.ok ? (permissions.data?.data?.scopes ?? []) : [];
    const canSend = scopes.length === 0 ? true : scopes.includes("whatsapp_business_messaging");
    const canManage = scopes.length === 0 ? true : scopes.includes("whatsapp_business_management");
    if (!canSend) {
      warnings.push(
        "التوكن لا يمنح صلاحية الإرسال whatsapp_business_messaging — أعد توليده من System User أو API Setup"
      );
    }
    if (!canManage && templateName) {
      warnings.push("لا يمكن قراءة القوالب بهذا التوكن (whatsapp_business_management مفقود)");
    }

    if (!templateName) {
      warnings.push(
        "لا يوجد قالب مُعتمد — الرسائل الحرة تُسلَّم فقط خلال 24 ساعة من آخر رسالة من العميل. للنشر الدائم أنشئ قالباً بمعامل واحد {{1}} واضبط اسمه هنا."
      );
    }

    let testSent = false;
    let testError: string | null = null;
    if (args.sendTest && recipients.length > 0) {
      const test = await graphFetch(`/${phoneNumberId}/messages`, accessToken, {
        method: "POST",
        body: buildMessageBody(
          recipients[0],
          "✅ تم ربط قناة المنصة على واتساب بنجاح — ستصلك كل الإعلانات والعروض هنا تلقائياً.",
          templateName || undefined,
          templateLang
        ),
      });
      testSent = test.ok;
      if (!test.ok) {
        testError = test.error ?? "فشل إرسال الرسالة التجريبية";
        warnings.push(
          `الرسالة التجريبية فشلت: ${testError} — إن كان السبب 24 ساعة فأنشئ قالباً مُعتمداً.`
        );
      }
    }

    await ctx.runMutation(internal.whatsapp.saveConfigInternal, {
      values: {
        whatsappAccessToken: accessToken,
        whatsappPhoneNumberId: phoneNumberId,
        whatsappBroadcastTo: recipients,
        whatsappTemplateName: templateName,
        whatsappTemplateLang: templateLang,
        whatsappConnectedAt: Date.now(),
        whatsappVerifiedName: verifiedName ?? "",
        whatsappDisplayPhone: displayPhone ?? "",
        whatsappLastError: testError ?? "",
      },
    });

    // فحص صحة فوري لكل القنوات بعد الربط
    try {
      await ctx.scheduler.runAfter(0, internal.channels.checkChannels, {});
    } catch {
      /* الفحص إضافة — لا يُسقط الربط */
    }

    return {
      ok: true,
      verifiedName,
      displayPhone,
      recipients,
      template: templateName || null,
      testSent,
      testError,
      warnings,
    };
  },
});

/** 🩺 حالة قناة واتساب للمشرف (بلا كشف أي سر). */
export const getWhatsAppStatus = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const config = await readConfig(ctx);
    const accessToken = config.whatsappAccessToken?.trim() ?? "";
    return {
      connected: accessToken.length > 0 && !!config.whatsappPhoneNumberId,
      tokenPrefix: accessToken.length > 4 ? `${accessToken.slice(0, 4)}…` : "",
      phoneNumberId: config.whatsappPhoneNumberId ?? "",
      verifiedName: config.whatsappVerifiedName ?? "",
      displayPhone: config.whatsappDisplayPhone ?? "",
      recipients: config.whatsappBroadcastTo ?? [],
      template: config.whatsappTemplateName ?? "",
      templateLang: config.whatsappTemplateLang ?? "ar",
      connectedAt: config.whatsappConnectedAt ?? null,
      lastError: config.whatsappLastError ?? null,
    };
  },
});
