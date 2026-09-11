/**
 * Full bilingual (Arabic / English) i18n system for ViP Yemen.
 *
 * Every user-visible string in the platform is served from this dictionary.
 * Components call `t("key")` to get the current language's text.
 * Nested helpers: `tCategory(key, field)`, `tField(cat, field, prop)`, `tOption(cat, field, opt)`.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export type Lang = "ar" | "en";

const STORAGE_KEY = "vip_lang";

/* ─── Main dictionary ─── */

const DICT: Record<string, { ar: string; en: string }> = {
  /* ── Navigation ── */
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

  /* ── Hero / Landing ── */
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

  /* ── Sections overview ── */
  sectionsTitle: { ar: "أقسام المنصة", en: "Platform Sections" },
  sectionsSub: {
    ar: "أربعة أقسام متكاملة، كلها تخضع لنفس آلية المراجعة والنشر المعتمدة من إدارة المنصة.",
    en: "Four integrated sections, all governed by the same review-and-publish system approved by the platform's management.",
  },
  enterSection: { ar: "ادخل القسم", en: "Enter section" },

  /* ── How it works ── */
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

  /* ── Latest / Listings ── */
  latestTitle: { ar: "أحدث المنشورات المعتمدة", en: "Latest approved listings" },
  browseAll: { ar: "تصفح الكل", en: "Browse all" },

  /* ── Ads ── */
  adsTitle: { ar: "الإعلانات الترويجية", en: "Promotional Ads" },
  adsSub: {
    ar: "أحدث الإعلانات المعتمدة من إدارة المنصة — تظهر هنا وفي الشريط الإعلاني العلوي.",
    en: "The latest approved ads from the platform's management — shown here and in the top ticker.",
  },

  /* ── Offers ── */
  offersTitle: { ar: "عروض مميزة", en: "Featured offers" },
  allOffers: { ar: "كل العروض", en: "All offers" },
  whyTitle: { ar: "لماذا ViP Yemen؟", en: "Why ViP Yemen?" },

  /* ── Channels ── */
  channelsTitle: { ar: "قنواتنا الرقمية", en: "Our digital channels" },
  channelsSub: {
    ar: "كل منشور معتمد يُنشر تلقائياً على قنوات المنصة الرسمية — انضم لتصل إليك الفرص والعروض أولاً بأول.",
    en: "Every approved post is automatically published to the platform's official channels — join to get opportunities and offers first.",
  },
  channelsPage: { ar: "صفحة القنوات", en: "Channels page" },

  /* ── Final CTA ── */
  finalCta: { ar: "جاهز تبدأ؟ سجّل بياناتك الآن — وسنتولى الباقي", en: "Ready to start? Register now — we handle the rest" },
  finalCtaSub: {
    ar: "فريقنا ذو خبرة سنوات في مجالات التوظيف والتسويق والبرمجة — نضمن لك الجودة والوصول لجمهور أوسع.",
    en: "Our team has years of experience in recruitment, marketing and software — we guarantee quality and a wider audience.",
  },
  registerNow: { ar: "سجّل في المنصة", en: "Register now" },
  watchOffers: { ar: "شاهد العروض", en: "See offers" },

  /* ── Stats ── */
  statRegistered: { ar: "طلب مُسجّل", en: "Registered request" },
  statReviewed: { ar: "طلبات مراجعة وتدقيق", en: "Reviewed & verified" },
  statProperty: { ar: "عقار مُسوَّق", en: "Listed property" },
  statTrusted: { ar: "تواصل موثوق", en: "Trusted contact" },
  statWhatsapp: { ar: "واتساب", en: "WhatsApp" },

  /* ── Why us ── */
  whyReason1: { ar: "مراجعة إدارية وتدقيق لكل طلب قبل النشر — ضمان الحقوق للجميع", en: "Admin review & verification for every request — guaranteeing rights for all" },
  whyReason2: { ar: "التحقق من أرقام الهواتف وربطها بواتساب المنصة الرسمي", en: "Phone number verification linked to official platform WhatsApp" },
  whyReason3: { ar: "نشر تلقائي على واجهة المنصة وقنوات التواصل الاجتماعي", en: "Auto-publish to platform and social media channels" },
  whyReason4: { ar: "سرية تامة للبيانات الخاصة — لا تظهر إلا بعد الاعتماد", en: "Full data confidentiality — shown only after approval" },
  whyReason5: { ar: "دعم كامل: توظيف، عقارات، تسويق إلكتروني، برمجيات", en: "Full support: Jobs, Real Estate, E-Marketing, Software" },
  whatsappDirect: { ar: "تواصل مباشر عبر واتساب", en: "Direct contact via WhatsApp" },
  waSendMessage: { ar: "راسلنا الآن", en: "Message us now" },
  adminSecure: { ar: "لوحة تحكم مؤمنة", en: "Secured admin panel" },
  adminSecureDesc: { ar: "لإدارة المنصة فقط — بمراجعة ونشر آمن", en: "Platform management only — with review and safe publishing" },
  adminEnter: { ar: "دخول لوحة التحكم", en: "Enter admin panel" },
  statLabel: { ar: "طلب مُسجّل", en: "Registered" },

  /* ── Terms & Conditions ── */
  footerTerms: { ar: "الشروط والأحكام", en: "Terms & Conditions" },
  termsBadge: { ar: "الشروط والأحكام", en: "Terms & Conditions" },
  termsTitle: { ar: "شروط وأحكام استخدام المنصة", en: "Terms of Use" },
  termsLastUpdated: { ar: "آخر تحديث: 2026 — باستخدامك لمنصة ViP Yemen فأنت توافق على الشروط التالية.", en: "Last updated: 2026 — By using ViP Yemen you agree to the following terms." },
  terms1Title: { ar: "1. قبول الشروط", en: "1. Acceptance of terms" },
  terms1Body: { ar: "باستخدامك لمنصة ViP Yemen أو أي من خدماتها، فأنت توافق على هذه الشروط والأحكام بالكامل.", en: "By using ViP Yemen or any of its services, you agree to these terms in full." },
  terms2Title: { ar: "2. استخدام المنصة", en: "2. Platform use" },
  terms2Body: { ar: "تُستخدم المنصة لأغراض مشروعة فقط. يُمنع أي استخدام يخالف القوانين أو يُسيء للمنصة أو لمستخدميها.", en: "The platform is for lawful purposes only. Any use that violates laws or harms the platform or its users is prohibited." },
  terms3Title: { ar: "3. البيانات والمرفقات", en: "3. Data & attachments" },
  terms3Body: { ar: "أنت مسؤول عن صحة بياناتك ومرفقاتك. تمر جميع الطلبات بمراجعة إدارية قبل النشر. الإدارة مخوّلة بتعديل أو حذف أي بيانات تخالف سياسات المنصة.", en: "You are responsible for the accuracy of your data and attachments. All requests undergo admin review before publishing. Management may edit or remove data that violates platform policies." },
  terms4Title: { ar: "4. المراجعات والإعلانات", en: "4. Reviews & ads" },
  terms4Body: { ar: "جميع المنشورات والإعلانات والعروض تخضع لمراجعة وتدقيق إدارة المنصة. الإدارة مخوّلة بقبول أو رفض أي طلب.", en: "All posts, ads and offers are subject to admin review. Management may accept or reject any request." },
  terms5Title: { ar: "5. حقوق الملكية الفكرية", en: "5. Intellectual property" },
  terms5Body: { ar: "محتوى المنصة وتصميمها وشعارها مملوكة لمنصة ViP Yemen. يُمنع نسخ أو إعادة نشر المحتوى دون إذن.", en: "The platform content, design and logo are owned by ViP Yemen. Copying or republishing content without permission is prohibited." },
  terms6Title: { ar: "6. حدود المسؤولية", en: "6. Limitation of liability" },
  terms6Body: { ar: "المنصة تُسهّل التواصل بين الأطراف ولكنها ليست طرفاً في أي صفقة أو توظيف. تحمل المسؤولية الكاملة على الأطراف المتناقضة.", en: "The platform facilitates communication between parties but is not a party to any deal or employment. Full responsibility lies with the transacting parties." },
  terms7Title: { ar: "7. تعديل الشروط", en: "7. Modifying terms" },
  terms7Body: { ar: "تحتفظ المنصة بحق تعديل هذه الشروط في أي وقت. الاستمرار في الاستخدام يُعد قبولاً للشروط المعدّلة.", en: "The platform reserves the right to modify these terms at any time. Continued use constitutes acceptance of modified terms." },
  terms8Title: { ar: "8. التواصل", en: "8. Contact" },
  terms8Body: { ar: "لأي استفسار: vipservicesyemen@gmail.com أو واتساب 00967711780999.", en: "For inquiries: vipservicesyemen@gmail.com or WhatsApp 00967711780999." },

  /* ── Footer ── */
  footerSections: { ar: "أقسام المنصة", en: "Sections" },
  footerContact: { ar: "تواصل معنا", en: "Contact us" },
  footerDesc: {
    ar: "منصة يمنية شاملة للتوظيف والتسويق العقاري والتسويق الإلكتروني والخدمات البرمجية — بجودة عالية وتواصل مباشر وموثوق.",
    en: "Yemen's all-in-one platform for jobs, real estate, e-marketing and software — high quality, direct and trusted communication.",
  },
  footerGetApp: { ar: "الحصول على نسخة التطبيق", en: "Get the app" },
  footerPrivacy: { ar: "سياسة الخصوصية", en: "Privacy Policy" },
  footerAllRights: { ar: "جميع الحقوق محفوظة", en: "All rights reserved" },
  footerPwaDesc: { ar: "تطبيق ويب تقدمي — يعمل بدون إنترنت", en: "Progressive web app — works offline" },
  footerBackToTop: { ar: "العودة للأعلى", en: "Back to top" },
  footerDirectCall: { ar: "اتصال مباشر", en: "Direct call" },
  footerContactWa: { ar: "تواصل عبر واتساب", en: "Contact via WhatsApp" },
  footerSanaa: { ar: "اليمن · صنعاء · حي شميلة", en: "Yemen · Sanaa · Al-Shamila" },
  footerPlatformDesc: {
    ar: "منصة ViP Yemen تربط أصحاب الأعمال والباحثين عن الفرص في اليمن",
    en: "ViP Yemen connects businesses with opportunity seekers across Yemen",
  },
  /* ── Admin panel ── */
  adminLabel: { ar: "لوحة التحكم", en: "Admin Panel" },
  adminPublicSite: { ar: "الموقع العام", en: "Public site" },
  adminBackToSite: { ar: "العودة إلى الموقع العام", en: "Back to public site" },
  adminLock: { ar: "قفل بالبصمة", en: "Lock with biometric" },
  adminLockTitle: { ar: "قفل لوحة التحكم — تتطلب البصمة/الوجه لإعادة الفتح", en: "Lock admin — requires biometric to unlock" },
  adminBiometricTitle: { ar: "حماية بالبصمة", en: "Biometric protection" },
  adminBiometricDesc: { ar: "لوحة التحكم محمية بالتحقق الحيوي — ثبّت بصمتك أو أظهر وجهك للمتابعة.", en: "The admin panel is protected by biometric verification — touch your fingerprint or show your face to continue." },
  adminBiometricBtn: { ar: "تحقق بالبصمة / الوجه", en: "Verify with biometric" },
  adminBiometricVerifying: { ar: "جارٍ التحقق...", en: "Verifying..." },
  adminBiometricError: { ar: "لم يتم التحقق — حاول مجدداً", en: "Verification failed — try again" },
  adminLogout: { ar: "تسجيل خروج", en: "Sign out" },
  adminRedirecting: { ar: "يتم التحويل...", en: "Redirecting..." },
  adminBack: { ar: "رجوع", en: "Back" },
  /* ── Ticker ── */
  tickerLine1: { ar: "ViP Yemen — منصة التوظيف والتسويق العقاري والإلكتروني والخدمات البرمجية", en: "ViP Yemen — Jobs, Real Estate, E-Marketing & Software platform" },
  tickerLine2: { ar: "للإعلان والتواصل: واتساب 00967711780999", en: "For advertising & contact: WhatsApp 00967711780999" },
  tickerLine3: { ar: "عروض وخدمات بجودة عالية وبأسعار منافسة", en: "High-quality deals and services at competitive prices" },
  /* ── Navbar / misc ── */
  navAriaLabel: { ar: "أقسام المنصة", en: "Platform sections" },
  navMobileAria: { ar: "قائمة الجوال", en: "Mobile menu" },
  whatsappAria: { ar: "تواصل معنا عبر واتساب", en: "Contact us on WhatsApp" },
  assistantAria: { ar: "المساعد — البحث الشامل", en: "Assistant — Smart Search" },
  adminAriaLabel: { ar: "قائمة لوحة التحكم", en: "Admin panel menu" },
  adminBackTitle: { ar: "العودة إلى القسم السابق", en: "Go back to previous section" },
  adminSectionNav: { ar: "الانتقال السريع بين الأقسام", en: "Quick section navigation" },
  biometricOpenAdmin: { ar: "فتح لوحة التحكم", en: "Open admin panel" },
  biometricErrorUnexpected: { ar: "خطأ غير متوقع", en: "Unexpected error" },
  biometricSupabaseUnavailable: { ar: "خدمة Supabase غير متاحة في هذا الإصدار.", en: "Supabase service not available in this version." },
  hideBanner: { ar: "إخفاء", en: "Hide" },
  /* ── Offline banners ── */
  previewMode: { ar: "وضع المعاينة — المحتوى الحي يظهر بعد ضبط رابط الخادم", en: "Preview mode — live content shows after setting the server URL" },
  offlineMode: { ar: "وضع دون اتصال — التطبيق يعمل من الذاكرة، ويتحدث المحتوى تلقائياً عند عودة الشبكة", en: "Offline mode — app runs from cache, content updates automatically when back online" },
  menuClose: { ar: "إغلاق القائمة", en: "Close menu" },
  menuOpen: { ar: "فتح القائمة", en: "Open menu" },
  exit: { ar: "خروج", en: "Exit" },

  /* ── Assistant ── */
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
  /* ── Assistant page ── */
  aiErrorKey: { ar: "لم يتم تفعيل مفتاح محرك الذكاء الاصطناعي بعد — أضِفه من إعدادات المنصة ثم أعد المحاولة.", en: "AI engine key not yet activated — add it in platform settings and try again." },
  aiError404: { ar: "محرك الذكاء يحدّث نماذجه تلقائياً — أعد المحاولة الآن وسيعمل فوراً.", en: "The AI engine is updating its models — try again now and it should work." },
  aiErrorAuth: { ar: "تعذّر الاتصال بخدمة الذكاء الاصطناعي (راجع مفتاح Gemini) — استخدم البحث الموسوعي بالأسفل.", en: "Could not connect to AI service (check Gemini key) — use encyclopedia search below." },
  aiErrorOffline: { ar: "لا يوجد اتصال بالإنترنت حالياً — استخدم البحث الموسوعي بالأسفل.", en: "No internet connection — use encyclopedia search below." },
  aiErrorDefault: { ar: "تعذّر الحصول على إجابة ذكية حالياً — أعد المحاولة أو استخدم البحث الموسوعي بالأسفل.", en: "Could not get an AI answer — try again or use encyclopedia search below." },
  aiErrorUnexpected: { ar: "حدث خطأ غير متوقع", en: "An unexpected error occurred" },
  faq1Q: { ar: "كيف أنشر إعلاني في المنصة؟", en: "How do I publish my ad on the platform?" },
  faq1A: { ar: "سجّل بياناتك في القسم المناسب (توظيف / عقارات / تسويق إلكتروني / برمجيات)، ثم تُراجع بياناتك من إدارة المنصة في لوحة التحكم، وبعد التدقيق والتعديل يُنشر إعلانك تلقائياً على واجهة المنصة وقنوات التواصل.", en: "Register your data in the appropriate section (Jobs / Real Estate / E-Marketing / Software), then your data is reviewed by platform management in the admin panel, and after verification and editing your ad is automatically published on the platform and social channels." },
  faq2Q: { ar: "هل بياناتي تظهر للجميع فور التسجيل؟", en: "Does my data appear to everyone immediately after registration?" },
  faq2A: { ar: "لا — بياناتك تصل أولاً إلى لوحة التحكم بشكل خاص ومستقل وسري للمراجعة والتدقيق، ولا تظهر على الواجهة إلا بعد الاعتماد والنشر من الإدارة.", en: "No — your data first reaches the admin panel privately for review and verification, and only appears after approval and publishing by management." },
  faq3Q: { ar: "كيف أتواصل مع إدارة المنصة؟", en: "How do I contact platform management?" },
  faq3A: { ar: "عبر واتساب 00967711780999 أو البريد vipservicesyemen@gmail.com — وتتواصل معك الإدارة مباشرة عند الحاجة لضمان الجودة.", en: "Via WhatsApp 00967711780999 or email vipservicesyemen@gmail.com — management contacts you directly when needed to ensure quality." },
  faq4Q: { ar: "هل التحقق من رقم الهاتف إلزامي؟", en: "Is phone number verification mandatory?" },
  faq4A: { ar: "نعم — في قسم التسويق الإلكتروني يتأكد النظام من صحة الرقم عبر رمز تحقق يُرسل عبر واتساب المنصة، ويُوثَّق الرقم في بياناتك.", en: "Yes — in the E-Marketing section the system verifies your number via a code sent through platform WhatsApp, and your number is registered." },
  faq5Q: { ar: "كيف أعرف أن المنتج تم بيعه؟", en: "How do I know a product has been sold?" },
  faq5A: { ar: "أي منتج يُباع تضع عليه الإدارة إشارة «تم البيع» من داخل لوحة التحكم وتظهر فوراً على الإعلان في الواجهة.", en: "Any sold product is marked 'Sold' by management from the admin panel and it shows immediately on the listing." },
  faq6Q: { ar: "هل يمكن تثبيت المنصة كتطبيق؟", en: "Can I install the platform as an app?" },
  faq6A: { ar: "نعم — المنصة تطبيق ويب تقدمي (PWA) يمكن تثبيته على هاتفك ويعمل حتى بدون إنترنت. لإصدارات Android وiOS تواصل مع إدارة المنصة عبر واتساب 00967711780999 لتزويدك بالنسخة المعتمدة.", en: "Yes — the platform is a Progressive Web App (PWA) that can be installed on your phone and works even offline. For Android and iOS versions, contact platform management via WhatsApp 00967711780999." },
  aiSearchDesc: { ar: "ابحث في كل ما يخص المنصة: المنشورات، العروض، الإعلانات، والأسئلة الشائعة — بإجابات ذكية من محرك المعرفة الاحترافي", en: "Search everything related to the platform: listings, offers, ads, and FAQs — with smart answers from the professional knowledge engine" },
  aiEngineLabel: { ar: "بالأ最新 النماذج مع تحويل تلقائي عند تحديثها، وأي معلومة عامة عبر البحث الموسوعي.", en: "with the latest models and automatic fallback when updated, plus general info via encyclopedia search." },
  platformResults: { ar: "نتائج في المنصة", en: "Platform results" },
  noPlatformResults: { ar: "لا توجد نتائج مطابقة في المنصة", en: "No matching results on the platform" },
  noPlatformResultsHint: { ar: "جرّب كلمات أخرى أو ابحث في الموسوعة العامة أدناه", en: "Try different words or search the encyclopedia below" },
  aiSearching: { ar: "جارٍ البحث في المعرفة الذكية...", en: "Searching the AI knowledge base..." },
  aiUseEncyclopedia: { ar: "يمكنك استخدام البحث الموسوعي العام أدناه كبديل.", en: "You can use the encyclopedia search below as an alternative." },
  aiRetry: { ar: "إعادة المحاولة", en: "Try again" },
  aiAnswerLabel: { ar: "إجابة المساعد الذكي", en: "AI Assistant answer" },
  aiEngine: { ar: "المحرك:", en: "Engine:" },
  encyclopediaSearch: { ar: "البحث الموسوعي العام (Wikipedia)", en: "Encyclopedia search (Wikipedia)" },
  encyclopediaEmpty: { ar: "لا توجد نتائج في الموسوعة العامة", en: "No results in the encyclopedia" },
  encyclopediaHint: { ar: "اضغط زر «بحث» أعلاه ليبحث المساعد في الموسوعة العامة أيضاً.", en: "Press the search button above for the assistant to search the encyclopedia too." },
  notFoundSearch: { ar: "لم تجد ما تبحث عنه؟ تواصل مع فريق المنصة مباشرة — يسعدنا مساعدتك في أي استفسار.", en: "Couldn't find what you're looking for? Contact the platform team directly — we're happy to help." },
  contactViaWa: { ar: "تواصل معنا عبر واتساب", en: "Contact us on WhatsApp" },
  registerNowBtn: { ar: "سجّل بياناتك الآن", en: "Register your data now" },
  viewPosts: { ar: "عرض المنشورات", en: "View listings" },
  noPosts: { ar: "لا توجد منشورات معتمدة بعد", en: "No approved listings yet" },
  noPostsHint: {
    ar: "كن أول من يسجل — تُراجع الطلبات وتُنشر فور اعتمادها من الإدارة",
    en: "Be the first — requests are reviewed and published as soon as management approves them",
  },
  whatsappContact: { ar: "تواصل معنا عبر واتساب", en: "Contact us on WhatsApp" },

  /* ── Auth page ── */
  adminPanel: { ar: "لوحة تحكم ViP Yemen", en: "ViP Yemen Admin Panel" },
  adminPanelSub: { ar: "منطقة آمنة لإدارة المنصة — للمسؤولين فقط", en: "Secure area for platform management — admins only" },
  mustChangePassword: {
    ar: "يجب تغيير كلمة المرور الافتراضية عند أول دخول لأمان حسابك. ستُستخدم بياناتك لتأكيد الهوية.",
    en: "You must change the default password on first login for account security. Your data will be used for identity verification.",
  },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  currentPassword: { ar: "كلمة المرور الحالية", en: "Current password" },
  newPassword: { ar: "كلمة المرور الجديدة", en: "New password" },
  confirmNewPassword: { ar: "تأكيد كلمة المرور الجديدة", en: "Confirm new password" },
  saveNewPassword: { ar: "حفظ كلمة المرور الجديدة", en: "Save new password" },
  passwordMismatch: { ar: "كلمتا المرور غير متطابقتين", en: "Passwords do not match" },
  passwordChanged: { ar: "تم تغيير كلمة المرور بنجاح — جارٍ الدخول...", en: "Password changed successfully — logging in..." },
  passwordChangeError: { ar: "تعذر تغيير كلمة المرور", en: "Failed to change password" },
  loginError: { ar: "خطأ في تسجيل الدخول", en: "Login error" },
  forgotPassword: { ar: "نسيت كلمة المرور؟", en: "Forgot password?" },
  resetPasswordTitle: { ar: "استعادة كلمة المرور", en: "Reset password" },
  resetPasswordSub: { ar: "أدخل بريد الإدارة وسيصلك رمز مكوّن من 6 أرقام.", en: "Enter the admin email and you'll receive a 6-digit code." },
  sendResetCode: { ar: "إرسال رمز الاستعادة", en: "Send reset code" },
  resetCodeSent: { ar: "تم إرسال رمز الاستعادة إلى بريدك الإلكتروني — تحقق من صندوق الوارد", en: "Reset code sent to your email — check your inbox" },
  resetCodeFailed: { ar: "تعذر إرسال البريد حالياً (لم يُضبط مفتاح الإرسال) — استخدم رمز الطوارئ أدناه", en: "Could not send email (sending key not set) — use the emergency code below" },
  resetCodeError: { ar: "تعذر إرسال رمز الاستعادة", en: "Failed to send reset code" },
  resetCode: { ar: "رمز الاستعادة", en: "Reset code" },
  resetCodePlaceholder: { ar: "6 أرقام", en: "6 digits" },
  resetConfirmPassword: { ar: "تأكيد كلمة المرور", en: "Confirm password" },
  resetCodeLabel: { ar: "رمز الطوارئ (بيئة تجريبية)", en: "Emergency code (dev only)" },
  setNewPassword: { ar: "تعيين كلمة المرور", en: "Set new password" },
  passwordResetDone: { ar: "تم تعيين كلمة المرور الجديدة — سجّل الدخول الآن", en: "New password set — log in now" },
  resetError: { ar: "تعذر إعادة التعيين", en: "Reset failed" },
  loginTitle: { ar: "تسجيل الدخول", en: "Sign in" },
  loginSub: { ar: "بريد الإدارة وكلمة المرور", en: "Admin email and password" },
  loginBtn: { ar: "دخول لوحة التحكم", en: "Sign in to Admin" },
  supportEmail: { ar: "للدعم الفني", en: "For support" },
  currentPasswordPlaceholder: { ar: "••••••••", en: "••••••••" },
  passwordPlaceholder: { ar: "8 أحرف على الأقل", en: "8 characters minimum" },
  confirmPlaceholder: { ar: "أعد كتابة كلمة المرور", en: "Re-enter password" },

  /* ── Not found ── */
  notFoundTitle: { ar: "عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها. تأكد من الرابط أو عد إلى الصفحة الرئيسية.", en: "Sorry, the page you're looking for doesn't exist or has been moved. Check the URL or go back to the homepage." },
  goHome: { ar: "العودة للرئيسية", en: "Go home" },

  /* ── Error boundary ── */
  unexpectedError: { ar: "حدث خطأ غير متوقع", en: "An unexpected error occurred" },
  autoRestart: { ar: "يعيد النظام تشغيل المنصة تلقائياً — إذا لم يحدث ذلك اضغط الزر أدناه.", en: "The system will restart automatically — if not, click the button below." },
  restartPlatform: { ar: "إعادة تشغيل المنصة", en: "Restart platform" },
  backToHome: { ar: "العودة للرئيسية", en: "Back to home" },

  /* ── Privacy policy ── */
  privacyBadge: { ar: "سياسة الخصوصية", en: "Privacy Policy" },
  privacyTitle: { ar: "سياسة الخوصية", en: "Privacy Policy" },
  privacyLastUpdated: { ar: "آخر تحديث: 2026 — منصة ViP Yemen تلتزم بحماية بياناتك وخصوصيتك.", en: "Last updated: 2026 — ViP Yemen is committed to protecting your data and privacy." },
  privacySection1Title: { ar: "1. البيانات التي نجمعها", en: "1. Data we collect" },
  privacySection1Body: { ar: "نجمع فقط البيانات التي تقدمها طوعاً عند التسجيل: الاسم الكامل، رقم الهاتف، العنوان، بيانات الطلب، والمرفقات. لا نجمع أي بيانات من جهازك دون علمك.", en: "We only collect data you voluntarily provide when registering: full name, phone number, address, request details, and attachments. We do not collect any data from your device without your knowledge." },
  privacySection2Title: { ar: "2. كيفية استخدام البيانات", en: "2. How we use data" },
  privacySection2Body: { ar: "تُستخدم بياناتك حصرياً لأغراض المنصة: مراجعة الطلبات، التواصل معك، ونشر الطلبات المعتمدة.", en: "Your data is used exclusively for platform purposes: reviewing requests, communicating with you, and publishing approved listings." },
  privacySection3Title: { ar: "3. حماية البيانات", en: "3. Data protection" },
  privacySection3Body: { ar: "نستخدم تشفيراً متقدماً لكلمات المرور، وجلسات آمنة، وتخزيناً سحابياً محمياً.", en: "We use advanced encryption for passwords, secure sessions, and protected cloud storage." },
  privacySection4Title: { ar: "4. مشاركة البيانات", en: "4. Data sharing" },
  privacySection4Body: { ar: "لا نبيع ولا نشارك بياناتك مع أي طرف ثالث لأغراض تسويقية.", en: "We do not sell or share your data with any third party for marketing purposes." },
  privacySection5Title: { ar: "5. التواصل", en: "5. Contact" },
  privacySection5Body: { ar: "لأي استفسار حول بياناتك: vipservicesyemen@gmail.com أو واتساب 00967711780999.", en: "For any data inquiries: vipservicesyemen@gmail.com or WhatsApp 00967711780999." },
  privacySection6Title: { ar: "6. حقوقك", en: "6. Your rights" },
  privacySection6Body: { ar: "لديك الحق في طلب تصحيح أو حذف بياناتك في أي وقت.", en: "You have the right to request correction or deletion of your data at any time." },
  privacyNote: {
    ar: "يُعتمد هذا النص كسياسة خصوصية رسمية للمنصة وللتطبيقات المنشورة في متاجر Google Play وApp Store.",
    en: "This text is adopted as the official privacy policy for the platform and apps published on Google Play and App Store.",
  },

  /* ── Offers page ── */
  offersHallBadge: { ar: "صالة العروض الترويجية", en: "Promotional Offers Hall" },
  offersHallTitle: { ar: "صالة العروض الحصرية", en: "Exclusive Offers Hall" },
  offersHallSub: {
    ar: "عروض وخدمات وخصومات تُنشر من إدارة المنصة لحظياً — بالصور والفيديوهات. كل عرض مُدقَّق ومضمون، واطلبه مباشرة عبر واتساب.",
    en: "Deals, services and discounts published by platform management live — with photos and videos. Every offer is verified and guaranteed, request directly via WhatsApp.",
  },
  realDiscounts: { ar: "خصومات حقيقية", en: "Real discounts" },
  adminVerified: { ar: "عروض مدققة من الإدارة", en: "Verified by management" },
  liveUpdates: { ar: "تُحدث لحظياً", en: "Updated live" },
  featuredOffer: { ar: "العرض المঈ", en: "Featured offer" },
  discount: { ar: "خصم", en: "Discount" },
  requestOffer: { ar: "اطلب هذا العرض", en: "Request this offer" },
  watchVideo: { ar: "شاهد الفيديو", en: "Watch video" },
  noOffers: { ar: "لا توجد عروض حالياً", en: "No offers available yet" },
  noOffersHint: { ar: "تترقب عروضاً جديدة قريباً — تابعنا عبر واتساب", en: "New offers coming soon — follow us on WhatsApp" },
  offersCta: {
    ar: "لديك عرض خاص أو ترغب بالترويج لمنشأتك في صالة العروض؟ تواصل مع إدارة المنصة — ننشر عروضك بالصور والفيديوهات على واجهة المنصة وقنوات التواصل.",
    en: "Have a special offer or want to promote your business in the Offers Hall? Contact platform management — we'll publish your offers with photos and videos.",
  },
  riyal: { ar: "ريال", en: "YER" },

  /* ── Channels page ── */
  channelsPageTitle: { ar: "قنواتنا الرقمية", en: "Our Digital Channels" },
  channelsPageSub: {
    ar: "تابع منصة ViP Yemen على جميع قنواتنا الرسمية — كل منشور معتمد يُنشر تلقائياً لتصل إليك Opportunities لحظة بلحظة.",
    en: "Follow ViP Yemen on all our official channels — every approved post is published automatically so opportunities reach you in real time.",
  },
  whyJoin: { ar: "لماذا تنضم لقنواتنا؟", en: "Why join our channels?" },
  livePost: { ar: "نشر لحظي", en: "Live publishing" },
  livePostText: { ar: "كل منشور معتمد من لوحة التحكم يصل لقنواتنا فوراً — بدون تأخير.", en: "Every admin-approved post reaches our channels instantly — no delay." },
  alerts: { ar: "تنبيهات فورية", en: "Instant alerts" },
  alertsText: { ar: "إشعارات فورية لكل جديد: وظائف، عقارات، منتجات، وعروض حصرية.", en: "Instant notifications for everything new: jobs, real estate, products, and exclusive deals." },
  community: { ar: "مجتمع واسع", en: "Wide community" },
  communityText: { ar: "انضم لآلاف المتابعين وتابع الفرص قبل الجميع على منصات متعددة.", en: "Join thousands of followers and catch opportunities first across multiple platforms." },
  trustedContent: { ar: "محتوى موثوق", en: "Trusted content" },
  trustedContentText: { ar: "كل ما يُنشر على قنواتنا مرّ بالمراجعة الإدارية والتدقيق أولاً.", en: "Everything published on our channels goes through admin review and verification first." },
  interlinkedChannels: { ar: "قنوات مترابطة — محتوى واحد متزامن", en: "Interlinked channels — one synchronized content" },
  interlinkedSub: { ar: "المنشور المعتمد يظهر على الواجهة وعلى جميع القنوات معاً وبشكل آلي", en: "Approved posts appear on the platform and all channels simultaneously and automatically" },
  live: { ar: "مباشر", en: "LIVE" },
  dontMiss: { ar: "لا تفوّت أي فرصة — انضم الآن لجميع قنواتنا", en: "Don't miss any opportunity — join all our channels now" },
  dontMissSub: {
    ar: "وتذكّر: يمكنك أيضاً التسجيل مباشرة في أقسام المنصة أو التواصل معنا عبر واتساب الأعمال.",
    en: "And remember: you can also register directly in the platform sections or contact us via WhatsApp.",
  },
  browseSections: { ar: "تصفح أقسام المنصة", en: "Browse platform sections" },
  directContact: { ar: "للتواصل المباشر مع إدارة المنصة:", en: "For direct contact with platform management:" },
  whatsappBusiness: { ar: "واتساب الأعمال", en: "WhatsApp Business" },

  /* ── Submission form ── */
  dataReviewedPrivately: {
    ar: "تُعرض بياناتك أولاً في لوحة التحكم للمراجعة والتدقيق قبل النشر — ضماناً للحقوق والجودة.",
    en: "Your data is first shown in the admin panel for review and verification before publishing — guaranteeing rights and quality.",
  },
  fullName: { ar: "الاسم الكامل", en: "Full name" },
  fullNamePlaceholder: { ar: "الاسم الثلاثي", en: "Full name" },
  phoneLabel: { ar: "رقم الهاتف (واتساب)", en: "Phone number (WhatsApp)" },
  phonePlaceholder: { ar: "مثال: 771234567", en: "e.g. 771234567" },
  addressLabel: { ar: "العنوان / المدينة", en: "Address / City" },
  addressPlaceholder: { ar: "المحافظة والمدينة", en: "Governorate and city" },
  priceLabel: { ar: "السعر", en: "Price" },
  priceOptional: { ar: "السعر (اختياري)", en: "Price (optional)" },
  yemeniRiyal: { ar: "ريال يمني", en: "Yemeni Riyal" },
  dollar: { ar: "دولار", en: "USD" },
  saudiRiyal: { ar: "ريال سعودي", en: "SAR" },
  phoneVerify: { ar: "التحقق من رقم الهاتف", en: "Phone verification" },
  otpPlaceholder: { ar: "أدخل رمز التحقق", en: "Enter verification code" },
  getOtp: { ar: "احصل على الرمز", en: "Get code" },
  otpCodeLabel: { ar: "رمز التحقق:", en: "Verification code:" },
  otpSendViaWhatsapp: { ar: "أرسل الرمز عبر واتساب المنصة ({phone}) لإتمام التحقق، ثم أدخله في الحقل أعلاه.", en: "Send the code via the platform's WhatsApp ({phone}) to complete verification, then enter it above." },
  sendViaWhatsapp: { ar: "إرسال الرمز عبر واتساب", en: "Send code via WhatsApp" },
  otpError: { ar: "أدخل رقم الهاتف أولاً ثم اطلب رمز التحقق", en: "Enter your phone number first then request a verification code" },
  otpSendError: { ar: "تعذر إرسال رمز التحقق", en: "Failed to send verification code" },
  detailedDescription: { ar: "وصف تفصيلي", en: "Detailed description" },
  attachmentsLabel: { ar: "المرفقات (صور المؤهلات، السيرة الذاتية، صور المنتج / العقار...)", en: "Attachments (qualification photos, CV, product / property photos...)" },
  uploadingFiles: { ar: "جارٍ رفع الملفات...", en: "Uploading files..." },
  chooseFiles: { ar: "اضغط لاختيار الملفات — صور / PDF", en: "Click to choose files — images / PDF" },
  fileUploadError: { ar: "فشل رفع الملف — حاول مرة أخرى", en: "File upload failed — try again" },
  deleteAttachment: { ar: "حذف المرفق", en: "Delete attachment" },
  dataReviewNotice: {
    ar: "بياناتك تُعرض على إدارة المنصة فقط بشكل خاص وسري للمراجعة والتدقيق قبل النشر. الإدارة قد تعدّل البيانات وتتواصل معك لضمان الجودة والموثوقية.",
    en: "Your data is shown only to platform management privately for review and verification before publishing. Management may edit data and contact you to ensure quality and reliability.",
  },
  submitForReview: { ar: "إرسال الطلب للمراجعة", en: "Submit for review" },
  submitError: { ar: "حدث خطأ أثناء الإرسال", en: "An error occurred during submission" },
  submissionSuccess: { ar: "تم استلام طلبك بنجاح", en: "Your request has been received" },
  submissionSuccessSub: {
    ar: "سيتم مراجعة طلبك من قبل إدارة المنصة بشكل خاص وسري، وبعد التدقيق والتعديل سيُنشر على واجهة المنصة — وستتواصل معك الإدارة عند الحاجة.",
    en: "Your request will be reviewed privately by platform management, and after verification and editing it will be published on the platform — management will contact you if needed.",
  },
  submitAnother: { ar: "إرسال طلب آخر", en: "Submit another request" },
  selectOption: { ar: "اختر...", en: "Select..." },
  whatsappNumber: { ar: "واتساب المنصة", en: "Platform WhatsApp" },
  requiredFields: { ar: "حقول مطلوبة", en: "Required fields" },

  /* ── Submission card ── */
  verifiedNumber: { ar: "رقم موثق", en: "Verified number" },
  sold: { ar: "تم البيع", en: "Sold" },
  contactWhatsapp: { ar: "تواصل عبر واتساب", en: "Contact via WhatsApp" },

  /* ── Offer card ── */
  featuredBadge: { ar: "عرض مميز", en: "Featured" },

  /* ── Status labels ── */
  statusPending: { ar: "قيد الانتظار", en: "Pending" },
  statusPublished: { ar: "منشور", en: "Published" },
  statusRejected: { ar: "مرفوض", en: "Rejected" },
  statusSold: { ar: "تم البيع", en: "Sold" },
  statusArchived: { ar: "مؤرشف", en: "Archived" },

  /* ── Category labels ── */
  catJobs: { ar: "التوظيف", en: "Jobs" },
  catJobsShort: { ar: "توظيف", en: "Jobs" },
  catJobsHero: { ar: "فرص عمل موثوقة وكوادر مؤهلة", en: "Trusted job opportunities and qualified talent" },
  catJobsDesc: {
    ar: "سجّل بياناتك كباحث عن عمل أو أعلن عن وظيفة في منشأتك — تُراجع الطلبات من إدارة المنصة قبل النشر لضمان الحقوق والجودة.",
    en: "Register as a job seeker or post a vacancy — requests are reviewed by platform management before publishing to ensure rights and quality.",
  },
  catRealEstate: { ar: "التسويق العقاري", en: "Real Estate" },
  catRealEstateShort: { ar: "عقارات", en: "Real Estate" },
  catRealEstateHero: { ar: "عقارات موثوقة وبائعون ومشترون حقيقيون", en: "Trusted properties with real sellers and buyers" },
  catRealEstateDesc: {
    ar: "اعرض أرضك أو منزلك أو عمارتك أو فيلتك، أو سجّل طلبك كباحث عن عقار — كل الطلبات تمر بمراجعة إدارة المنصة قبل النشر.",
    en: "List your land, house, building, or villa, or register as a property seeker — all requests go through platform management review before publishing.",
  },
  catEmarket: { ar: "التسويق الإلكتروني", en: "E-Marketing" },
  catEmarketShort: { ar: "تسويق إلكتروني", en: "E-Marketing" },
  catEmarketHero: { ar: "اعرض منتجك أو ابحث عن طلبك — مع تحقق من رقم الهاتف", en: "List your product or search for what you need — with phone verification" },
  catEmarketDesc: {
    ar: "سوق إلكتروني شامل: أجهزة، سيارات، آلات، سلع متنوعة. يتحقق النظام من رقم هاتفك ويربطك مباشرة بواتساب المنصة.",
    en: "A comprehensive e-market: devices, cars, machinery, diverse goods. The system verifies your phone number and connects you directly to the platform's WhatsApp.",
  },
  catSoftware: { ar: "البرمجيات وتطوير التطبيقات", en: "Software & App Development" },
  catSoftwareShort: { ar: "برمجيات", en: "Software" },
  catSoftwareHero: { ar: "مواقع وتطبيقات وأنظمة برمجية بمعايير عالمية", en: "Websites, apps and software systems with world-class standards" },
  catSoftwareDesc: {
    ar: "اطلب مشروعك البرمجي: مواقع ويب، تطبيقات جوال، لوحات تحكم، أنظمة متكاملة — تُراجع طلباتك من الإدارة وتُتواصل معك مباشرة.",
    en: "Order your software project: websites, mobile apps, dashboards, integrated systems — your requests are reviewed by management who contact you directly.",
  },

  /* ── Submission type labels ── */
  typeSeeker: { ar: "أبحث عن عمل", en: "Job seeker" },
  typeEmployer: { ar: "أنا صاحب منشأة / أعلن عن وظيفة", en: "Employer / Post a job" },
  typeOwner: { ar: "أنا مالك عقار — أريد البيع / التأجير", en: "Property owner — Sell / Rent" },
  typeBuyer: { ar: "أبحث عن عقار", en: "Property seeker" },
  typeSeller: { ar: "أعرض منتجاً للبيع", en: "Sell a product" },
  typeClient: { ar: "أطلب خدمة برمجية", en: "Request software service" },

  /* ── Form field labels ── */
  fieldJobTitle: { ar: "المسمى الوظيفي المطلوب", en: "Job title" },
  fieldJobTitlePlaceholder: { ar: "مثال: مهندس مدني / محاسب / مصمم جرافيك", en: "e.g. Civil Engineer / Accountant / Graphic Designer" },
  fieldAboutYou: { ar: "ملخص عنك وخبراتك", en: "Summary of yourself and experience" },
  fieldAboutYouPlaceholder: { ar: "اكتب نبذة عن خبراتك ومهاراتك وسبب بحثك عن هذه الوظيفة", en: "Write a brief about your experience, skills and why you're looking for this job" },
  fieldProfession: { ar: "المهنة / التخصص", en: "Profession / Specialty" },
  fieldExperience: { ar: "سنوات الخبرة", en: "Years of experience" },
  fieldExperiencePlaceholder: { ar: "مثال: 3 سنوات", en: "e.g. 3 years" },
  fieldQualifications: { ar: "المؤهلات والشهادات", en: "Qualifications & Certificates" },
  fieldQualificationsPlaceholder: { ar: "اذكر مؤهلاتك العلمية والشهادات والدورات (يُرفق إثباتها في المرفقات)", en: "List your academic qualifications, certificates and courses (attach proof in attachments)" },
  fieldExpectedSalary: { ar: "الراتب المتوقع (اختياري)", en: "Expected salary (optional)" },
  fieldSalaryPlaceholder: { ar: "مثال: 150,000 ريال", en: "e.g. 150,000 YER" },
  fieldCompanyName: { ar: "اسم المنشأة / الشركة", en: "Company / Organization name" },
  fieldCompanyNamePlaceholder: { ar: "اسم المنشأة", en: "Company name" },
  fieldJobDescription: { ar: "وصف الوظيفة والمهام", en: "Job description and duties" },
  fieldJobDescriptionPlaceholder: { ar: "اكتب وصف المهام والمسؤوليات للوظيفة", en: "Describe the job duties and responsibilities" },
  fieldWorkType: { ar: "نوع العمل", en: "Work type" },
  fieldRequirements: { ar: "الشروط والمتطلبات", en: "Requirements" },
  fieldRequirementsPlaceholder: { ar: "اذكر شروط التقديم: المؤهلات، الخبرة، المهارات المطلوبة", en: "List application requirements: qualifications, experience, required skills" },
  fieldSalary: { ar: "الراتب (اختياري)", en: "Salary (optional)" },
  fieldPropertyTitle: { ar: "عنوان العقار", en: "Property title" },
  fieldPropertyTitlePlaceholder: { ar: "مثال: أرض في حدة — مساحة 200 متر", en: "e.g. Land in Hadda — 200 sqm" },
  fieldPropertyDetails: { ar: "تفاصيل العقار", en: "Property details" },
  fieldPropertyDetailsPlaceholder: { ar: "موقع العقار، الواجهة، الخدمات القريبة، سبب البيع، أي تفاصيل مهمة", en: "Location, facade, nearby services, reason for sale, any important details" },
  fieldPropertyType: { ar: "نوع العقار", en: "Property type" },
  fieldArea: { ar: "المساحة (متر مربع)", en: "Area (square meters)" },
  fieldAreaPlaceholder: { ar: "مثال: 250", en: "e.g. 250" },
  fieldDistrict: { ar: "الحي / المديرية", en: "District / Director" },
  fieldDistrictPlaceholder: { ar: "مثال: حي شميلة — صنعاء", en: "e.g. Shamila district — Sanaa" },
  fieldPurpose: { ar: "الغرض", en: "Purpose" },
  fieldDocuments: { ar: "الأوراق والمستندات المتوفرة", en: "Available documents" },
  fieldDocumentsPlaceholder: { ar: "مثال: صك ملكية، عقد مسجل، فاتورة كهرباء — مع رفع صورها في المرفقات", en: "e.g. Ownership deed, registered contract, electricity bill — attach photos" },
  fieldPropertyWanted: { ar: "نوع العقار المطلوب", en: "Desired property type" },
  fieldPropertyWantedPlaceholder: { ar: "مثال: فيلا في حدة بمساحة 300 متر", en: "e.g. Villa in Hadda, 300 sqm" },
  fieldRequestDetails: { ar: "طلبك بالتفصيل", en: "Your request in detail" },
  fieldRequestDetailsPlaceholder: { ar: "اكتب تفاصيل طلبك: الموقع المفضل، المساحة، المواصفات، الميزانية", en: "Describe your request: preferred location, area, specifications, budget" },
  fieldDistrictPreferred: { ar: "الحي / المديرية المفضلة", en: "Preferred district" },
  fieldDistrictPreferredPlaceholder: { ar: "مثال: حدة أو الحصبة — صنعاء", en: "e.g. Hadda or Hasba — Sanaa" },
  fieldProductName: { ar: "اسم المنتج / السلعة", en: "Product / Item name" },
  fieldProductNamePlaceholder: { ar: "مثال: جوال آيفون 13 — 128GB", en: "e.g. iPhone 13 — 128GB" },
  fieldProductSpecs: { ar: "المواصفات والتفاصيل", en: "Specifications & details" },
  fieldProductSpecsPlaceholder: { ar: "الحالة، المواصفات، الملحقات، سبب البيع، إمكانية التفاوض", en: "Condition, specs, accessories, reason for sale, negotiability" },
  fieldProductType: { ar: "نوع المنتج", en: "Product type" },
  fieldBrand: { ar: "الماركة / الموديل", en: "Brand / Model" },
  fieldBrandPlaceholder: { ar: "مثال: سامسونج Galaxy S23", en: "e.g. Samsung Galaxy S23" },
  fieldCondition: { ar: "الحالة", en: "Condition" },
  fieldProductWanted: { ar: "المنتج / السلعة المطلوبة", en: "Desired product" },
  fieldProductWantedPlaceholder: { ar: "مثال: لابتوب للمونتاج بميزانية 400,000", en: "e.g. Laptop for editing, budget 400,000" },
  fieldRequestDetailsEmarket: { ar: "طلبك بالتفصيل", en: "Your request in detail" },
  fieldRequestDetailsEmarketPlaceholder: { ar: "المواصفات المطلوبة، الميزانية، مكان التسليم", en: "Required specs, budget, delivery location" },
  fieldProductTypeWanted: { ar: "نوع المنتج المطلوب", en: "Desired product type" },
  fieldBrandPreferred: { ar: "الماركة / الموديل المفضل", en: "Preferred brand / model" },
  fieldProjectType: { ar: "نوع المشروع", en: "Project type" },
  fieldProjectTypePlaceholder: { ar: "مثال: متجر إلكتروني متكامل", en: "e.g. Complete e-commerce store" },
  fieldProjectDescription: { ar: "وصف المشروع والمتطلبات", en: "Project description & requirements" },
  fieldProjectDescriptionPlaceholder: { ar: "اشرح فكرة المشروع بالتفصيل: الأقسام، المستخدمون، الميزات المطلوبة، الفترة الزمنية", en: "Describe the project in detail: sections, users, required features, timeline" },
  fieldBudget: { ar: "الميزانية التقديرية (اختياري)", en: "Estimated budget (optional)" },
  fieldDeadline: { ar: "الفترة الزمنية المتوقعة", en: "Expected timeline" },
  fieldDeadlinePlaceholder: { ar: "مثال: شهران", en: "e.g. 2 months" },
  fieldReferences: { ar: "مراجع / نماذج مشابهة (اختياري)", en: "References / Similar examples (optional)" },
  fieldReferencesPlaceholder: { ar: "روابط لمواقع أو تطبيقات مشابهة تفضلها", en: "Links to similar websites or apps you prefer" },

  /* ── Select options — professions ── */
  optEngineer: { ar: "مهندس", en: "Engineer" },
  optAccountant: { ar: "محاسب", en: "Accountant" },
  optTeacher: { ar: "معلم", en: "Teacher" },
  optMedical: { ar: "ممرض / طبيب", en: "Nurse / Doctor" },
  optDeveloper: { ar: "مبرمج / مطور", en: "Programmer / Developer" },
  optDesigner: { ar: "مصمم جرافيك / مونتاج", en: "Graphic designer / Editor" },
  optMarketer: { ar: "مسوق إلكتروني", en: "Digital marketer" },
  optSecretary: { ar: "سكرتير / إداري", en: "Secretary / Admin" },
  optWorker: { ar: "عامل", en: "Worker" },
  optDriver: { ar: "سائق", en: "Driver" },
  optOther: { ar: "أخرى", en: "Other" },

  /* ── Select options — work type ── */
  optFullTime: { ar: "دوام كامل", en: "Full time" },
  optPartTime: { ar: "دوام جزئي", en: "Part time" },
  optRemote: { ar: "عن بُعد", en: "Remote" },
  optTemp: { ar: "مؤقت / موسمي", en: "Temporary / Seasonal" },

  /* ── Select options — property type ── */
  optLand: { ar: "أرض", en: "Land" },
  optHouse: { ar: "منزل", en: "House" },
  optBuilding: { ar: "عمارة", en: "Building" },
  optVilla: { ar: "فيلا", en: "Villa" },
  optApartment: { ar: "شقة", en: "Apartment" },
  optCommercial: { ar: "محل تجاري", en: "Commercial" },
  optFarm: { ar: "مزرعة", en: "Farm" },

  /* ── Select options — purpose ── */
  optSell: { ar: "بيع", en: "Sell" },
  optRent: { ar: "إيجار", en: "Rent" },
  optSellOrRent: { ar: "بيع أو إيجار", en: "Sell or rent" },
  optBuy: { ar: "شراء", en: "Buy" },
  optBuyOrRent: { ar: "شراء أو إيجار", en: "Buy or rent" },

  /* ── Select options — product type ── */
  optElectronics: { ar: "جهاز إلكتروني", en: "Electronic device" },
  optPhoneTablet: { ar: "جوال / تابلت", en: "Phone / Tablet" },
  optLaptop: { ar: "حاسوب / لابتوب", en: "Computer / Laptop" },
  optCar: { ar: "سيارة", en: "Car" },
  optMachinery: { ar: "آلة / معدات", en: "Machinery / Equipment" },
  optGoods: { ar: "سلعة", en: "Goods" },

  /* ── Select options — condition ── */
  optNew: { ar: "جديد", en: "New" },
  optUsedExcellent: { ar: "مستعمل — بحالة ممتازة", en: "Used — Excellent condition" },
  optUsedGood: { ar: "مستعمل — جيد", en: "Used — Good condition" },
  optUsedFair: { ar: "مستعمل — مقبول", en: "Used — Fair condition" },

  /* ── Select options — software service type ── */
  optWebsite: { ar: "موقع ويب", en: "Website" },
  optAndroidApp: { ar: "تطبيق أندرويد", en: "Android app" },
  optIosApp: { ar: "تطبيق iOS", en: "iOS app" },
  optBothApps: { ar: "تطبيق Android + iOS", en: "Android + iOS app" },
  optDashboard: { ar: "لوحة تحكم", en: "Dashboard" },
  optIntegratedSystem: { ar: "نظام متكامل", en: "Integrated system" },
  optUiUx: { ar: "تصميم واجهات UI/UX", en: "UI/UX design" },
  optSeoMarketing: { ar: "تسويق إلكتروني و SEO", en: "Digital marketing & SEO" },
  optMaintenance: { ar: "صيانة وتطوير", en: "Maintenance & development" },
};

