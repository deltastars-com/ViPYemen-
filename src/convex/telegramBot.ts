/**
 * 🤖 بوت تيليجرام الذي يردّ — Webhook + getUpdates
 *
 * لماذا هذا الملف؟
 *  كان البوت «إرسال فقط»: ينشر في القناة ولا يسمع أحداً. الآن صار يردّ على
 *  الرسائل والأوامر، بطريقتين متاحتين معاً (لا يعملان معاً في نفس الوقت):
 *
 *   1) Webhook  — تيليجرام يدفع كل تحديث إلى نقطة HTTP داخل خادم Convex
 *      (`POST /telegram/webhook` في `http.ts`). فوري، بلا تكلفة دورية.
 *   2) getUpdates — استعلام دوري عبر `crons.ts` كل ٥ ثوانٍ. احتياطي حين لا
 *      يكون رابط الخادم عاماً (تطوير محلي مثلاً)، ومفتاح إيقاف من اللوحة.
 *
 * قاعدة تيليجرام iron: لا يجوز استخدام `getUpdates` والويبهوك مُفعّل معاً
 * (يرد الخادم بـ 409)، لذلك يُحفظ رابط الويب هوك في الإعدادات، ويتوقف
 * الاستعلام الدوري تلقائياً ما دام الويب هوك شغّالاً، ويُصفَّر عند إيقافه.
 *
 * الأمان:
 *  • نقطة الويب هوك لا تقبل أي طلب بلا ترويسة سرّية
 *    (`X-Telegram-Bot-Api-Secret-Token`) مطابقة للسرّ المحفوظ — فلا أحد
 *    يستطيع أن يجعل البوت يردّ أو يُغرقه بطلبات.
 *  • الأفعال كلها تتطلب جلسة إدارة قبل أي اتصال خارجي.
 *  • هذا الملف لا يلمس التوكن ولا يُبطله؛ تغيير الاسم والوصف والأوامر
 *    يتم عبر Bot API مباشرةً (لا BotFather، لا /revoke).
 */
import { v, ConvexError } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import { telegramConfigForAction } from "./channelKeys";
import {
  FACEBOOK_GROUP_URL,
  FACEBOOK_PAGE_URL,
  INSTAGRAM_URL,
  TELEGRAM_CHANNEL_URL,
  TIKTOK_URL,
  WHATSAPP_COMMUNITY_URL,
  YOUTUBE_URL,
} from "../lib/socialLinks";

// ── ثوابت ────────────────────────────────────────────────────────────
const PLATFORM_BASE = "https://vi-p-yemen.vercel.app";
const WEBHOOK_PATH = "/telegram/webhook";

const SET_SECRET = "telegramWebhookSecret";
const SET_WEBHOOK_URL = "telegramWebhookUrl";
const SET_OFFSET = "telegramUpdateOffset";
const SET_POLLING = "telegramPollingEnabled";
const SET_LAST_POLL = "telegramLastPollAt";
const SET_LAST_ERROR = "telegramBotLastError";

/** أقسام المنصة: الأمر، الاسم المعروض، ورابط الصفحة على الموقع. */
const CATEGORY_ROUTES = [
  { cmd: "jobs", category: "jobs", label: "💼 الوظائف", path: "/jobs" },
  { cmd: "estate", category: "real_estate", label: "🏠 العقارات", path: "/real-estate" },
  { cmd: "emarket", category: "emarket", label: "🛒 السوق الإلكتروني", path: "/emarket" },
  { cmd: "software", category: "software", label: "💻 البرمجيات والبرمجة", path: "/software" },
] as const;

/**
 * الأوامر التي تُنشر في قائمة تيليجرام عبر `setMyCommands`.
 * البوت يردّ عليها كلها فعلاً، فالأزرار حقيقية وليست شكلية.
 */
