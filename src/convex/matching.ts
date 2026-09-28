/**
 * 🧠 محرك التوافق والملائمة والتطابق — ViP Yemen
 *
 * يقارن بين كل عرض وطلب منشور في المنصة ويحتسب «نسبة التوافق» من كل النواحي:
 * المؤهلات، الخبرات، الموقع، السعر/الراتب، نوع العمل، المواصفات والغرض.
 * المحرك حتمي (deterministic) وشفّاف: كل نسبة مرفقة بأسبابها وبنودها.
 *
 * الأطراف:
 *   التوظيف   : صاحب المنشأة (عرض/شاغر)  ⇄  الباحث عن عمل (طلب/كادر)
 *   العقارات  : المالك (عرض عقار)        ⇄  الباحث عن عقار (طلب)
 *   التسويق   : البائع (منتج)            ⇄  المشتري (طلب)
 *   البرمجيات : خدمات المنصة المنشورة    ⇄  طالب الخدمة
 *
 * النتائج تُحفظ في جدول matchSuggestions كأرشيف قابل للتتبع (مُبلَّغ/تواصل/مكتمل).
 */
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./auth";
import { internal } from "./_generated/api";

export const MIN_MATCH_SCORE = 40;
export const MATCH_STATUSES = ["new", "notified", "contacted", "matched", "closed"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

/** أطراف المطابقة لكل قسم: من يطلب (demand) ومن يعرض (supply). */
const SIDES: Record<string, { demand: string[]; supply: string[] }> = {
  jobs: { demand: ["employer"], supply: ["seeker"] },
  real_estate: { demand: ["buyer"], supply: ["owner"] },
  emarket: { demand: ["buyer"], supply: ["seller"] },
  software: { demand: ["client"], supply: [] },
};

export interface Matchable {
  id: string;
  category: string;
  type: string;
  title: string;
  description?: string;
  fields: Record<string, unknown>;
  price?: number;
  currency?: string;
  address?: string;
  fullName: string;
  phone: string;
  phoneVerified: boolean;
  status: string;
  createdAt: number;
}

export interface MatchDimension {
  key: string;
  label: string;
  weight: number;
  /** 0..1 — أو null إن لم تتوفر بيانات كافية للحكم */
  value: number | null;
}

export interface MatchScore {
  /** 0..100 */
  score: number;
  dimensions: MatchDimension[];
  reasons: string[];
}

export interface ScoredPair {
  category: string;
  request: Matchable;
  offer: Matchable;
  score: number;
  reasons: string[];
  dimensions: MatchDimension[];
}

/* ─────────────────────────── أدوات نصية ─────────────────────────── */

const ARABIC_DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

const STOP_WORDS = new Set([
  "في", "من", "على", "عن", "الى", "إلى", "مع", "هذا", "هذه", "ذلك", "التي",
  "الذي", "او", "أو", "و", "لا", "ما", "هل", "كل", "بعد", "قبل", "حسب",
  "the", "and", "for", "with", "a", "an", "of", "to", "in", "on",
]);

export function normalizeDigits(input: string): string {
  return input.replace(/[٠-٩]/g, (d) => ARABIC_DIGITS[d] ?? d);
}

export function tokenize(input: unknown): string[] {
  if (input === null || input === undefined) return [];
  const text = normalizeDigits(String(input))
    .toLowerCase()
    // إزالة التشكيل والتطويل
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
  return text;
}

/** نسبة تداخل الكلمات (0..1) أو null إذا كان أحد الطرفين غائباً. */
export function overlap(a: string[], b: string[]): number | null {
  if (a.length === 0 || b.length === 0) return null;
  const setB = new Set(b);
  let hits = 0;
  for (const word of a) if (setB.has(word)) hits += 1;
  return Math.min(1, hits / Math.min(a.length, b.length));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function norm(value: unknown): string {
  return normalizeDigits(String(value ?? "")).trim().toLowerCase();
}

export function fieldText(doc: Matchable, name: string): string {
  const value = doc.fields?.[name];
  if (value === null || value === undefined) return "";
  return normalizeDigits(String(value)).trim();
}

export function blobOf(doc: Matchable): string {
  const fieldValues = Object.values(doc.fields ?? {}).map((val) => String(val ?? ""));
  return [doc.title, doc.description ?? "", doc.address ?? "", ...fieldValues].join(" ").toLowerCase();
}

function tokensOf(doc: Matchable): string[] {
  return tokenize(blobOf(doc));
}

/** أول رقم في النص (يدعم الأرقام العربية والفواصل). */
export function numberFrom(input: string | undefined | null): number | null {
  if (!input) return null;
  const clean = normalizeDigits(String(input)).replace(/[,\u066C]/g, "");
  const match = clean.match(/\d+(\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

const YEAR_WORDS = /(سنه|سنة|سنوات|سنين|عام|أعوام|اعوام|year|years)/;

/** استخراج سنوات الخبرة من نص حر: «3 سنوات»، «خبرة 5 سنوات»، «5 years». */
export function yearsFrom(input: string | undefined | null): number | null {
  if (!input) return null;
  const clean = normalizeDigits(String(input)).toLowerCase();
  const matches = [...clean.matchAll(/(\d{1,2})\s*(\+)?\s*([^\s]{0,8})/g)];
  let best: number | null = null;
  for (const match of matches) {
    const years = Number(match[1]);
    const tail = match[3] ?? "";
    if (YEAR_WORDS.test(tail) || YEAR_WORDS.test(clean.slice(match.index ?? 0, (match.index ?? 0) + 24))) {
      best = best === null ? years : Math.max(best, years);
    }
  }
  if (best === null) {
    // صيغة «خبرة: 3» بدون كلمة سنوات
    const direct = clean.match(/(?:خبره|خبرة|experience)\s*[:：]?\s*(\d{1,2})/);
    if (direct) best = Number(direct[1]);
  }
  return best;
}

/* ─────────────────────── احتساب أبعاد التوافق ─────────────────────── */

function exactDimension(key: string, label: string, weight: number, a: string, b: string, loose: string[] = []): MatchDimension {
  if (!a || !b) return { key, label, weight, value: null };
  if (a === b) return { key, label, weight, value: 1 };
  if (loose.includes(a) || loose.includes(b)) return { key, label, weight, value: 0.5 };
  return { key, label, weight, value: 0.1 };
}

function budgetDimension(key: string, label: string, weight: number, want: number | null, have: number | null): MatchDimension {
  if (want === null || have === null || have <= 0 || want <= 0) {
    return { key, label, weight, value: null };
  }
  // الميزانية تغطي السعر المطلوب ⇢ توافق تام، وإلا تنخفض النسبة تدريجياً
  const value = want >= have ? 1 : clamp01((want / have) ** 1.5);
  return { key, label, weight, value };
}

function jobsDimensions(demand: Matchable, supply: Matchable): MatchDimension[] {
  const demandProfession = norm(fieldText(demand, "profession"));
  const supplyProfession = norm(fieldText(supply, "profession"));
  let profession: number | null = null;
  if (demandProfession && supplyProfession) {
    profession = demandProfession === supplyProfession
      ? 1
      : demandProfession.includes(supplyProfession) || supplyProfession.includes(demandProfession)
        ? 0.7
        : demandProfession === "أخرى" || supplyProfession === "أخرى"
          ? 0.45
          : 0.1;
  } else if (demandProfession || supplyProfession) {
    const known = demandProfession || supplyProfession;
    profession = blobOf(demandProfession ? supply : demand).includes(known) ? 0.85 : null;
  }

  // الخبرات: سنوات الخبرة المطلوبة ⇄ سنوات خبرة الكادر
  const needYears = yearsFrom(
    [fieldText(demand, "requirements"), demand.description ?? "", demand.title].join(" ")
  );
  const haveYears = yearsFrom(
    [fieldText(supply, "experience"), fieldText(supply, "qualifications"), supply.description ?? ""].join(" ")
  );
  let experience: number | null = null;
  if (needYears !== null && haveYears !== null) {
    experience = haveYears >= needYears
      ? 1
      : clamp01((haveYears / Math.max(needYears, 1)) * 0.85);
  } else {
    // بديل نصي: تداخل كلمات الخبرة
    experience = overlap(
      tokenize([fieldText(supply, "experience"), fieldText(supply, "qualifications")].join(" ")),
      tokenize([fieldText(demand, "requirements"), demand.description ?? ""].join(" "))
    );
  }

  const qualifications = overlap(
    tokenize(fieldText(supply, "qualifications")),
    tokenize([fieldText(demand, "requirements"), demand.description ?? ""].join(" "))
  );

  let location: number | null = null;
  const demandAddress = tokenize(demand.address);
  const supplyAddress = tokenize(supply.address);
  if (demandAddress.length > 0 && supplyAddress.length > 0) {
    location = overlap(demandAddress, supplyAddress);
    if (location !== null) {
      const joinedDemand = demandAddress.join(" ");
      const joinedSupply = supplyAddress.join(" ");
      if (joinedDemand.includes(joinedSupply) || joinedSupply.includes(joinedDemand)) {
        location = Math.max(location, 0.9);
      }
    }
  }

  const offeredSalary = numberFrom(fieldText(demand, "salary")) ?? demand.price ?? null;
  const expectedSalary = numberFrom(fieldText(supply, "expectedSalary")) ?? supply.price ?? null;
  const salary = budgetDimension("salary", "الراتب", 16, expectedSalary, offeredSalary);

  const workType = norm(fieldText(demand, "workType"));
  let workplace: number | null = null;
  if (workType) {
    // نوع الدوام مذكور صريحاً في طلب الكادر ⇢ توافق تام، وإلا فالنسبة محايدة
    workplace = blobOf(supply).includes(workType) ? 1 : 0.5;
  }

  return [
    { key: "profession", label: "التخصص / المهنة", weight: 32, value: profession },
    { key: "experience", label: "الخبرات", weight: 20, value: experience },
    { key: "qualifications", label: "المؤهلات", weight: 18, value: qualifications },
    { key: "location", label: "الموقع", weight: 12, value: location },
    salary,
    { key: "workplace", label: "مكان العمل / نوع الدوام", weight: 6, value: workplace },
  ];
}

function realEstateDimensions(demand: Matchable, supply: Matchable): MatchDimension[] {
  const propertyType = exactDimension(
    "propertyType", "نوع العقار", 30,
    norm(fieldText(demand, "propertyType")), norm(fieldText(supply, "propertyType")),
    ["أخرى"]
  );

  const demandDistrict = tokenize([fieldText(demand, "district"), demand.address ?? ""].join(" "));
  const supplyDistrict = tokenize([fieldText(supply, "district"), supply.address ?? ""].join(" "));
  let location: number | null = overlap(demandDistrict, supplyDistrict);
  if (location !== null && location > 0.99) location = 1;

  const PURPOSE_PAIRS: Record<string, string[]> = {
    "شراء": ["بيع", "بيع أو إيجار"],
    "إيجار": ["إيجار", "بيع أو إيجار"],
    "شراء أو إيجار": ["بيع", "إيجار", "بيع أو إيجار"],
  };
  const wantPurpose = fieldText(demand, "purpose");
  const havePurpose = fieldText(supply, "purpose");
  let purpose: number | null = null;
  if (wantPurpose && havePurpose) {
    if (wantPurpose === havePurpose) purpose = 1;
    else if ((PURPOSE_PAIRS[wantPurpose] ?? []).includes(havePurpose)) purpose = 0.85;
    else purpose = 0.1;
  }

  const budget = budgetDimension("budget", "السعر / الميزانية", 30, demand.price ?? null, supply.price ?? null);

  return [
    propertyType,
    { key: "location", label: "الحي / الموقع", weight: 25, value: location },
    { key: "purpose", label: "الغرض", weight: 15, value: purpose },
    budget,
  ];
}

function emarketDimensions(demand: Matchable, supply: Matchable): MatchDimension[] {
  const productType = exactDimension(
    "productType", "نوع المنتج", 32,
    norm(fieldText(demand, "productType")), norm(fieldText(supply, "productType")),
    ["أخرى"]
  );
  const brand = overlap(tokenize(fieldText(demand, "brand")), tokenize(fieldText(supply, "brand")));
  const budget = budgetDimension("budget", "السعر / الميزانية", 36, demand.price ?? null, supply.price ?? null);
  const location = overlap(tokenize(demand.address), tokenize(supply.address));
  const condition = fieldText(supply, "condition");

  return [
    productType,
    { key: "brand", label: "الماركة / الموديل", weight: 18, value: brand },
    budget,
    { key: "location", label: "مكان التسليم", weight: 8, value: location },
    { key: "condition", label: "الحالة", weight: 6, value: condition ? (condition.startsWith("جديد") ? 1 : 0.7) : null },
  ];
}

function softwareDimensions(demand: Matchable, offer: Matchable): MatchDimension[] {
  const projectType = norm(fieldText(demand, "projectType"));
  const offerBlob = blobOf(offer);
  const projectMatch = projectType
    ? offerBlob.includes(projectType) ? 1 : overlap(tokenize(projectType), tokenize(offerBlob))
    : null;
  const similarity = overlap(tokensOf(demand), tokensOf(offer));
  const budget = budgetDimension(
    "budget", "الميزانية", 24,
    numberFrom(fieldText(demand, "budget")) ?? demand.price ?? null,
    offer.price ?? null
  );
  return [
    { key: "projectType", label: "نوع الخدمة", weight: 36, value: projectMatch },
    { key: "similarity", label: "توافق المتطلبات", weight: 30, value: similarity },
    budget,
    { key: "location", label: "الموقع", weight: 10, value: overlap(tokenize(demand.address), tokenize(offer.address)) },
  ];
}

export function dimensionsFor(category: string, demand: Matchable, supply: Matchable): MatchDimension[] {
  switch (category) {
    case "jobs":
      return jobsDimensions(demand, supply);
    case "real_estate":
      return realEstateDimensions(demand, supply);
    case "emarket":
      return emarketDimensions(demand, supply);
    case "software":
      return softwareDimensions(demand, supply);
    default:
      return [];
  }
}

const REASON_MIN = 0.6;

export function scorePair(category: string, demand: Matchable, supply: Matchable): MatchScore {
  const dimensions = dimensionsFor(category, demand, supply);
  const usable = dimensions.filter((dimension) => dimension.value !== null);
  const totalWeight = usable.reduce((sum, dimension) => sum + dimension.weight, 0);
  if (totalWeight === 0) return { score: 0, dimensions, reasons: [] };

  const raw = usable.reduce((sum, dimension) => sum + (dimension.value ?? 0) * dimension.weight, 0) / totalWeight;
  let score = Math.round(raw * 100);

  // مكافأة الموثوقية: رقمان موثقان يرفعان النسبة قليلاً (حد أقصى 100)
  if (demand.phoneVerified && supply.phoneVerified) score = Math.min(100, score + 4);

  const reasons = usable
    .filter((dimension) => (dimension.value ?? 0) >= REASON_MIN)
    .sort((a, b) => b.weight * (b.value ?? 0) - a.weight * (a.value ?? 0))
    .slice(0, 4)
    .map((dimension) => `${dimension.label}: ${Math.round((dimension.value ?? 0) * 100)}%`);

  return { score, dimensions, reasons };
}

/* ───────────────────────── بناء الأزواج ───────────────────────── */

function toMatchable(row: {
  _id: unknown;
  category: string;
  type: string;
  title: string;
  description?: string;
  fields: unknown;
  price?: number;
  currency?: string;
  address?: string;
  fullName: string;
  phone: string;
  phoneVerified: boolean;
  status: string;
  createdAt: number;
}): Matchable {
  return {
    id: String(row._id),
    category: row.category,
    type: row.type,
    title: row.title,
    description: row.description,
    fields: (row.fields ?? {}) as Record<string, unknown>,
    price: row.price,
    currency: row.currency,
    address: row.address,
    fullName: row.fullName,
    phone: row.phone,
    phoneVerified: row.phoneVerified,
    status: row.status,
    createdAt: row.createdAt,
  };
}

// المطابقة تجري بين العناصر «المفتوحة» فقط: الطلب المنشور أو الشاغر القائم.
// ما تم بيعه أو توظيفه يخرج تلقائياً من دائرة الترشيح.
const LIVE_STATUSES = new Set(["published"]);

export function buildPairs(
  rows: Matchable[],
  opts: { category?: string; minScore?: number; limit?: number } = {}
): ScoredPair[] {
  const minScore = opts.minScore ?? MIN_MATCH_SCORE;
  const byCategory = new Map<string, Matchable[]>();
  for (const row of rows) {
    if (!LIVE_STATUSES.has(row.status)) continue;
    if (opts.category && row.category !== opts.category) continue;
    const list = byCategory.get(row.category) ?? [];
    list.push(row);
    byCategory.set(row.category, list);
  }

  const pairs: ScoredPair[] = [];
  for (const [category, list] of byCategory.entries()) {
    const sides = SIDES[category];
    if (!sides) continue;
    const demands = list.filter((row) => sides.demand.includes(row.type)).slice(0, 80);
    const supplies = list.filter((row) => sides.supply.includes(row.type)).slice(0, 80);
    for (const demand of demands) {
      for (const supply of supplies) {
        if (demand.id === supply.id) continue;
        if (demand.phone === supply.phone) continue;
        const { score, reasons, dimensions } = scorePair(category, demand, supply);
        if (score < minScore) continue;
        pairs.push({ category, request: demand, offer: supply, score, reasons, dimensions });
      }
    }
  }
  pairs.sort((a, b) => b.score - a.score);
  const limit = opts.limit ?? 60;
  return pairs.slice(0, limit);
}

/* ───────────────────── قواعد البيانات والاستعلامات ───────────────────── */

async function loadMatchables(ctx: QueryCtx | MutationCtx, category?: string): Promise<Matchable[]> {
  const rows = category
    ? await ctx.db
        .query("submissions")
        .withIndex("by_category_status", (q) => q.eq("category", category))
        .take(400)
    : await ctx.db.query("submissions").withIndex("by_created").order("desc").take(600);
  return rows.map(toMatchable);
}

/** للبرمجيات: خدمات المنصة المنشورة تُعدّ الطرف المقابل للطلبات. */
async function loadServiceOffers(ctx: QueryCtx | MutationCtx): Promise<Matchable[]> {
  const offers = await ctx.db
    .query("offers")
    .withIndex("by_status", (q) => q.eq("status", "published"))
    .collect();
  return offers.map((offer) => ({
    id: `offer:${offer._id}`,
    category: "software",
    type: "service",
    title: offer.title,
    description: offer.description,
    fields: { projectType: offer.title },
    price: offer.offerPrice ?? offer.originalPrice,
    address: "اليمن",
    fullName: "منصة ViP Yemen — قسم البرمجيات",
    phone: "00967711780999",
    phoneVerified: true,
    status: "published",
    createdAt: offer.createdAt,
  }));
}

function pairsWithServices(rows: Matchable[], services: Matchable[], opts: { limit?: number } = {}): ScoredPair[] {
  const clients = rows.filter((row) => row.category === "software" && LIVE_STATUSES.has(row.status));
  const pairs: ScoredPair[] = [];
  for (const client of clients) {
    for (const service of services) {
      if (client.phone === service.phone) continue;
      const { score, reasons, dimensions } = scorePair("software", client, service);
      if (score < MIN_MATCH_SCORE) continue;
      pairs.push({ category: "software", request: client, offer: service, score, reasons, dimensions });
    }
  }
  pairs.sort((a, b) => b.score - a.score);
  return pairs.slice(0, opts.limit ?? 30);
}

/** لوحة التوافق: أفضل الأزواج المطابقة حالياً بين كل العروض والطلبات. */
export const listMatches = query({
  args: {
    token: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
    minScore: v.optional(v.number()),
  },
  handler: async (ctx, { token, category, limit, minScore }) => {
    await requireAdmin(ctx, token);
    const rows = await loadMatchables(ctx, category);
    const pairs = buildPairs(rows, { category, limit, minScore });
    if (!category || category === "software") {
      const services = await loadServiceOffers(ctx);
      pairs.push(...pairsWithServices(rows, services, { limit: 12 }));
      pairs.sort((a, b) => b.score - a.score);
    }
    const serialized = pairs.slice(0, limit ?? 60).map((pair) => ({
      key: `${pair.request.id}|${pair.offer.id}`,
      category: pair.category,
      score: pair.score,
      reasons: pair.reasons,
      dimensions: pair.dimensions.filter((dimension) => dimension.value !== null),
      request: {
        id: pair.request.id,
        title: pair.request.title,
        name: pair.request.fullName,
        phone: pair.request.phone,
        type: pair.request.type,
        status: pair.request.status,
        address: pair.request.address,
        price: pair.request.price,
        currency: pair.request.currency,
      },
      offer: {
        id: pair.offer.id,
        title: pair.offer.title,
        name: pair.offer.fullName,
        phone: pair.offer.phone,
        type: pair.offer.type,
        status: pair.offer.status,
        address: pair.offer.address,
        price: pair.offer.price,
        currency: pair.offer.currency,
      },
    }));
    return { total: pairs.length, matches: serialized };
  },
});

/** كل المطابقات المرشّحة لطلب واحد (للمراجعة الإدارية أو الترشيح اليدوي). */
export const listMatchesFor = query({
  args: { token: v.string(), id: v.string() },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    const all = await loadMatchables(ctx);
    const target = all.find((row) => row.id === id);
    if (!target) return { matches: [] };
    const sides = SIDES[target.category];
    if (!sides) return { matches: [] };
    const isDemand = sides.demand.includes(target.type);
    const pool = all.filter(
      (row) =>
        row.category === target.category &&
        row.id !== target.id &&
        LIVE_STATUSES.has(row.status) &&
        (isDemand ? sides.supply.includes(row.type) : sides.demand.includes(row.type))
    );
    const pairs: ScoredPair[] = [];
    for (const other of pool) {
      const demand = isDemand ? target : other;
      const supply = isDemand ? other : target;
      const { score, reasons, dimensions } = scorePair(target.category, demand, supply);
      if (score < MIN_MATCH_SCORE) continue;
      pairs.push({ category: target.category, request: demand, offer: supply, score, reasons, dimensions });
    }
    pairs.sort((a, b) => b.score - a.score);
    return {
      matches: pairs.slice(0, 25).map((pair) => ({
        score: pair.score,
        reasons: pair.reasons,
        title: isDemand ? pair.offer.title : pair.request.title,
        name: isDemand ? pair.offer.fullName : pair.request.fullName,
        phone: isDemand ? pair.offer.phone : pair.request.phone,
        dimensions: pair.dimensions.filter((dimension) => dimension.value !== null),
      })),
    };
  },
});

/** أرشيف المطابقات المحفوظة (مع حالة التبليغ والمتابعة). */
export const listSuggestions = query({
  args: {
    token: v.string(),
    status: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, status, category, limit }) => {
    await requireAdmin(ctx, token);
    let rows = await ctx.db
      .query("matchSuggestions")
      .withIndex("by_created")
      .order("desc")
      .take(limit ?? 300);
    if (status && status !== "all") rows = rows.filter((row) => row.status === status);
    if (category && category !== "all") rows = rows.filter((row) => row.category === category);
    return rows.sort((a, b) => b.score - a.score);
  },
});

export const getMatchStats = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db.query("matchSuggestions").collect();
    const counts: Record<string, number> = { all: rows.length };
    for (const status of MATCH_STATUSES) counts[status] = 0;
    let scoreSum = 0;
    let top = 0;
    for (const row of rows) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
      scoreSum += row.score;
      top = Math.max(top, row.score);
    }
    const byCategory: Record<string, number> = {};
    for (const row of rows) byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
    return {
      counts,
      byCategory,
      top,
      average: rows.length > 0 ? Math.round(scoreSum / rows.length) : 0,
    };
  },
});

