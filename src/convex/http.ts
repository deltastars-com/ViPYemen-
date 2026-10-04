// 🌐 سيرفر HTTP عام للمنصة — نقاط مجانية للاستخدام من أنظمة المراقبة
// والروبوتات الخارجية المجانية (cron-job.org · UptimeRobot · Better Stack …)
// وقنوات المنصة:
//
//   GET /                → بانر نصي بسيط (إثبات أن السيرفر يعمل)
//   GET /health          → فحص صحة سريع (200 دائماً + حالة الباك اند)
//   GET /ping            → نبضة إبقاء-التشغيل (keep-alive) للمرايا المجانية
//   GET /mirrors         → سجل مرايا الاستضافة المجانية للمنصة
//   GET /channels        → قنوات المنصة الرسمية + صحة كل قناة
//   POST /telegram/webhook → بوابة ردّ بوت تيليجرام (تترويسة سرّية فقط)
//
// لا تُرسل أي نقطة أسراراً ولا بيانات عملاء: أعداد وحالات فقط.
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { CHANNEL_NAMES } from "./channelPush";
import {
  FACEBOOK_GROUP_URL,
  FACEBOOK_PAGE_URL,
  INSTAGRAM_URL,
  TELEGRAM_BOT_URL,
  TELEGRAM_CHANNEL_URL,
  TIKTOK_URL,
  WHATSAPP_COMMUNITY_URL,
  YOUTUBE_URL,
} from "../lib/socialLinks";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

/** مرايا الاستضافة المجانية — تُنشر آلياً من المستودع عند كل دفعة. */
const MIRRORS: { label: string; url: string; role: string }[] = [
  { label: "Vercel", url: "https://vi-p-yemen.vercel.app", role: "primary" },
  { label: "Render", url: "https://vipyemen.onrender.com", role: "mirror" },
  { label: "GitHub Pages", url: "https://deltastars-com.github.io/ViPYemen-/", role: "mirror" },
  { label: "Netlify", url: "https://vipyemen.netlify.app", role: "mirror" },
  { label: "Cloudflare Pages", url: "https://vipyemen.pages.dev", role: "mirror" },
];

/** روابط القنوات الرسمية — من نفس المصدر الذي تستخدمه الواجهة (مصدر واحد). */
const CHANNELS: { id: string; label: string; url: string }[] = [
  { id: "telegram", label: "قناة تيليجرام", url: TELEGRAM_CHANNEL_URL },
  { id: "telegram_bot", label: "بوت تيليجرام", url: TELEGRAM_BOT_URL },
  { id: "whatsapp", label: "مجتمع واتساب", url: WHATSAPP_COMMUNITY_URL },
  {
    id: "whatsapp_group",
    label: "مجتمع/جروب واتساب",
    url: WHATSAPP_COMMUNITY_URL,
  },
  { id: "facebook_page", label: "صفحة فيسبوك", url: FACEBOOK_PAGE_URL },
  { id: "facebook_group", label: "مجموعة فيسبوك", url: FACEBOOK_GROUP_URL },
  { id: "youtube", label: "قناة يوتيوب", url: YOUTUBE_URL },
  { id: "tiktok", label: "حساب تيك توك", url: TIKTOK_URL },
  { id: "instagram", label: "حساب انستغرام", url: INSTAGRAM_URL },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

const http = httpRouter();

http.route({
  path: "/",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      [
        "ViP Yemen — Platform API",
        "منصة التوظيف والتسويق العقاري والإلكتروني والبرمجيات — اليمن",
        "",
        "GET /health    فحص صحة الباك اند",
        "GET /ping      نبضة إبقاء التشغيل",
        "GET /mirrors   مرايا الاستضافة المجانية",
        "GET /channels  قنوات المنصة وصحتها",
        "POST /telegram/webhook  بوابة رد البوت (تترويسة سرّية)",
      ].join("\n"),
      { headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8" } }
    );
  }),
});

// فحص صحة: يرد 200 دائماً ما دام الباك اند يعمل، مع أعداد مختصرة بلا أي أسرار.
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const started = Date.now();
    let state: { published: number; open: number; sold: number } | null = null;
    let error: string | undefined;
    try {
      const snapshot = await ctx.runQuery(api.controlPanel.publicState, {});
      state = {
        published: snapshot.counts.open + snapshot.counts.closed,
        open: snapshot.counts.open,
        sold: snapshot.counts.closed,
      };
    } catch (err: any) {
      error = err?.message ?? String(err);
    }
    return json(
      {
        ok: !error,
        service: "vip-yemen",
        time: new Date().toISOString(),
        latencyMs: Date.now() - started,
        state,
        error,
      },
      error ? 503 : 200
    );
  }),
});

