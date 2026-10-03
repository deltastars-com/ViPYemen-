/**
 * 🔎 تحسين الظهور لكل صفحة (SEO ديناميكي) — بدون أي مكتبة.
 *
 * الواجهة SPA يقرأها محرّكات البحث من `index.html` الثابت فقط، فكان كل الأقسام
 * تُعامل كصفحة واحدة بعنوان واحد. هذا المساعد يحدّث فعلياً عند التنقّل:
 *   • <title> · meta[name=description]
 *   · link[rel=canonical]  (مسار حقيقي لكل قسم)
 *   · og:title / og:description / og:url / og:site_name
 *   · twitter:title / twitter:description
 * ويُستدعى من كل صفحة رئيسية عبر `useSeo`.
 */
import { useEffect } from "react";

type SeoInput = {
  title: string;
  description?: string;
  /** مسار الصفحة مثل `/jobs` — يُترك لاستنتاجه من الموقع الحالي إن لم يُمرَّر. */
  path?: string;
  image?: string;
};

const SITE_NAME = "ViP Yemen";

function upsertMeta(selector: string, attrs: Record<string, string>, content: string) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** يطبّق وسوم SEO الحالية على الصفحة فوراً (آمن في أي بيئة). */
export function applySeo({ title, description, path, image }: SeoInput): void {
  if (typeof document === "undefined") return;
  const url = typeof window === "undefined" ? "" : window.location.origin + (path ?? window.location.pathname);
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;

  document.title = fullTitle;
  upsertMeta('meta[name="description"]', { name: "description" }, description ?? "");
  if (url) upsertLink("canonical", url);

  upsertMeta('meta[property="og:title"]', { property: "og:title" }, fullTitle);
  upsertMeta('meta[property="og:site_name"]', { property: "og:site_name" }, SITE_NAME);
  upsertMeta('meta[property="og:type"]', { property: "og:type" }, "website");
  if (description) {
    upsertMeta('meta[property="og:description"]', { property: "og:description" }, description);
  }
  if (url) upsertMeta('meta[property="og:url"]', { property: "og:url" }, url);
  if (image) upsertMeta('meta[property="og:image"]', { property: "og:image" }, image);

  upsertMeta('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image");
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, fullTitle);
  if (description) {
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description" }, description);
  }
}

/** نفس التأثير كخطّاف React — يُستدعى مرة عند تغيّر المدخلات. */
export function useSeo(input: SeoInput): void {
  const { title, description, path, image } = input;
  useEffect(() => {
    applySeo({ title, description, path, image });
  }, [title, description, path, image]);
}