/* ─── Category nested translations ─── */

const CATEGORY_T: Record<
  string,
  Record<string, { ar: string; en: string }>
> = {
  jobs: {
    label: DICT.catJobs,
    shortLabel: DICT.catJobsShort,
    hero: DICT.catJobsHero,
    description: DICT.catJobsDesc,
    seeker_label: DICT.typeSeeker,
    seeker_titleLabel: DICT.fieldJobTitle,
    seeker_titlePlaceholder: DICT.fieldJobTitlePlaceholder,
    seeker_descLabel: DICT.fieldAboutYou,
    seeker_descPlaceholder: DICT.fieldAboutYouPlaceholder,
    seeker_profession: DICT.fieldProfession,
    seeker_experience: DICT.fieldExperience,
    seeker_experiencePlaceholder: DICT.fieldExperiencePlaceholder,
    seeker_qualifications: DICT.fieldQualifications,
    seeker_qualificationsPlaceholder: DICT.fieldQualificationsPlaceholder,
    seeker_expectedSalary: DICT.fieldExpectedSalary,
    seeker_expectedSalaryPlaceholder: DICT.fieldSalaryPlaceholder,
    employer_label: DICT.typeEmployer,
    employer_titleLabel: DICT.fieldJobTitle,
    employer_titlePlaceholder: DICT.fieldJobTitlePlaceholder,
    employer_descLabel: DICT.fieldJobDescription,
    employer_descPlaceholder: DICT.fieldJobDescriptionPlaceholder,
    employer_company: DICT.fieldCompanyName,
    employer_companyPlaceholder: DICT.fieldCompanyNamePlaceholder,
    employer_profession: DICT.fieldProfession,
    employer_workType: DICT.fieldWorkType,
    employer_requirements: DICT.fieldRequirements,
    employer_requirementsPlaceholder: DICT.fieldRequirementsPlaceholder,
    employer_salary: DICT.fieldSalary,
    employer_salaryPlaceholder: DICT.fieldSalaryPlaceholder,
  },
  real_estate: {
    label: DICT.catRealEstate,
    shortLabel: DICT.catRealEstateShort,
    hero: DICT.catRealEstateHero,
    description: DICT.catRealEstateDesc,
    owner_label: DICT.typeOwner,
    owner_titleLabel: DICT.fieldPropertyTitle,
    owner_titlePlaceholder: DICT.fieldPropertyTitlePlaceholder,
    owner_descLabel: DICT.fieldPropertyDetails,
    owner_descPlaceholder: DICT.fieldPropertyDetailsPlaceholder,
    owner_propertyType: DICT.fieldPropertyType,
    owner_area: DICT.fieldArea,
    owner_areaPlaceholder: DICT.fieldAreaPlaceholder,
    owner_district: DICT.fieldDistrict,
    owner_districtPlaceholder: DICT.fieldDistrictPlaceholder,
    owner_purpose: DICT.fieldPurpose,
    owner_documents: DICT.fieldDocuments,
    owner_documentsPlaceholder: DICT.fieldDocumentsPlaceholder,
    buyer_label: DICT.typeBuyer,
    buyer_titleLabel: DICT.fieldPropertyWanted,
    buyer_titlePlaceholder: DICT.fieldPropertyWantedPlaceholder,
    buyer_descLabel: DICT.fieldRequestDetails,
    buyer_descPlaceholder: DICT.fieldRequestDetailsPlaceholder,
    buyer_propertyType: DICT.fieldPropertyType,
    buyer_district: DICT.fieldDistrictPreferred,
    buyer_districtPlaceholder: DICT.fieldDistrictPreferredPlaceholder,
    buyer_purpose: DICT.fieldPurpose,
  },
  emarket: {
    label: DICT.catEmarket,
    shortLabel: DICT.catEmarketShort,
    hero: DICT.catEmarketHero,
    description: DICT.catEmarketDesc,
    seller_label: DICT.typeSeller,
    seller_titleLabel: DICT.fieldProductName,
    seller_titlePlaceholder: DICT.fieldProductNamePlaceholder,
    seller_descLabel: DICT.fieldProductSpecs,
    seller_descPlaceholder: DICT.fieldProductSpecsPlaceholder,
    seller_productType: DICT.fieldProductType,
    seller_brand: DICT.fieldBrand,
    seller_brandPlaceholder: DICT.fieldBrandPlaceholder,
    seller_condition: DICT.fieldCondition,
    buyer_label: DICT.typeBuyer,
    buyer_titleLabel: DICT.fieldProductWanted,
    buyer_titlePlaceholder: DICT.fieldProductWantedPlaceholder,
    buyer_descLabel: DICT.fieldRequestDetailsEmarket,
    buyer_descPlaceholder: DICT.fieldRequestDetailsEmarketPlaceholder,
    buyer_productType: DICT.fieldProductTypeWanted,
    buyer_brand: DICT.fieldBrandPreferred,
    buyer_brandPlaceholder: DICT.fieldBrandPreferredPlaceholder,
  },
  software: {
    label: DICT.catSoftware,
    shortLabel: DICT.catSoftwareShort,
    hero: DICT.catSoftwareHero,
    description: DICT.catSoftwareDesc,
    client_label: DICT.typeClient,
    client_titleLabel: DICT.fieldProjectType,
    client_titlePlaceholder: DICT.fieldProjectTypePlaceholder,
    client_descLabel: DICT.fieldProjectDescription,
    client_descPlaceholder: DICT.fieldProjectDescriptionPlaceholder,
    client_projectType: DICT.fieldProjectType,
    client_budget: DICT.fieldBudget,
    client_budgetPlaceholder: DICT.fieldSalaryPlaceholder,
    client_deadline: DICT.fieldDeadline,
    client_deadlinePlaceholder: DICT.fieldDeadlinePlaceholder,
    client_references: DICT.fieldReferences,
    client_referencesPlaceholder: DICT.fieldReferencesPlaceholder,
  },
};

