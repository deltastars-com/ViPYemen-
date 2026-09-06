import { Link } from "react-router-dom";
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Sparkles,
  ArrowUp,
} from "lucide-react";
import { Logo } from "./Logo";
import { PLATFORM_WHATSAPP_LINK } from "@/lib/utils";

const SOCIALS = [
  { icon: Facebook, href: "https://www.facebook.com/ViPservicesYemen/", label: "فيسبوك" },
  { icon: Instagram, href: "https://www.instagram.com/vipservicesyemen", label: "إنستغرام" },
  { icon: Twitter, href: "https://twitter.com/ViPservicesYeme", label: "تويتر" },
  { icon: Youtube, href: "https://youtube.com/channel/UCJGfi4S63-Nm2rSXpBqzHtw", label: "يوتيوب" },
  { icon: Linkedin, href: "https://www.linkedin.com/in/ali-aldahan-57b5a2231", label: "لينكدإن" },
  { icon: MessageCircle, href: "https://chat.whatsapp.com/i5vycbmxwyykhctc8tsn9x", label: "قناة واتساب" },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-ink-700/50 bg-ink-950">
      <div className="container-app grid gap-10 py-14 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-300">
            منصة يمنية شاملة للتوظيف والتسويق العقاري والتسويق الإلكتروني والخدمات
            البرمجية — بجودة عالية وتواصل مباشر وموثوق.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-600/60 text-ink-300 transition-all hover:border-gold-500/60 hover:text-gold-300"
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-black text-gold-300">أقسام المنصة</h4>
          <ul className="space-y-2.5 text-sm font-semibold text-ink-300">
            <li><Link className="transition-colors hover:text-gold-300" to="/jobs">قسم التوظيف</Link></li>
            <li><Link className="transition-colors hover:text-gold-300" to="/real-estate">قسم التسويق العقاري</Link></li>
            <li><Link className="transition-colors hover:text-gold-300" to="/emarket">قسم التسويق الإلكتروني</Link></li>
            <li><Link className="transition-colors hover:text-gold-300" to="/software">قسم البرمجيات وتطوير التطبيقات</Link></li>
            <li><Link className="transition-colors hover:text-gold-300" to="/offers">قسم العروض الترويجية</Link></li>
            <li><Link className="transition-colors hover:text-gold-300" to="/assistant">المساعد الذكي</Link></li>
            <li><Link className="transition-colors hover:text-gold-300" to="/releases">الإصدارات والتطبيقات</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-black text-gold-300">تواصل معنا</h4>
          <ul className="space-y-3 text-sm text-ink-300">
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-gold-400" />
              <span dir="ltr">00967711780999 / 773597404</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-gold-400" />
              vipservicesyemen@gmail.com
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-gold-400" />
              اليمن · صنعاء · حي شميلة
            </li>
          </ul>
          <a href={PLATFORM_WHATSAPP_LINK} target="_blank" rel="noreferrer" className="btn-gold mt-5 !py-2.5 text-xs">
            <MessageCircle className="h-4 w-4" />
            تواصل عبر واتساب
          </a>
          <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-ink-400">
            <Link className="transition-colors hover:text-gold-300" to="/privacy-policy">سياسة الخصوصية</Link>
            <Link className="transition-colors hover:text-gold-300" to="/releases">دليل النشر</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-ink-700/50 py-5">
        <div className="container-app flex flex-col items-center justify-between gap-3 text-xs text-ink-400 sm:flex-row">
          <p>© 2026 ViP Yemen — جميع الحقوق محفوظة. المهندس علي درهم الدحان</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-gold-400" />
              تطبيق ويب تقدمي — يعمل بدون إنترنت
            </span>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-600/60 text-ink-300 transition-colors hover:border-gold-500/60 hover:text-gold-300"
              aria-label="العودة للأعلى"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}