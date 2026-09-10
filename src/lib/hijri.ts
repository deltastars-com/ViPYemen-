/**
 * Hijri (Islamic Umm al-Qura) calendar helper.
 *
 * Uses the browser's built-in Intl islamic-umalqura calendar (supported in
 * modern Chrome, Safari and Android System WebView). Returns an empty string
 * when the engine does not support it, so callers can hide the badge
 * gracefully instead of crashing.
 */

export function getHijriToday(locale: "ar" | "en" = "ar"): string {
  try {
    const loc = locale === "ar" ? "ar-SA-u-ca-islamic-umalqura" : "en-u-ca-islamic-umalqura";
    const fmt = new Intl.DateTimeFormat(loc, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const parts = fmt.formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const weekday = get("weekday");
    const day = get("day");
    const month = get("month");
    const year = get("year");
    if (!day || !month || !year) return "";
    return `${weekday ? `${weekday}، ` : ""}${day} ${month} ${year}${locale === "ar" ? " هـ" : " AH"}`;
  } catch {
    return "";
  }
}

/** Gregorian date in the same shape (fallback / secondary display). */
export function getGregorianToday(locale: "ar" | "en" = "ar"): string {
  try {
    const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return fmt.format(new Date());
  } catch {
    return "";
  }
}