export const BOT_COMMANDS: { command: string; description: string }[] = [
  { command: "start", description: "البداية والقائمة الرئيسية" },
  { command: "help", description: "طريقة استخدام البوت والأوامر" },
  { command: "jobs", description: "أحدث الوظائف المنشورة" },
  { command: "estate", description: "أحدث العقارات المنشورة" },
  { command: "emarket", description: "أحدث إعلانات السوق الإلكتروني" },
  { command: "software", description: "أحدث الخدمات البرمجية" },
  { command: "offers", description: "العروض والخصومات الحالية" },
  { command: "ads", description: "الإعلانات المميزة" },
  { command: "search", description: "بحث في كل الأقسام — مثال: /search مدرس" },
  { command: "links", description: "قنوات المنصة الرسمية" },
];

/** حدود setMyCommands الرسمية: الوصف 256 حرفاً والحد الأقصى 100 أمراً. */
export const BOT_COMMAND_LIMITS = { description: 256, count: 100 } as const;

// ── أدوات الإعدادات ──────────────────────────────────────────────────
type DbCtx = { db: any };

async function readSetting(ctx: DbCtx, key: string): Promise<string> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  return typeof row?.value === "string" ? row.value.trim() : "";
}

async function writeSetting(ctx: DbCtx, key: string, value: string): Promise<void> {
  const existing = await ctx.db
    .query("settings")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  if (existing) await ctx.db.patch(existing._id, { value });
  else await ctx.db.insert("settings", { key, value });
}

/** حالة البوت الداخلية — السرّ والإزاحة ووضع الاستعلام. */
export const botStateInternal = internalQuery({
  args: {},
  handler: async (ctx) => ({
    secret: await readSetting(ctx, SET_SECRET),
    webhookUrl: await readSetting(ctx, SET_WEBHOOK_URL),
    pollingEnabled: (await readSetting(ctx, SET_POLLING)) !== "off",
    offset: Number(await readSetting(ctx, SET_OFFSET)) || 0,
    lastPollAt: Number(await readSetting(ctx, SET_LAST_POLL)) || 0,
    lastError: await readSetting(ctx, SET_LAST_ERROR),
  }),
});

/** كتابة جزئية لحالة البوت (يُمرَّر فقط ما تغيّر). */
export const setBotStateInternal = internalMutation({
  args: {
    secret: v.optional(v.string()),
    webhookUrl: v.optional(v.string()),
    offset: v.optional(v.string()),
    pollingEnabled: v.optional(v.string()),
    lastPollAt: v.optional(v.string()),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, patch) => {
    const pairs: [string, string | undefined][] = [
      [SET_SECRET, patch.secret],
      [SET_WEBHOOK_URL, patch.webhookUrl],
      [SET_OFFSET, patch.offset],
      [SET_POLLING, patch.pollingEnabled],
      [SET_LAST_POLL, patch.lastPollAt],
      [SET_LAST_ERROR, patch.lastError],
    ];
    for (const [key, value] of pairs) {
      if (value === undefined) continue;
      await writeSetting(ctx, key, value);
    }
    return { ok: true };
  },
});

// ── نداء Bot API ─────────────────────────────────────────────────────
interface BotCall {
  ok: boolean;
  result: any;
  detail: string;
}

async function tgApi(
  token: string,
  method: string,
  payload: Record<string, unknown> = {}
): Promise<BotCall> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as any;
    if (data?.ok) return { ok: true, result: data.result, detail: "تم ✅" };
    return {
      ok: false,
      result: null,
      detail: String(data?.description ?? `تعذّر ${method} (HTTP ${res.status})`),
    };
  } catch (err: any) {
    return { ok: false, result: null, detail: `تعذّر الاتصال بتيليجرام: ${err?.message ?? String(err)}` };
  }
}

/** رابط الخادم العام —Webhook يحتاج رابط HTTPS عاماً يعمل فعلاً. */
/** رابط الخادم العام — يُحوَّل إلى نطاق HTTP Actions أدناه. */
/**
 * Convex HTTP Actions live on the `convex.site` domain, while
 * `CONVEX_SITE_URL` usually points at `convex.cloud` (sync/websocket). Telegram
 * pushes webhooks to HTTP Actions, so a `.convex.cloud` URL would 404 on every
 * message — hence the domain rewrite below (plus slash/path cleanup).
 */