/* ─── Select option translations ─── */

const OPTION_T: Record<string, { ar: string; en: string }> = {
  مهندس: DICT.optEngineer,
  محاسب: DICT.optAccountant,
  معلم: DICT.optTeacher,
  "ممرض / طبيب": DICT.optMedical,
  "مبرمج / مطور": DICT.optDeveloper,
  "مصمم جرافيك / مونتاج": DICT.optDesigner,
  "مسوق إلكتروني": DICT.optMarketer,
  "سكرتير / إداري": DICT.optSecretary,
  عامل: DICT.optWorker,
  سائق: DICT.optDriver,
  أخرى: DICT.optOther,
  "دوام كامل": DICT.optFullTime,
  "دوام جزئي": DICT.optPartTime,
  "عن بُعد": DICT.optRemote,
  "مؤقت / موسمي": DICT.optTemp,
  أرض: DICT.optLand,
  منزل: DICT.optHouse,
  عمارة: DICT.optBuilding,
  فيلا: DICT.optVilla,
  شقة: DICT.optApartment,
  "محل تجاري": DICT.optCommercial,
  مزرعة: DICT.optFarm,
  بيع: DICT.optSell,
  إيجار: DICT.optRent,
  "بيع أو إيجار": DICT.optSellOrRent,
  شراء: DICT.optBuy,
  "شراء أو إيجار": DICT.optBuyOrRent,
  "جهاز إلكتروني": DICT.optElectronics,
  "جوال / تابلت": DICT.optPhoneTablet,
  "حاسوب / لابتوب": DICT.optLaptop,
  سيارة: DICT.optCar,
  "آلة / معدات": DICT.optMachinery,
  سلعة: DICT.optGoods,
  جديد: DICT.optNew,
  "مستعمل — بحالة ممتازة": DICT.optUsedExcellent,
  "مستعمل — جيد": DICT.optUsedGood,
  "مستعمل — مقبول": DICT.optUsedFair,
  "موقع ويب": DICT.optWebsite,
  "تطبيق أندرويد": DICT.optAndroidApp,
  "تطبيق iOS": DICT.optIosApp,
  "تطبيق Android + iOS": DICT.optBothApps,
  "لوحة تحكم": DICT.optDashboard,
  "نظام متكامل": DICT.optIntegratedSystem,
  "تصميم واجهات UI/UX": DICT.optUiUx,
  "تسويق إلكتروني و SEO": DICT.optSeoMarketing,
  "صيانة وتطوير": DICT.optMaintenance,
};

