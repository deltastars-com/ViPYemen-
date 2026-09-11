import { Link, useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { LogoMark } from "./Logo";
import { PLATFORM_WHATSAPP_LINK } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

export function WhatsAppButton() {
  const { t } = useLang();
  return (
    <a
      href={PLATFORM_WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsappAria")}
      title={t("whatsappAria")}
      className="fixed bottom-5 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.7)] transition-transform hover:scale-110"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}

export function AssistantEntry() {
  const { pathname } = useLocation();
  const { t } = useLang();
  if (pathname === "/assistant") return null;
  return (
    <Link
      to="/assistant"
      aria-label={t("assistantAria")}
      title={t("assistantAria")}
      className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-gold-500/50 bg-ink-900/95 shadow-[0_8px_24px_-8px_rgba(212,175,55,0.5)] transition-transform hover:scale-110"
    >
      <LogoMark className="h-6 w-6" />
    </Link>
  );
}