export const updateSuggestion = mutation({
  args: {
    token: v.string(),
    id: v.id("matchSuggestions"),
    status: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { token, id, status, note }) => {
    await requireAdmin(ctx, token);
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError("المطابقة غير موجودة");
    if (status && !(MATCH_STATUSES as readonly string[]).includes(status)) {
      throw new ConvexError("حالة مطابقة غير صالحة");
    }
    await ctx.db.patch(id, {
      ...(status ? { status } : {}),
      ...(note !== undefined ? { note } : {}),
    });
    return { ok: true };
  },
});

/** تحميل طرف مطابقة بحسب معرّفه (طلب من جدول الطلبات أو خدمة من العروض). */
async function loadMatchableById(
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<Matchable | null> {
  if (id.startsWith("offer:")) {
    const doc = (await ctx.db.get(id.slice(6) as any)) as any;
    if (!doc) return null;
    return {
      id,
      category: "software",
      type: "service",
      title: doc.title,
      description: doc.description,
      fields: { projectType: doc.title },
      price: doc.offerPrice ?? doc.originalPrice,
      address: "اليمن",
      fullName: "منصة ViP Yemen — قسم البرمجيات",
      phone: "00967711780999",
      phoneVerified: true,
      status: "published",
      createdAt: doc.createdAt,
    };
  }
  const doc = (await ctx.db.get(id as any)) as any;
  if (!doc) return null;
  return toMatchable(doc);
}

/** إبلاغ الطرفين عبر قنوات المنصة + إشعار داخلي. */
async function announceMatch(
  ctx: MutationCtx,
  row: {
    category: string;
    score: number;
    requestTitle: string;
    requestName: string;
    requestPhone: string;
    offerTitle: string;
    offerName: string;
    offerPhone: string;
    reasons: string[];
  }
): Promise<void> {
  await ctx.scheduler.runAfter(0, internal.channels.publishNotice, {
    title: `تطابق متميز بنسبة ${row.score}% — ${row.requestTitle}`,
    message: [
      `🎯 نسبة التوافق: ${row.score}%`,
      `📋 الطلب: ${row.requestTitle} — ${row.requestName}`,
      `🏷️ العرض: ${row.offerTitle} — ${row.offerName}`,
      row.reasons.length > 0 ? `✅ المعايير: ${row.reasons.join(" · ")}` : "",
      `📞 للتواصل: ${row.requestPhone} / ${row.offerPhone}`,
    ].filter(Boolean).join("\n"),
    category: row.category,
  });
  await ctx.db.insert("notifications", {
    title: "تم إبلاغ الطرفين بمطابقة",
    message: `${row.requestTitle} ⇄ ${row.offerTitle} — توافق ${row.score}%`,
    category: row.category,
    createdAt: Date.now(),
  });
}

/** إبلاغ الطرفين بمطابقة محفوظة عبر قنوات المنصة (تلجرام/واتساب/فيسبوك). */
export const notifyMatchedParties = mutation({
  args: { token: v.string(), id: v.id("matchSuggestions") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    const row = await ctx.db.get(id);
    if (!row) throw new ConvexError("المطابقة غير موجودة");
    await announceMatch(ctx, row);
    await ctx.db.patch(id, { status: "notified", notifiedAt: Date.now() });
    return { ok: true };
  },
});

/** إبلاغ الطرفين بمطابقة مباشرة من لوحة التوافق (بلا حاجة لتشغيل المحرك). */
export const notifyPair = mutation({
  args: {
    token: v.string(),
    category: v.string(),
    requestId: v.string(),
    offerId: v.string(),
  },
  handler: async (ctx, { token, category, requestId, offerId }) => {
    await requireAdmin(ctx, token);
    const request = await loadMatchableById(ctx, requestId);
    const offer = await loadMatchableById(ctx, offerId);
    if (!request || !offer) throw new ConvexError("أحد طرفي المطابقة غير موجود");
    const { score, reasons } = scorePair(category, request, offer);
    const now = Date.now();
    const payload = {
      category,
      score,
      requestTitle: request.title,
      requestName: request.fullName,
      requestPhone: request.phone,
      offerTitle: offer.title,
      offerName: offer.fullName,
      offerPhone: offer.phone,
      reasons,
    };
    const existing = await ctx.db
      .query("matchSuggestions")
      .withIndex("by_pair", (q) => q.eq("requestId", requestId).eq("offerId", offerId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { score, reasons, status: "notified", notifiedAt: now });
    } else {
      await ctx.db.insert("matchSuggestions", {
        category,
        requestId,
        requestTitle: request.title,
        requestName: request.fullName,
        requestPhone: request.phone,
        offerId,
        offerTitle: offer.title,
        offerName: offer.fullName,
        offerPhone: offer.phone,
        score,
        reasons,
        status: "notified",
        notifiedAt: now,
        createdAt: now,
      });
    }
    await announceMatch(ctx, payload);
    return { ok: true, score };
  },
});

/**
 * المحرك التلقائي: يبني/يحدّث أرشيف المطابقات، ويحدّث أفضل نسبة على كل طلب،
 * وينشئ إشعاراً إدارياً واحداً بكل تشغيل (بلا إغراق).
 */
export async function runAutoMatch(
  ctx: MutationCtx,
  opts: { category?: string; limit?: number; minScore?: number; notify?: boolean } = {}
): Promise<{ created: number; scanned: number; pairs: number }> {
  const rows = await loadMatchables(ctx, opts.category);
  const pairs = buildPairs(rows, {
    category: opts.category,
    limit: opts.limit ?? 60,
    minScore: opts.minScore,
  });
  if (!opts.category || opts.category === "software") {
    const services = await loadServiceOffers(ctx);
    pairs.push(...pairsWithServices(rows, services, { limit: 12 }));
    pairs.sort((a, b) => b.score - a.score);
  }

  const existingRows = await ctx.db.query("matchSuggestions").withIndex("by_created").order("desc").take(800);
  const existing = new Map(existingRows.map((row) => [`${row.requestId}|${row.offerId}`, row]));

  let created = 0;
  const bestScore = new Map<string, number>();
  const maxNew = opts.limit ?? 60;

  for (const pair of pairs) {
    bestScore.set(
      pair.request.id,
      Math.max(bestScore.get(pair.request.id) ?? 0, pair.score)
    );
    const key = `${pair.request.id}|${pair.offer.id}`;
    const previous = existing.get(key);
    if (previous) {
      if (previous.score !== pair.score) {
        await ctx.db.patch(previous._id, { score: pair.score, reasons: pair.reasons });
      }
      continue;
    }
    if (created >= maxNew) continue;
    await ctx.db.insert("matchSuggestions", {
      category: pair.category,
      requestId: pair.request.id,
      requestTitle: pair.request.title,
      requestName: pair.request.fullName,
      requestPhone: pair.request.phone,
      offerId: pair.offer.id,
      offerTitle: pair.offer.title,
      offerName: pair.offer.fullName,
      offerPhone: pair.offer.phone,
      score: pair.score,
      reasons: pair.reasons,
      status: "new",
      createdAt: Date.now(),
    });
    created += 1;
  }

  // تحديث «أفضل نسبة توافق» على الطلبات المنشورة
  for (const [id, score] of bestScore.entries()) {
    if (id.startsWith("offer:")) continue;
    const doc = await ctx.db.get(id as any);
    if (!doc || (doc as any).bestMatchScore === score) continue;
    await ctx.db.patch(id as any, { bestMatchScore: score });
  }

  if (created > 0 && opts.notify !== false) {
    await ctx.db.insert("notifications", {
      title: "محرك التوافق — نتائج جديدة",
      message: `تم توليد ${created} مطابقة جديدة بين العروض والطلبات (أعلى نسبة ${pairs[0]?.score ?? 0}%)`,
      category: "matching",
      createdAt: Date.now(),
    });
  }

  return { created, scanned: rows.length, pairs: pairs.length };
}

/** تشغيل المحرك فوراً من لوحة الكنترول. */
export const runMatchNow = mutation({
  args: { token: v.string(), category: v.optional(v.string()) },
  handler: async (ctx, { token, category }) => {
    await requireAdmin(ctx, token);
    const result = await runAutoMatch(ctx, { category, limit: 80 });
    return result;
  },
});

/** تشغيل تلقائي من المجدول (عند وصول طلب جديد أو كل دورة أتمتة). */
export const runAutoMatchInternal = internalMutation({
  args: { category: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { category, limit }) => {
    return runAutoMatch(ctx, { category, limit: limit ?? 40 });
  },
});
