import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { LogoMark } from "@/components/Logo";
import { UpdateBadge } from "./UpdateNotice";
import {
  Facebook,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  ArrowUp,
  Landmark,
  Smartphone,
  Apple,
} from "lucide-react";
import { Logo } from "./Logo";
import { ExitButton } from "./ExitButton";
import { useLang } from "@/lib/i18n";
import { PLATFORM_WHATSAPP_LINK, openExternal } from "@/lib/utils";
import { isNativeApp } from "@/lib/native";
import {
  TelegramIcon,
  WhatsAppIcon,
  TikTokIcon,
  XIcon,
  LinkedInIcon,
  InstagramIcon,
  YouTubeIcon,
} from "./ChannelIcons";
import {
  FACEBOOK_GROUP_URL,
  FACEBOOK_PAGE_URL,
  INSTAGRAM_URL,
  LINKEDIN_URL,
  TELEGRAM_BOT_URL,
  TELEGRAM_CHANNEL_URL,
  TIKTOK_URL,
  WHATSAPP_COMMUNITY_URL,
  YOUTUBE_URL,
} from "@/lib/socialLinks";

const APKPURE_URL = "https://apkpure.com/vipyemen/com.vip.yemen/download";

/**
 * Store badges: Android links to APKPure live; iOS waits for the App Store URL
 * saved from the Developer dashboard section — once saved, the icon activates
 * automatically (no code change needed).
 */
function StoreBadges() {
  const { t, lang } = useLang();
  const publicSettings = useQuery(
    api.settings.getPublicSettings,
    process.env.VITE_CONVEX_URL || (import.meta as any).env?.VITE_CONVEX_URL ? {} : "skip"
  );
  const iosUrl = (publicSettings?.iosDownloadUrl as string | undefined)?.trim() || "";
  const androidUrl = (publicSettings?.androidDownloadUrl as string | undefined)?.trim() || APKPURE_URL;
  const badge =
    "flex items-center gap-2 rounded-xl border border-gold-500/40 bg-gold-500/10 px-3.5 py-2 text-xs font-bold text-gold-300 transition-all hover:-translate-y-0.5 hover:border-gold-500/70 hover:bg-gold-500/15 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="mt-4">
      {/* تذكير بسيط بوجود تحديث يظهر فوق أيقونة تحميل التطبيق — بدون أي رابط */}
      <UpdateBadge />
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Real buttons (not anchors): the store badges act on click only and
            the iOS one is genuinely disabled until a URL is saved, so keyboard
            users get the same behaviour as pointer users. */}
        <button
          type="button"
          onClick={() => openExternal(androidUrl)}
          aria-label={t("footerDownloadAndroid")}
          title={t("footerDownloadAndroid")}
          className={badge}
        >
          <Smartphone className="h-4 w-4" />
          <span>{lang === "ar" ? "أندرويد — APK" : "Android — APK"}</span>
        </button>
        <button
          type="button"
          onClick={() => iosUrl && openExternal(iosUrl)}
          disabled={!iosUrl}
          aria-label={iosUrl ? t("footerDownloadIos") : t("footerIosSoon")}
          title={iosUrl ? t("footerDownloadIos") : t("footerIosSoon")}
          className={badge}
        >
          <Apple className="h-4 w-4" />
          <span>{lang === "ar" ? "آيفون — App Store" : "iOS — App Store"}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * أيقونات التواصل في الفوتر — كلها شعارات رسمية ممتلئة بلون علامتها، وكل
 * الروابط تأتي من src/lib/socialLinks.ts (مصدر واحد) فلا تتكرر ولا تختلف
 * عن صفحة القنوات ولا عن نقطة /channels في الباك اند.
 */
