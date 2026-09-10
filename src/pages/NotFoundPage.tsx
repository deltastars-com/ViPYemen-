import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function NotFoundPage() {
  const { t } = useLang();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <Compass className="mb-4 h-14 w-14 text-gold-400" />
      <h1 className="text-4xl font-black text-cream">
        4<span className="gold-text">0</span>4
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-300">
        {t("notFoundTitle")}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-gold">{t("goHome")}</Link>
        <Link to="/admin" className="btn-ghost">{t("dashboard")}</Link>
      </div>
    </div>
  );
}