// نبضة إبقاء التشغيل — يستخدمها روبوت مجاني (cron-job.org / GitHub Actions)
// كل 10 دقائق حتى لا تدخل المرايا المجانية في نوم الخمول.
http.route({
  path: "/ping",
  method: "GET",
  handler: httpAction(async () => {
    return json({ ok: true, pong: Date.now(), service: "vip-yemen" });
  }),
});

http.route({
  path: "/mirrors",
  method: "GET",
  handler: httpAction(async () => {
    return json({ ok: true, count: MIRRORS.length, mirrors: MIRRORS });
  }),
});

http.route({
  path: "/channels",
  method: "GET",
  handler: httpAction(async (ctx) => {
    let health: { channel: string; status: string; detail: string; checkedAt: number }[] = [];
    try {
      const rows = (await ctx.runQuery(internal.channelPush.listChannelStatusPublic, {})) ?? [];
      health = rows as typeof health;
    } catch {
      /* لا سجل صحة بعد — نُعيد قائمة القنوات وحدها */
    }
    let facebookBootstrap: unknown = null;
    try {
      facebookBootstrap = await ctx.runQuery(internal.channelPush.getBootstrapStatePublic, {});
    } catch {
      /* لا حالة استيراد بعد */
    }
    let facebookRenewal: unknown = null;
    try {
      facebookRenewal = await ctx.runQuery(internal.channelPush.getRenewalStatePublic, {});
    } catch {
      /* لا حالة تجديد بعد */
    }
    const byChannel = new Map(health.map((row) => [row.channel, row]));
    return json({
      ok: true,
      facebookBootstrap,
      facebookRenewal,
      channels: CHANNELS.map((c) => ({
        ...c,
        managed: (CHANNEL_NAMES as readonly string[]).includes(c.id),
        status: byChannel.get(c.id)?.status ?? "unknown",
        detail: byChannel.get(c.id)?.detail ?? "",
        checkedAt: byChannel.get(c.id)?.checkedAt ?? null,
      })),
    });
  }),
});

http.route({
  path: "/health",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS })),
});

// ── 🤖 بوابة رد بوت تيليجرام (Webhook) ────────────────────────────────
//
// يدفع تيليجرام هنا كل تحديث، فنردّ على الرسائل والأوامر فوراً.
//
// 🔐 الأمان: لا يُقبل أي طلب بلا ترويسة `X-Telegram-Bot-Api-Secret-Token`
//    مطابقة للسرّ المحفوظ في الإعدادات — فلا أحد غير تيليجرام يملأ
//    المستودع بطلبات. وإن لم يُضبط السرّ بعد، تُرفض كل الطلبات (403).
//
// ⚡ نردّ دائماً بـ 200 حتى لو أخطأنا: غير ذلك يعيد تيليجرام الإرسال عشرات
//    المرات فتغرق الخوادم بلا فائدة. الخطأ يُسجَّل بدل ذلك.
http.route({
  path: "/telegram/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let expected = "";
    try {
      expected = (await ctx.runQuery(internal.telegramBot.botStateInternal, {})).secret;
    } catch (err: any) {
      console.error("[Telegram:Webhook] تعذّر قراءة السرّ:", err?.message ?? err);
    }
    const provided = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
    if (!expected || provided !== expected) {
      return json({ ok: false, error: "forbidden" }, 403);
    }

    let update: unknown = null;
    try {
      update = await request.json();
    } catch {
      return json({ ok: true, detail: "طلب بلا JSON" });
    }
    if (!update || typeof update !== "object") {
      return json({ ok: true, detail: "طلب بلا تحديث" });
    }

    try {
      const res = await ctx.runAction(internal.telegramBot.processUpdate, { update });
      return json({ ok: true, detail: res.detail });
    } catch (err: any) {
      console.error("[Telegram:Webhook] فشل المعالجة:", err?.message ?? err);
      return json({ ok: true, detail: "تعذّرت معالجة التحديث" });
    }
  }),
});

export default http;