const SOCIALS = [
  { icon: WhatsAppIcon, href: WHATSAPP_COMMUNITY_URL, brand: "#25D366", labelAr: "مجتمع واتساب", labelEn: "WhatsApp Community" },
  { icon: TelegramIcon, href: TELEGRAM_CHANNEL_URL, brand: "#229ED9", labelAr: "قناة تيليجرام", labelEn: "Telegram Channel" },
  { icon: TelegramIcon, href: TELEGRAM_BOT_URL, brand: "#229ED9", labelAr: "بوت تيليجرام", labelEn: "Telegram Bot" },
  { icon: Facebook, href: FACEBOOK_PAGE_URL, brand: "#1877F2", labelAr: "صفحة فيسبوك", labelEn: "Facebook Page" },
  { icon: Facebook, href: FACEBOOK_GROUP_URL, brand: "#1877F2", labelAr: "مجموعة فيسبوك", labelEn: "Facebook Group" },
  { icon: InstagramIcon, href: INSTAGRAM_URL, brand: "#E1306C", labelAr: "إنستغرام", labelEn: "Instagram" },
  { icon: TikTokIcon, href: TIKTOK_URL, brand: "#25F4EE", labelAr: "تيك توك", labelEn: "TikTok" },
  { icon: XIcon, href: "https://twitter.com/ViPservicesYeme", brand: "#FFFFFF", labelAr: "تويتر / X", labelEn: "Twitter / X" },
  { icon: YouTubeIcon, href: YOUTUBE_URL, brand: "#FF0000", labelAr: "يوتيوب", labelEn: "YouTube" },
  { icon: LinkedInIcon, href: LINKEDIN_URL, brand: "#0A66C2", labelAr: "لينكدإن", labelEn: "LinkedIn" },
];

const LINKTREES = [
  { label: "Beacons", href: "https://beacons.ai/vipservicesyemen" },
  { label: "Linkfly", href: "https://linkfly.to/vipservicesyemen" },
  { label: "Taplink", href: "https://taplink.cc/vipservicesyemen" },
  { label: "AllMyLinks", href: "https://allmylinks.com/vipservicesyemen" },
];

const SECTION_LINKS = [
  { to: "/jobs", ar: "قسم التوظيف", en: "Jobs Section" },
  { to: "/real-estate", ar: "قسم التسويق العقاري", en: "Real Estate Section" },
  { to: "/emarket", ar: "قسم التسويق الإلكتروني", en: "E-Marketing Section" },
  { to: "/software", ar: "قسم البرمجيات وتطوير التطبيقات", en: "Software & Development" },
  { to: "/offers", ar: "قسم العروض الترويجية", en: "Promotional Offers" },
  { to: "/channels", ar: "قنواتنا الرقمية", en: "Our Digital Channels" },
  { to: "/assistant", ar: "المساعد — البحث الشامل", en: "Assistant — Smart Search" },
];

