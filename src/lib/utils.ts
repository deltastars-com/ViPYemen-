import { useEffect } from "react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatDate(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("ar-YE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPrice(price?: number, currency?: string): string {
  if (price === undefined || price === null) return "";
  const c = currency === "usd" ? "$" : "ريال يمني";
  return `${price.toLocaleString("en-US")} ${c}`;
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return formatDate(ts);
}

export function fileKindOf(mime: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  return "file";
}

export function whatsappLink(phone: string, text: string): string {
  const number = phone.replace(/[^0-9]/g, "");
  const waNumber = number.startsWith("967") ? number : "967" + number.replace(/^0/, "");
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
}

export const PLATFORM_WHATSAPP_DISPLAY = "00967711780999";
export const PLATFORM_WHATSAPP_LINK = "https://wa.me/967711780999";

/**
 * Opens an external URL in a new tab (web) or the system browser (mobile app)
 * with noopener isolation — the app shell is never navigated away from.
 */
export function openExternal(url: string): void {
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (win) win.opener = null;
}

/**
 * Global guard: any click on an external http(s) link without target="_blank"
 * is redirected to the system browser / a new tab, so the user is never ejected
 * from the app. Same-origin links (SPA routes) keep their default behavior.
 */
export function useExternalLinkGuard(): void {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const el = event.target as Element | null;
      const anchor = el?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !/^https?:\/\//i.test(href)) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin === window.location.origin) return;
      // target="_blank" links already open in a new context (tab / system browser).
      if (anchor.target === "_blank") return;
      event.preventDefault();
      openExternal(url.href);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}