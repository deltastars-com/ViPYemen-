/**
 * 🌐 سجل المرايا (Multi-provider mirrors) — ViP Yemen
 *
 * المنصة تعمل على عدة مزودات استضافة مجانية ومستقلة في الوقت نفسه:
 *   Vercel · Render · GitHub Pages (افتراضياً)
 *   + أي مرايا إضافية مجانية (Netlify · Cloudflare Pages …)
 *
 * كل دفعة إلى `main` تنشر إلى كل المرايا معاً (انظر .github/workflows/pages.yml
 * و mirrors.yml)، وأي مزود يتوقف لا يؤثر على الباقي. يمكن إضافة مزود جديد
 * بلا أي تعديل في الكود عبر متغير البناء:
 *
 *   VITE_EXTRA_MIRRORS="Netlify|https://vipyemen.netlify.app,Cloudflare|https://vipyemen.pages.dev"
 */
import { CONVEX_URL } from "./convex";

export interface Mirror {
  /** اسم المزود كما يظهر للمستخدم */
  label: string;
  /** رابط النسخة الكاملة من المنصة على هذا المزود */
  url: string;
  /** وصف مختصر للدور (أساسي/احتياطي) */
  tag: "primary" | "mirror";
  /** كلها خطط مجانية */
  free: boolean;
}

/** المرايا الرسمية — تُنشر آلياً من المستودع. */
const OFFICIAL_MIRRORS: Mirror[] = [
  { label: "Vercel", url: "https://vi-p-yemen.vercel.app", tag: "primary", free: true },
  { label: "Render", url: "https://vipyemen.onrender.com", tag: "mirror", free: true },
  {
    label: "GitHub Pages",
    url: "https://deltastars-com.github.io/ViPYemen-/",
    tag: "mirror",
    free: true,
  },
];

function parseExtra(value: string | undefined): Mirror[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const [label, url] = entry.split("|").map((part) => part.trim());
      if (!url || !/^https?:\/\//i.test(url)) return [];
      return [
        {
          label: label || new URL(url).hostname,
          url: url.endsWith("/") ? url : `${url}/`,
          tag: "mirror" as const,
          free: true,
        },
      ];
    });
}

function deDuplicate(list: Mirror[]): Mirror[] {
  const seen = new Set<string>();
  return list.filter((mirror) => {
    const key = mirror.url.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** كل مرايا المنصة (الرسمية + الإضافية المُعرَّفة في البناء). */
export function mirrorList(): Mirror[] {
  return deDuplicate([
    ...OFFICIAL_MIRRORS,
    ...parseExtra(import.meta.env.VITE_EXTRA_MIRRORS as string | undefined),
  ]);
}

/** هل نعمل حالياً من داخل إحدى المرايا؟ */
export function currentMirror(): Mirror | null {
  if (typeof location === "undefined") return null;
  const href = location.href.toLowerCase();
  return (
    mirrorList().find((mirror) => href.startsWith(mirror.url.toLowerCase().replace(/\/$/, ""))) ??
    null
  );
}

/** كل المرايا الأخرى (بما فيها الثلاث الرسمية) — تُستخدم في شريط التحذير. */
export function otherMirrors(): Mirror[] {
  const current = currentMirror();
  return mirrorList().filter((mirror) => mirror.url !== current?.url);
}

/** روابط القنوات الرسمية للمنصة (تلجرام · واتساب · فيسبوك · يوتيوب). */
export const PLATFORM_URL = OFFICIAL_MIRRORS[0].url;

/** عنوان الـ API الحالي (للتشخيص في لوحة الكنترول). */
export const BACKEND_URL = CONVEX_URL;

/**
 * 🩺 فحص سريع لكل المرايا — يستخدمه زر «أسرع نسخة احتياطية» وشاشة
 * التحويل التلقائي. الفحص خفيف جداً (طلبات HEAD متزامنة بمهلة 4 ثوان) ولا
 * يُنزّل أي محتوى، فلا يستهلك بيانات المستخدم.
 */
export interface MirrorProbe {
  mirror: Mirror;
  ok: boolean;
  latencyMs: number;
}

export async function probeMirrors(timeoutMs = 4000): Promise<MirrorProbe[]> {
  const list = mirrorList();
  const results = await Promise.all(
    list.map(async (mirror) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const started = performance.now();
      try {
        await fetch(`${mirror.url}?vip-mirror-probe=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
          mode: "no-cors",
          signal: controller.signal,
        });
        return { mirror, ok: true, latencyMs: Math.round(performance.now() - started) };
      } catch {
        return { mirror, ok: false, latencyMs: Math.round(performance.now() - started) };
      } finally {
        clearTimeout(timer);
      }
    })
  );
  return results.sort((a, b) => Number(b.ok) - Number(a.ok) || a.latencyMs - b.latencyMs);
}

/** أسرع مرآة تعمل الآن (غير المرآة الحالية). */
export async function fastestMirror(): Promise<Mirror | null> {
  const current = currentMirror();
  const probes = await probeMirrors();
  const alive = probes.find((probe) => probe.ok && probe.mirror.url !== current?.url);
  return alive?.mirror ?? null;
}

/** ملخص نصي للاستخدام في التقارير/اللوحة. */
export function mirrorsSummary(): string {
  return mirrorList()
    .map((mirror) => `${mirror.label}: ${mirror.url}`)
    .join(" · ");
}