/* ─── Context & Provider ─── */

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  /** Translate a category's top-level property (label, hero, description, etc.) */
  tCat: (categoryKey: string, property: string) => string;
  /** Translate a submission type's field within a category */
  tField: (categoryKey: string, typeValue: string, property: string) => string;
  /** Translate a select option value */
  tOption: (arabicValue: string) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: "ar",
  setLang: () => {},
  t: (k) => k,
  tCat: () => "",
  tField: () => "",
  tOption: (v) => v,
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
      /* storage unavailable */
    }
  }, [lang]);

  const value: LangContextValue = useMemo(
    () => ({
      lang,
      setLang: setLangState,
      t: (key: string) => DICT[key]?.[lang] ?? key,
      tCat: (catKey: string, prop: string) =>
        CATEGORY_T[catKey]?.[prop]?.[lang] ?? "",
      tField: (catKey: string, typeValue: string, prop: string) =>
        CATEGORY_T[catKey]?.[`${typeValue}_${prop}`]?.[lang] ?? "",
      tOption: (arabicValue: string) =>
        OPTION_T[arabicValue]?.[lang] ?? arabicValue,
    }),
    [lang]
  );

  return (
    <LangContext.Provider value={value}>{children}</LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}

/** Compact globe toggle */
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
      <span className="text-[10px] font-black tracking-wide">
        {lang === "ar" ? "EN" : "عربي"}
      </span>
    </button>
  );
}
