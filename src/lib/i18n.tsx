import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export type Lang = "ar" | "en";

const STORAGE_KEY = "vip_lang";

const DICT: Record<string, { ar: string; en: string }> = {
  home: { ar: "الرئيسية", en: "Home" },
  jobs: { ar: "التوظيف", en: "Jobs" },
  realEstate: { ar: "العقارات", en: "Real Estate" },
  emarket: { ar: "التسويق الإلكتروني", en: "E-Marketing" },
  software: { ar: "البرمجيات", en: "Software" },
  offers: { ar: "العروض", en: "Offers" },
  channels: { ar: "قنواتنا", en: "Our Channels" },
  assistant: { ar: "المساعد — البحث الشامل", en: "Assistant — Smart Search" },
  dashboard: { ar: "لوحة التحكم", en: "Admin Panel" },
  logout: { ar: "خروج", en: "Logout" },
  ads: { ar: "إعلانات", en: "Ads" },
  today: { ar: "اليوم", en: "Today" },
  hijri: { ar: "هـ", en: "AH" },
  heroBadge: { ar: "المنصة اليمنية الشاملة للخدمات", en: "Yemen's all-in-one services platform" },
  heroTitle1: { ar: "كل ما تحتاجه في منصة واحدة —", en: "Everything you need in one platform —" },
  heroTitle2: { ar: "توظيف، عقارات، تسويق، برمجيات", en: "Jobs, Real Estate, Marketing, Software" },
  heroSub: {
    ar: "منصة ViP Yemen تربط أصحاب الأعمال والباحثين عن الفرص في اليمن. كل طلب يمر بمراجعة إدارة المنصة والتدقيق قبل النشر — ضماناً للحقوق والجودة والموثوقية للجميع.",
    en: "ViP Yemen connects businesses and opportunity seekers across Yemen. Every request is reviewed and verified by the platform's management before publishing — guaranteeing rights, quality and trust for everyone.",
  },
  ctaJobs: { ar: "ابدأ من قسم التوظيف", en: "Start with Jobs" },
  ctaMarket: { ar: "اعرض منتجك أو ابحث عن طلب", en: "Sell a product or search" },
  verified: { ar: "مراجعة إدارية وتدقيق لكل طلب قبل النشر", en: "Admin review & verification before every publish" },
  sectionsTitle: { ar: "أقسام المنصة", en: "Platform Sections" },
  sectionsSub: {
    ar: "أربعة أقسام متكاملة، كلها تخضع لنفس آلية المراجعة والنشر المعتمدة من إدارة المنصة.",
    en: "Four integrated sections, all governed by the same review-and-publish system approved by the platform's management.",
  },
  enterSection: { ar: "ادخل القسم", en: "Enter section" },
  howTitle: { ar: "آلية عمل المنصة", en: "How it works" },
  howSub: {
    ar: "نظام مراجعة مضمون يحمي حقوق الجميع — البائعين والمشترين والباحثين عن عمل.",
    en: "A guaranteed review system that protects everyone — sellers, buyers and job seekers.",
  },
  step1: { ar: "1. تسجيل البيانات", en: "1. Register your data" },
  step1Text: { ar: "تسجل بياناتك وترفق صور المؤهلات أو المنتج أو العقار", en: "Register your details and attach photos of your qualifications, product or property" },
  step2: { ar: "2. مراجعة سرية", en: "2. Confidential review" },
  step2Text: { ar: "يصل طلبك للوحة التحكم بشكل خاص ومستقل للمراجعة والتدقيق", en: "Your request reaches the admin panel privately for review and verification" },
  step3: { ar: "3. تعديل واعتماد", en: "3. Edit & approve" },
  step3Text: { ar: "تقوم الإدارة بالتدقيق والتعديل لضمان الحقوق والجودة", en: "Management verifies and edits to guarantee rights and quality" },
  step4: { ar: "4. نشر تلقائي", en: "4. Auto-publish" },
  step4Text: { ar: "بضغطة زر ينشر الطلب على واجهة المنصة وقنوات التواصل", en: "One click publishes your request on the platform and its channels" },
  latestTitle: { ar: "أحدث المنشورات المعتمدة", en: "Latest approved listings" },
  browseAll: { ar: "تصفح الكل", en: "Browse all" },
  adsTitle: { ar: "الإعلانات الترويجية", en: "Promotional Ads" },
  adsSub: {
    ar: "أحدث الإعلانات المعتمدة من إدارة المنصة — تظهر هنا وفي الشريط الإعلاني العلوي.",
    en: "The latest approved ads from the platform's management — shown here and in the top ticker.",
  },
  offersTitle: { ar: "عروض مميزة", en: "Featured offers" },
  allOffers: { ar: "كل العروض", en: "All offers" },
  whyTitle: { ar: "لماذا ViP Yemen؟", en: "Why ViP Yemen?" },
  channelsTitle: { ar: "قنواتنا الرقمية", en: "Our digital channels" },
  channelsSub: {
    ar: "كل منشور معتمد يُنشر تلقائياً على قنوات المنصة الرسمية — انضم لتصل إليك الفرص والعروض أولاً بأول.",
    en: "Every approved post is automatically published to the platform's official channels — join to get opportunities and offers first.",
  },
  channelsPage: { ar: "صفحة القنوات", en: "Channels page" },
  finalCta: { ar: "جاهز تبدأ؟ سجّل بياناتك الآن — وسنتولى الباقي", en: "Ready to start? Register now — we handle the rest" },
  finalCtaSub: {
    ar: "فريقنا ذو خبرة سنوات في مجالات التوظيف والتسويق والبرمجة — نضمن لك الجودة والوصول لجمهور أوسع.",
    en: "Our team has years of experience in recruitment, marketing and software — we guarantee quality and a wider audience.",
  },
  registerNow: { ar: "سجّل في المنصة", en: "Register now" },
  watchOffers: { ar: "شاهد العروض", en: "See offers" },
  footerSections: { ar: "أقسام المنصة", en: "Sections" },
  footerContact: { ar: "تواصل معنا", en: "Contact us" },
  searchPlaceholder: {
    ar: "اكتب سؤالك أو كلمة البحث... مثال: شقة في حدة، جوال للبيع، برمجة تطبيقات",
    en: "Type your question or search term... e.g. apartment in Hadda, phone for sale, app development",
  },
  search: { ar: "بحث", en: "Search" },
  assistantBadge: { ar: "المساعد — البحث الشامل", en: "Assistant — Smart Search" },
  assistantTitle1: { ar: "محرك بحث", en: "A comprehensive" },
  assistantTitle2: { ar: "معرفي شامل", en: "knowledge engine" },
  faqs: { ar: "الأسئلة الشائعة", en: "Frequently asked questions" },
  publishedIn: { ar: "المنشورات المعتمدة في قسم", en: "Approved listings in" },
  all: { ar: "الكل", en: "All" },
  registerNowBtn: { ar: "سجّل بياناتك الآن", en: "Register your data now" },
  viewPosts: { ar: "عرض المنشورات", en: "View listings" },
  noPosts: { ar: "لا توجد منشورات معتمدة بعد", en: "No approved listings yet" },
  noPostsHint: {
    ar: "كن أول من يسجل — تُراجع الطلبات وتُنشر فور اعتمادها من الإدارة",
    en: "Be the first — requests are reviewed and published as soon as management approves them",
  },
  whatsappContact: { ar: "تواصل معنا عبر واتساب", en: "Contact us on WhatsApp" },
};

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: "ar",
  setLang: () => {},
  t: (k) => k,
});

function initialLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage unavailable — in-memory only */
    }
  }, [lang]);

  const value: LangContextValue = {
    lang,
    setLang: setLangState,
    t: (key) => DICT[key]?.[lang] ?? key,
  };

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}

/** Compact globe toggle — placed in the top bar with its own reserved space. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  const next: Lang = lang === "ar" ? "en" : "ar";
  return (
    <button
      onClick={() => setLang(next)}
      title={next === "ar" ? "التبديل إلى العربية" : "Switch to English"}
      aria-label={next === "ar" ? "التبديل إلى العربية" : "Switch to English"}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-600/70 bg-ink-900/50 px-2.5 py-2 text-cream transition-colors hover:border-gold-500/60 hover:text-gold-300",
        className
      )}
    >
      <Globe className="h-4 w-4" />
      <span className="text-[10px] font-black tracking-wide">{lang === "ar" ? "EN" : "عربي"}</span>
    </button>
  );
}