export function Footer() {
  const { t, lang } = useLang();
  return (
    <footer className="mt-20 border-t border-ink-700/50 bg-ink-950">
      <div className="container-app grid gap-10 py-14 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/80">
            {t("footerDesc")}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {SOCIALS.map((s) => (
              <a
                key={lang === "ar" ? s.labelAr : s.labelEn}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={lang === "ar" ? s.labelAr : s.labelEn}
                title={lang === "ar" ? s.labelAr : s.labelEn}
                className="group flex h-10 w-10 items-center justify-center rounded-xl border border-ink-600/60 bg-ink-900/60 text-ink-300 transition-all hover:-translate-y-0.5 hover:border-gold-500/60 hover:bg-ink-800 hover:text-gold-300"
              >
                <s.icon
                  className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110"
                  style={{ color: s.brand }}
                />
              </a>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {LINKTREES.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="chip !text-gold-300/90 transition-colors hover:!border-gold-500/60 hover:!text-gold-200"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-black text-gold-200">{t("footerSections")}</h3>
          <ul className="space-y-2.5 text-sm font-semibold text-ink-100">
            {SECTION_LINKS.map((l) => (
              <li key={l.to}>
                <Link className="text-cream/90 transition-colors hover:text-gold-300" to={l.to}>
                  {lang === "ar" ? l.ar : l.en}
                </Link>
              </li>
            ))}
            <li>
              <a
                className="text-cream/90 transition-colors hover:text-gold-300"
                href={PLATFORM_WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("footerGetApp")}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-black text-gold-200">{t("footerContact")}</h3>
          <ul className="space-y-3 text-sm text-ink-100">
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-gold-400" />
              <a href="tel:00967711780999" className="transition-colors hover:text-gold-300" dir="ltr">
                00967711780999 / 773597404
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-gold-400" />
              <a
                href="mailto:vipservicesyemen@gmail.com"
                className="transition-colors hover:text-gold-300"
                dir="ltr"
              >
                vipservicesyemen@gmail.com
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-gold-400" />
              {t("footerSanaa")}
            </li>
          </ul>
          <a href={PLATFORM_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="btn-gold mt-5 !py-2.5 text-xs">
            <MessageCircle className="h-4 w-4" />
            {t("footerContactWa")}
          </a>
          <Link
            to="/payment"
            className="mt-3 flex w-fit items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-300 transition-all hover:-translate-y-0.5 hover:border-emerald-500/70"
            aria-label={t("footerPayments")}
          >
            <Landmark className="h-4 w-4" />
            {t("footerPayments")}
          </Link>
          <StoreBadges />
          <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-ink-400">
            <Link className="transition-colors hover:text-gold-300" to="/privacy-policy">{t("footerPrivacy")}</Link>
            <Link className="transition-colors hover:text-gold-300" to="/terms">{t("footerTerms")}</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-ink-700/50 py-4">
        <div className="container-app flex flex-col items-center justify-between gap-4 text-xs text-ink-400 lg:flex-row">
          <p className="text-center text-cream/70 lg:text-left">
            © 2026 ViP Yemen — {t("footerAllRights")} · {lang === "ar" ? "المهندس علي درهم الدحان" : "Eng. Ali Al-Dahan"}
          </p>

          {/* Quick direct contact — call + WhatsApp */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <a
              href="tel:+967773597404"
              dir="ltr"
              aria-label="Direct call: 967773597404"
              title={t("footerDirectCall")}
              className="flex items-center gap-2 rounded-full border border-ink-600/60 bg-ink-900/60 px-3.5 py-2 font-bold text-ink-100 transition-all hover:-translate-y-0.5 hover:border-gold-500/60 hover:text-gold-300"
            >
              <Phone className="h-3.5 w-3.5 text-gold-400" />
              <span>{lang === "ar" ? "اتصال:" : "Call:"} +967 773 597 404</span>
            </a>
            <a
              href="https://wa.me/967711780999?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%AA%D9%88%D8%A7%D8%B5%D9%84%20%D9%85%D8%B9%20%D9%85%D9%86%D8%B5%D8%A9%20ViP%20Yemen"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp: 967711780999"
              title={t("footerContactWa")}
              className="flex items-center gap-2 rounded-full border border-[#25d366]/40 bg-[#25d366]/10 px-3.5 py-2 font-bold text-ink-100 transition-all hover:-translate-y-0.5 hover:border-[#25d366]/80 hover:text-[#4ade80]"
            >
              <WhatsAppIcon className="h-3.5 w-3.5 text-[#4ade80]" />
              <span dir="ltr">{lang === "ar" ? "واتساب:" : "WhatsApp:"} +967 711 780 999</span>
            </a>
          </div>

          <div className="flex items-center gap-3">
            <ExitButton compact />
            {!isNativeApp() && (
              <span className="flex items-center gap-1.5">
                <LogoMark className="h-5 w-5" />
                {t("footerPwaDesc")}
              </span>
            )}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-600/60 text-ink-300 transition-colors hover:border-gold-500/60 hover:text-gold-300"
              aria-label={t("footerBackToTop")}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