function normalizeSiteUrl(value: string): string {
  return value
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/telegram\/webhook$/, "")
    .replace(/\.convex\.cloud$/, ".convex.site");
}

/**
 * أسماء المتغيرات التي تحتمل أن تحمل «HTTP Actions URL» كما يضيفها المالك في
 * لوحة Convex وفي أسرار المستودع — نقبل أياً منها مرتّبةً من الأدق.
 * وتشمل صيغتَي VITE_ الشائعتين حتى يصلح الإعداد نفسه محلياً وعلى المنصّات
 * (Vercel / Render / Supabase) بلا تغيير أسماء.
 */
const WEBHOOK_BASE_ENV_NAMES = [
  "TELEGRAM_WEBHOOK_BASE_URL",
  "CONVEX_HTTP_ACTIONS_URL",
  "VITE_HTTP_ACTIONS_URL",
  "VITE_CONVEX_SITE_URL",
  "CONVEX_ACTIONS_URL",
  "HTTP_ACTIONS_URL",
] as const;

/** رابط صريح من متغيرات البيئة أولاً، وإلا نستنتجه من `CONVEX_SITE_URL`. */
/**
 * 🔎 يتحقق أن نطاق HTTP Actions يخدم فعلاً قبل تسجيل الويب هوك.
 *
 * لماذا؟ نشر Convex قد يكون **HTTP Actions غير مفعّل** عليه (يردّ بـ
 * “This Convex deployment does not have HTTP actions enabled”)، وعندها يقبل
 * تيليجرام التسجيل ثم يرسل كل رسالة إلى موضع لا وجود له فيظهر الصمت.
 * فالطلب إلى مسارنا بـ GET يكفي: 404 على GET متوقّع (المسار POST فقط) ⇒
 * الخادم يخدم HTTP Actions، أما رسالة «غير مفعّل» فتعني مشكلة إعداد حقيقية.
 */
async function probeHttpActions(base: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${base}${WEBHOOK_PATH}`, { method: "GET" });
    const text = (await res.text().catch(() => "")).slice(0, 300);
    if (text.includes("does not have HTTP actions enabled")) {
      return {
        ok: false,
        detail:
          "⛔ HTTP Actions غير مفعّلة على هذا النشر — فعّلها من لوحة Convex: Settings ← HTTP Actions، ثم أعد المحاولة.",
      };
    }
    return { ok: true, detail: `الخادم يستجيب على منفذ HTTP Actions (HTTP ${res.status}).` };
  } catch (err: any) {
    return {
      ok: false,
      detail: `تعذّر الوصول إلى ${base}: ${err?.message ?? String(err)} — تحقّق أن الرابط صحيح وعام.`,
    };
  }
}

function resolveWebhookBase(): string {
  for (const name of WEBHOOK_BASE_ENV_NAMES) {
    const value = (process.env[name] ?? "").trim();
    if (value) return normalizeSiteUrl(value);
  }
  const site = (process.env.CONVEX_SITE_URL ?? "").trim();
  return site ? normalizeSiteUrl(site) : "";
}

function convexSiteUrl(): string {
  const url = resolveWebhookBase();
  if (!url) {
    throw new ConvexError(
      "تعذّر معرفة رابط HTTP Actions العامة. أضف متغير CONVEX_HTTP_ACTIONS_URL (أو VITE_HTTP_ACTIONS_URL أو TELEGRAM_WEBHOOK_BASE_URL) بقيمة https://<name>.convex.site — أو استخدم الاستعلام الدوري بدل الويب هوك."
    );
  }
  return url;
}

function safeSiteUrl(): string {
  return resolveWebhookBase();
}

/** سرّ عشوائي للويبهوك (1–256 حرفاً من A‑Z a‑z 0‑9 _ -). */
function randomSecret(): string {
  const part = () => crypto.randomUUID().replace(/-/g, "");
  return `${part()}${part()}`.slice(0, 64);
}

// ── نصوص الردّ ───────────────────────────────────────────────────────
const MENU_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "💼 الوظائف", url: `${PLATFORM_BASE}/jobs` },
      { text: "🏠 العقارات", url: `${PLATFORM_BASE}/real-estate` },
    ],
    [
      { text: "🛒 السوق الإلكتروني", url: `${PLATFORM_BASE}/emarket` },
      { text: "💻 البرمجيات", url: `${PLATFORM_BASE}/software` },
    ],
    [
      { text: "🎁 العروض", url: `${PLATFORM_BASE}/offers` },
      { text: "📡 القنوات", url: `${PLATFORM_BASE}/channels` },
    ],
    [{ text: "🌐 الموقع الكامل", url: PLATFORM_BASE }],
  ],
};

const MENU_TEXT = [
  "أهلاً بك في بوت منصة ViP Yemen 👋",
  "",
  "أنا البوت الرسمي للمنصة، وأردّ عليك مباشرةً. اختر من الأزرار، أو اكتب أمراً:",
  "",
  "• /jobs — أحدث الوظائف",
  "• /estate — أحدث العقارات",
  "• /emarket — السوق الإلكتروني",
  "• /software — البرمجيات",
  "• /offers — العروض والخصومات",
  "• /search مدرس — بحث في كل الأقسام",
  "• /help — كل الأوامر",
].join("\n");

const HELP_TEXT = [
  "🤖 أوامر البوت",
  "",
  ...BOT_COMMANDS.map((c) => `• /${c.command} — ${c.description}`),
  "",
  "💡 можно كتابة كلمة بحث بعد الأمر، مثال: /jobs مدرس",
  "🌐 كل الأقسام والنتائج كاملة على الموقع:",
  PLATFORM_BASE,
].join("\n");

function channelsText(): string {
  return [
    "📡 قنوات المنصة الرسمية",
    "",
    `• قناة تيليجرام: ${TELEGRAM_CHANNEL_URL}`,
    `• مجموعة فيسبوك: ${FACEBOOK_GROUP_URL}`,
    `• صفحة فيسبوك: ${FACEBOOK_PAGE_URL}`,
    `• يوتيوب: ${YOUTUBE_URL}`,
    `• تيك توك: ${TIKTOK_URL}`,
    `• انستغرام: ${INSTAGRAM_URL}`,
    `• مجتمع واتساب: ${WHATSAPP_COMMUNITY_URL}`,
    "",
    `🌐 الموقع: ${PLATFORM_BASE}`,
  ].join("\n");
}

// ── تنسيق النتائج ────────────────────────────────────────────────────
/** توحيد الحروف العربية والتشكيل ليطابق البحث كيفما كتبه المستخدم. */
function normalizeAr(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}

function haystack(row: any): string {
  return normalizeAr(
    [
      row?.title,
      row?.description,
      row?.address,
      row?.fullName,
      ...(Array.isArray(row?.fields)
        ? (row.fields as any[]).map((f) => `${f?.label ?? ""} ${f?.value ?? ""}`)
        : []),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function money(row: any): string {
  if (typeof row?.price !== "number" || row.price <= 0) return "";
  const currency = String(row?.currency ?? "ريال");
  return `💰 ${row.price.toLocaleString("en-US")} ${currency}`;
}

function itemLine(row: any, index: number): string {
  const parts: string[] = [];
  const title = String(row?.title ?? "بلا عنوان").slice(0, 120);
  parts.push(`${index + 1}️⃣ ${title}`);
  const price = money(row);
  if (price) parts.push(price);
  if (row?.address) parts.push(`📍 ${String(row.address).slice(0, 60)}`);
  if (row?.phone) parts.push(`📱 ${row.phone}`);
  return parts.join("\n");
}

// ── بناء الردود ──────────────────────────────────────────────────────
async function renderCategory(
  ctx: any,
  route: (typeof CATEGORY_ROUTES)[number],
  keyword: string
): Promise<string> {
  const rows = (await ctx.runQuery(api.submissions.listPublished, {
    category: route.category,
    limit: 40,
  })) as any[];
  const needle = keyword ? normalizeAr(keyword) : "";
  const found = needle ? rows.filter((r) => haystack(r).includes(needle)) : rows;
  if (found.length === 0) {
    return [
      `${route.label} — لا نتائج ${needle ? `لـ«${keyword}»` : "منشورة حالياً"} في هذا القسم.`,
      "",
      `📝 أرسل طلبك من: ${PLATFORM_BASE}${route.path}`,
      `أو جرّب البحث الشامل: /search ${keyword || "كلمة"}`,
    ].join("\n");
  }
  const shown = found.slice(0, 5);
  return [
    `${route.label} — أحدث ${found.length} عنصراً منشوراً${needle ? ` لـ«${keyword}»` : ""}:`,
    "",
    shown.map((item, i) => itemLine(item, i)).join("\n\n"),
    "",
    `📄 كل النتائج على: ${PLATFORM_BASE}${route.path}`,
    `🔎 بحث أدق: /${route.cmd} ${needle || "كلمة"}`,
  ].join("\n");
}

async function renderSearch(ctx: any, keyword: string): Promise<string> {
  const needle = normalizeAr(keyword);
  if (!needle) {
    return [
      "🔎 اكتب كلمة البحث بعد الأمر، مثال:",
      "• /search مدرس",
      "• /search شقة",
      "• /search موقع إلكتروني",
    ].join("\n");
  }
  const results: string[] = [];
  for (const route of CATEGORY_ROUTES) {
    const rows = (await ctx.runQuery(api.submissions.listPublished, {
      category: route.category,
      limit: 40,
    })) as any[];
    const found = rows.filter((r) => haystack(r).includes(needle));
    for (const row of found.slice(0, 2)) {
      results.push(`${route.label}\n${itemLine(row, 0)}`);
    }
    if (results.length >= 6) break;
  }
  if (results.length === 0) {
    return [
      `🔎 لا نتائج لـ«${keyword}» في أقسام الوظائف والعقارات والسوق والبرمجيات.`,
      "",
      `📝 سجّل طلبك مجاناً من: ${PLATFORM_BASE}`,
    ].join("\n");
  }
  return [
    `🔎 نتائج «${keyword}» (${results.length}):`,
    "",
    results.join("\n\n"),
    "",
    `🌐 البحث الكامل: ${PLATFORM_BASE}`,
  ].join("\n");
}

async function renderOffers(ctx: any): Promise<string> {
  const offers = (await ctx.runQuery(api.offers.listPublished, {})) as any[];
  if (offers.length === 0) {
    return [`🎁 لا عروض منشورة حالياً.`, "", `تابع العروض новاداً على: ${PLATFORM_BASE}/offers`].join("\n");
  }
  const lines = offers.slice(0, 5).map((o: any, i: number) => {
    const parts = [`${i + 1}️⃣ ${String(o.title ?? "").slice(0, 120)}`];
    if (o.originalPrice && o.offerPrice) {
      parts.push(`💰 ${o.offerPrice} بدلاً من ${o.originalPrice}`);
    }
    if (o.discountPercent) parts.push(`🏷 خصم ${o.discountPercent}%`);
    if (o.isFeatured) parts.push("⭐ عرض مميّز");
    return parts.join("\n");
  });
  return [
    `🎁 أحدث العروض (${offers.length}):`,
    "",
    lines.join("\n\n"),
    "",
    `📄 كل العروض: ${PLATFORM_BASE}/offers`,
  ].join("\n");
}

async function renderAds(ctx: any): Promise<string> {
  const ads = (await ctx.runQuery(api.ads.listActive, {})) as any[];
  if (ads.length === 0) {
    return [`📢 لا إعلانات مفعّلة حالياً.`, "", `أضف إعلاناً من لوحة الإدارة، أو تابع جديدنا على: ${PLATFORM_BASE}`].join("\n");
  }
  const lines = ads.slice(0, 4).map((a: any, i: number) => {
    const parts = [`${i + 1}️⃣ ${String(a.title ?? "").slice(0, 120)}`];
    if (a.message) parts.push(String(a.message).slice(0, 300));
    if (a.link) parts.push(`🔗 ${a.link}`);
    return parts.join("\n");
  });
  return [`📢 الإعلانات المفعّلة:`, "", lines.join("\n\n"), "", `🌐 ${PLATFORM_BASE}`].join("\n");
}

/** يردّ على تحديث واحد — قلب البوت، تستعمله الويب هوك والاستعلام معاً. */
async function replyToUpdate(ctx: any, update: any): Promise<{ ok: boolean; detail: string }> {
  const tg = await telegramConfigForAction(ctx);
  if (!tg.token) return { ok: false, detail: "لا يوجد توكن بوت" };

  const message = update?.message;
  const chatId = message?.chat?.id;
  if (chatId === undefined || chatId === null) {
    return { ok: true, detail: "تجاهل: تحديث بلا رسالة نصية" };
  }
  const raw = String(message?.text ?? message?.caption ?? "").trim();
  if (!raw) return { ok: true, detail: "تجاهل: رسالة بلا نص" };

  const isPrivate = message?.chat?.type === "private";
  if (!isPrivate && !raw.startsWith("/")) {
    return { ok: true, detail: "تجاهل: دردشة مجموعة بلا أمر" };
  }

  const split = raw.search(/\s/);
  const head = split === -1 ? raw : raw.slice(0, split);
  const rest = split === -1 ? "" : raw.slice(split + 1).trim();
  const command = head.replace(/^\//, "").split("@")[0].toLowerCase();
  const keyword = rest.replace(/\s+/g, " ").trim();

  let text: string;
  let keyboard: unknown;

  const route = CATEGORY_ROUTES.find((r) => r.cmd === command);
  if (command === "start" || command === "menu") {
    text = MENU_TEXT;
    keyboard = MENU_KEYBOARD;
  } else if (command === "help") {
    text = HELP_TEXT;
    keyboard = MENU_KEYBOARD;
  } else if (command === "search") {
    text = await renderSearch(ctx, rest);
    keyboard = MENU_KEYBOARD;
  } else if (command === "offers") {
    text = await renderOffers(ctx);
  } else if (command === "ads") {
    text = await renderAds(ctx);
  } else if (command === "links" || command === "channels") {
    text = channelsText();
    keyboard = MENU_KEYBOARD;
  } else if (route) {
    text = await renderCategory(ctx, route, keyword);
  } else {
    text = [
      "لم أفهم هذا الأمر 🙁",
      "",
      "اكتب /help لعرض كل الأوامر، أو /start للقائمة الرئيسية.",
    ].join("\n");
    keyboard = MENU_KEYBOARD;
  }

  const sent = await tgApi(tg.token, "sendMessage", {
    chat_id: chatId,
    text: text.slice(0, 4000),
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: keyboard } : {}),
  });
  return sent.ok
    ? { ok: true, detail: `ردّ /${command}` }
    : { ok: false, detail: sent.detail };
}

/** نقطة الدخول من مسار الويب هوك. */
export const processUpdate = internalAction({
  args: { update: v.any() },
  handler: async (ctx, { update }) => replyToUpdate(ctx, update),
});

/**
 * جلب التحديثات بالاستعلام (`getUpdates`) — يعمل من `crons.ts` كل ٥ ثوانٍ،
 * أو فوراً من زر «استعلام الآن» في اللوحة (مع `force` لتجاوز التحوّطات).
 */
export const pollUpdates = internalAction({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const state = await ctx.runQuery(internal.telegramBot.botStateInternal, {});
    if (!force) {
      if (!state.pollingEnabled) return { ok: true, skipped: "الاستعلام معطّل من اللوحة" };
      if (state.webhookUrl) {
        return { ok: true, skipped: "الويبهوك مُفعّل — لا يُسمح بالجمع بينهما" };
      }
    }
    const tg = await telegramConfigForAction(ctx);
    if (!tg.token) return { ok: false, detail: "لا يوجد توكن بوت" };

    const res = await tgApi(tg.token, "getUpdates", {
      ...(state.offset ? { offset: state.offset } : {}),
      limit: 20,
      timeout: 0,
      allowed_updates: ["message"],
    });
    if (!res.ok) {
      await ctx.runMutation(internal.telegramBot.setBotStateInternal, { lastError: res.detail });
      return { ok: false, detail: res.detail };
    }

    const updates = (res.result ?? []) as any[];
    let handled = 0;
    for (const update of updates) {
      try {
        const r = await replyToUpdate(ctx, update);
        if (r.ok) handled += 1;
      } catch (err: any) {
        console.error("[Telegram:Update] فشل:", err?.message ?? err);
      }
    }
    // نؤكّد الإزاحة بعد المعالجة فقط، فلا تضيع رسالة إن فشلت معالجة.
    const patch: Record<string, string> = { lastPollAt: String(Date.now()), lastError: "" };
    if (updates.length > 0) {
      patch.offset = String(Math.max(...updates.map((u) => Number(u.update_id) || 0)) + 1);
    }
    await ctx.runMutation(internal.telegramBot.setBotStateInternal, patch);
    return { ok: true, received: updates.length, handled };
  },
});

// ── أفعال الإدارة ────────────────────────────────────────────────────
/** حالة الويب هوك والاستعلام — للوحة التحكم. */
export const webhookStatus = action({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await ctx.runQuery(api.settings.getAll, { token });
    // ملاحظة: نحدد النوع صراحةً لتفادي الاستدعاء المتبادل في استنتاج الأنواع.
    const state: any = await ctx.runQuery(internal.telegramBot.botStateInternal, {});
    const tg = await telegramConfigForAction(ctx);
    if (!tg.token) {
      return {
        ok: false,
        detail: "لا يوجد توكن بوت — أضفه أولاً",
        botUsername: "",
        webhookActive: false,
        webhookUrl: "",
        expectedUrl: `${safeSiteUrl()}${WEBHOOK_PATH}`,
        pending: 0,
        telegramError: "",
        hasSecret: !!state.secret,
        pollingEnabled: state.pollingEnabled,
        lastPollAt: state.lastPollAt,
        lastError: state.lastError,
        commands: [] as { command: string; description: string }[],
      };
    }
    const [info, commands, me] = await Promise.all([
      tgApi(tg.token, "getWebhookInfo"),
      tgApi(tg.token, "getMyCommands"),
      tgApi(tg.token, "getMe"),
    ]);
    return {
      ok: info.ok,
      detail: info.ok ? "" : info.detail,
      botUsername: String(me.result?.username ?? ""),
      webhookActive: !!info.result?.url,
      webhookUrl: String(info.result?.url ?? ""),
      expectedUrl: `${safeSiteUrl()}${WEBHOOK_PATH}`,
      pending: Number(info.result?.pending_update_count ?? 0),
      telegramError: String(info.result?.last_error_message ?? ""),
      hasSecret: !!state.secret,
      pollingEnabled: state.pollingEnabled,
      lastPollAt: state.lastPollAt,
      lastError: state.lastError,
      commands: Array.isArray(commands.result) ? commands.result : [],
    };
  },
});

/** تفعيل الويب هوك — الردّ يصير فورياً بلا استعلام دوري. */
export const registerWebhook = action({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await ctx.runQuery(api.settings.getAll, { token });
    const tg = await telegramConfigForAction(ctx);
    if (!tg.token) return { ok: false, detail: "لا يوجد توكن بوت — أضفه أولاً" };

    const state = await ctx.runQuery(internal.telegramBot.botStateInternal, {});
    const base = convexSiteUrl();
    // لا نسجّل قبل التأكد أن منفذ HTTP Actions يعمل — وإلا قبل تيليجرام
    // رابطاً صامتاً لا يردّ على شيء.
    const probe = await probeHttpActions(base);
    if (!probe.ok) return { ok: false, detail: probe.detail };

    const secret = state.secret || randomSecret();
    const url = `${base}${WEBHOOK_PATH}`;
    const res = await tgApi(tg.token, "setWebhook", {
      url,
      secret_token: secret,
      allowed_updates: ["message"],
      drop_pending_updates: false,
    });
    if (!res.ok) return { ok: false, detail: res.detail };

    if (!state.secret) {
      await ctx.runMutation(internal.telegramBot.setBotStateInternal, { secret });
    }
    await ctx.runMutation(internal.telegramBot.setBotStateInternal, { webhookUrl: url, lastError: "" });
    return {
      ok: true,
      detail: `✅ صار الرد فورياً — تيليجرام يدفع التحديثات إلى ${url}`,
    };
  },
});

/** إيقاف الويب هوك (يعود للاستعلام الدوري أو الصمت). */
export const unregisterWebhook = action({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await ctx.runQuery(api.settings.getAll, { token });
    const tg = await telegramConfigForAction(ctx);
    if (!tg.token) return { ok: false, detail: "لا يوجد توكن بوت" };
    const res = await tgApi(tg.token, "deleteWebhook", { drop_pending_updates: false });
    if (!res.ok) return { ok: false, detail: res.detail };
    await ctx.runMutation(internal.telegramBot.setBotStateInternal, {
      webhookUrl: "",
      lastError: "",
    });
    return { ok: true, detail: "✅ أُوقف الويب هوك" };
  },
});

/** نشر قائمة الأوامر في تيليجرام (`setMyCommands`) — بلا BotFather. */
export const syncCommands = action({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await ctx.runQuery(api.settings.getAll, { token });
    const tg = await telegramConfigForAction(ctx);
    if (!tg.token) return { ok: false, detail: "لا يوجد توكن بوت" };

    for (const c of BOT_COMMANDS) {
      if (!/^[a-z0-9_]{1,32}$/.test(c.command)) {
        return { ok: false, detail: `اسم أمر غير صالح: ${c.command}` };
      }
      if (c.description.length > BOT_COMMAND_LIMITS.description) {
        return {
          ok: false,
          detail: `وصف الأمر /${c.command} يتجاوز ${BOT_COMMAND_LIMITS.description} حرفاً`,
        };
      }
    }
    if (BOT_COMMANDS.length > BOT_COMMAND_LIMITS.count) {
      return { ok: false, detail: `عدد الأوامر يتجاوز ${BOT_COMMAND_LIMITS.count}` };
    }

    const res = await tgApi(tg.token, "setMyCommands", {
      commands: BOT_COMMANDS.map((c) => ({
        command: c.command,
        description: c.description.slice(0, BOT_COMMAND_LIMITS.description),
      })),
    });
    return res.ok
      ? { ok: true, detail: `✅ نُشرت ${BOT_COMMANDS.length} أمراً في قائمة البوت` }
      : { ok: false, detail: res.detail };
  },
});

/** استعلام فوري عن الرسائل (بلا انتظار الدورة). */
export const pollNow = action({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<{ ok: boolean; detail: string }> => {
    await ctx.runQuery(api.settings.getAll, { token });
    const res: any = await ctx.runAction(internal.telegramBot.pollUpdates, { force: true });
    if (!res?.ok) return { ok: false, detail: res?.detail ?? "تعذّر الاستعلام" };
    return {
      ok: true,
      detail: `✅ استعلام فوري — وصلت ${res.received ?? 0} رسالة`,
    };
  },
});

/** تشغيل/إيقاف الاستعلام الدوري من اللوحة. */
export const setPolling = mutation({
  args: { token: v.string(), enabled: v.boolean() },
  handler: async (ctx, { token, enabled }) => {
    await ctx.runQuery(api.settings.getAll, { token });
    await writeSetting(ctx, SET_POLLING, enabled ? "on" : "off");
    return { ok: true, pollingEnabled: enabled };
  },
});
