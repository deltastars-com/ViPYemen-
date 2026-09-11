import { useRef, useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Briefcase,
  Home,
  ShoppingBag,
  Code2,
  Archive,
  Megaphone,
  Crown,
  Wallet,
  Bell,
  PackageOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Users2,
  Undo2,
  Globe,
  Lock,
  ArrowDownToLine,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import { getAdminToken, clearAdminToken, CONVEX_URL, CONVEX_DEPLOY_KEY } from "@/lib/convex";
import { supabase } from "@/lib/supabase";
import { isBiometricEnrolled, verifyBiometric } from "@/lib/biometric";
import { Fingerprint } from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminSubmissions } from "@/components/admin/AdminSubmissions";
import { AdminAds } from "@/components/admin/AdminAds";
import { AdminOffers } from "@/components/admin/AdminOffers";
import { AdminFinance } from "@/components/admin/AdminFinance";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { AdminReleases } from "@/components/admin/AdminReleases";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminClients } from "@/components/admin/AdminClients";

export type AdminTab =
  | "overview"
  | "jobs"
  | "real_estate"
  | "emarket"
  | "software"
  | "archived"
  | "ads"
  | "offers"
  | "finance"
  | "notifications"
  | "clients"
  | "releases"
  | "settings";

function getTabs(lang: "ar" | "en") {
  const L = {
    ar: { overview: "نظرة عامة", jobs: "طلبات التوظيف", real_estate: "طلبات العقارات", emarket: "طلبات التسويق الإلكتروني", software: "طلبات البرمجيات", archived: "الأرشيف", ads: "الإعلانات الترويجية", offers: "العروض", finance: "النظام المالي", notifications: "الإشعارات", clients: "بيانات العملاء", releases: "الإصدارات", settings: "الإعدادات" },
    en: { overview: "Overview", jobs: "Job Requests", real_estate: "Real Estate", emarket: "E-Marketing", software: "Software", archived: "Archive", ads: "Promotional Ads", offers: "Offers", finance: "Finance", notifications: "Notifications", clients: "Clients", releases: "Releases", settings: "Settings" },
  };
  const t = L[lang];
  return [
    { key: "overview" as AdminTab, label: t.overview, icon: LayoutDashboard },
    { key: "jobs" as AdminTab, label: t.jobs, icon: Briefcase, category: "jobs" },
    { key: "real_estate" as AdminTab, label: t.real_estate, icon: Home, category: "real_estate" },
    { key: "emarket" as AdminTab, label: t.emarket, icon: ShoppingBag, category: "emarket" },
    { key: "software" as AdminTab, label: t.software, icon: Code2, category: "software" },
    { key: "archived" as AdminTab, label: t.archived, icon: Archive },
    { key: "ads" as AdminTab, label: t.ads, icon: Megaphone },
    { key: "offers" as AdminTab, label: t.offers, icon: Crown },
    { key: "finance" as AdminTab, label: t.finance, icon: Wallet },
    { key: "notifications" as AdminTab, label: t.notifications, icon: Bell },
    { key: "clients" as AdminTab, label: t.clients, icon: Users2 },
    { key: "releases" as AdminTab, label: t.releases, icon: PackageOpen },
    { key: "settings" as AdminTab, label: t.settings, icon: Settings },
  ];
}

export function AdminPage() {
  const { lang, t } = useLang();
  const TABS = useMemo(() => getTabs(lang), [lang]);
  const token = getAdminToken();
  const session = useQuery(api.users.getSession, { token });
  const [tab, setTab] = useState<AdminTab>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  // Tab-history navigation (hooks must run unconditionally — early returns follow)
  const historyRef = useRef<AdminTab[]>([]);
  // Biometric gate state
  const [biometricUnlocked, setBiometricUnlocked] = useState(!isBiometricEnrolled());
  const [bioBusy, setBioBusy] = useState(false);
  const [bioError, setBioError] = useState("");

  function goToTab(t: AdminTab) {
    if (t === tab) return;
    historyRef.current = [...historyRef.current, tab].slice(-30);
    setTab(t);
    setMenuOpen(false);
  }

  function goBack() {
    const prev = historyRef.current.pop();
    if (prev) setTab(prev);
  }

  if (!CONVEX_URL) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="card-surface max-w-md p-8 text-center">
          <Logo compact className="justify-center" />
          <h1 className="mt-4 text-lg font-black text-cream">{t("adminLabel")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            {lang === "ar" ? "خدمات البيانات غير مُفعّلة في هذا الإصدار بعد — تُفعَّل لوحة التحكم تلقائياً بمجرد ربط المنصة بخادم البيانات السحابي (VITE_CONVEX_URL في إعدادات البناء)." : "Data services not yet enabled — admin panel activates automatically once connected to the cloud database (VITE_CONVEX_URL in build settings)."}
          </p>
          <a
            href="https://wa.me/967711780999"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold mt-6 w-full"
          >
            {t("whatsappContact")}
          </a>
          <button onClick={() => navigate("/")} className="btn-ghost mt-3 w-full">
            {t("goHome")}
          </button>
        </div>
      </div>
    );
  }

  if (session === null) {
    return <Navigate to={`/auth?returnTo=/admin`} replace />;
  }
  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gold-400">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />
      </div>
    );
  }
  if (session.mustChangePassword) {
    return <Navigate to={`/auth?returnTo=/admin`} replace />;
  }

  // Biometric gate: when enrolled on this device, the dashboard unlocks
  // only after a successful fingerprint/face verification.
  async function unlockWithBiometric() {
    setBioBusy(true);
    setBioError("");
    const ok = await verifyBiometric(t("biometricOpenAdmin"));
    setBioBusy(false);
    if (ok) setBiometricUnlocked(true);
    else setBioError(t("adminBiometricError"));
  }

  if (isBiometricEnrolled() && !biometricUnlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="card-surface w-full max-w-sm p-8 text-center">
          <LogoMark className="mx-auto h-16 w-16" />
          <h1 className="mt-4 text-lg font-black text-cream">{t("adminBiometricTitle")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">
            {t("adminBiometricDesc")}
          </p>
          <Fingerprint className="mx-auto mt-5 h-10 w-10 text-gold-400" />
          {bioError && <p className="mt-3 text-xs font-bold text-rose-400">{bioError}</p>}
          <button onClick={unlockWithBiometric} disabled={bioBusy} className="btn-gold mt-5 w-full disabled:opacity-60">
            {bioBusy ? t("adminBiometricVerifying") : t("adminBiometricBtn")}
          </button>
          <button onClick={handleLogout} className="btn-ghost mt-3 w-full text-xs">
            {t("adminLogout")}
          </button>
        </div>
      </div>
    );
  }

  function handleLogout() {
    clearAdminToken();
    navigate("/");
  }

  // Supabase-powered admin operations (when env variables are available).
  async function verifyPhoneViaSupabase(phone: string) {
    const client = supabase.client;
    if (!client) return { ok: false, error: t("biometricSupabaseUnavailable") };
    // Send verification code through Supabase Auth (if configured).
    try {
      const { error } = await client.auth.signInWithOtp({ phone, options: { channel: "sms" } });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : t("biometricErrorUnexpected") };
    }
  }

  const activeTab = TABS.find((t) => t.key === tab)!;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-ink-700/50 bg-ink-950/90 backdrop-blur-lg">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg border border-ink-600/60 p-2 lg:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={t("adminAriaLabel")}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Logo compact />              <span className="hidden rounded-lg border border-gold-500/30 bg-gold-500/10 px-2.5 py-1 text-[10px] font-black text-gold-300 sm:block">
              {t("adminLabel")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isBiometricEnrolled() && biometricUnlocked && (
              <button
                onClick={() => setBiometricUnlocked(false)}
                title={t("adminLockTitle")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gold-500/40 bg-gold-500/10 px-3 py-1.5 text-xs font-bold text-gold-300 transition-colors hover:bg-gold-500/20"
              >
                <Lock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("adminLock")}</span>
              </button>
            )}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-600/60 px-3 py-1.5 text-xs font-bold text-ink-200 transition-colors hover:border-gold-500/50 hover:text-gold-300"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("adminPublicSite")}</span>
            </Link>
            <span className="hidden text-xs font-bold text-ink-300 md:block">{session.name}</span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t("logout")}
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "sticky top-16 h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-l border-ink-700/50 bg-ink-950/60 p-3",
            "hidden lg:block"
          )}
        >
          <AdminSidebar tabs={TABS} tab={tab} setTab={goToTab} />
        </aside>

        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMenuOpen(false)}>
            <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" />
            <aside
              className="absolute right-0 top-0 h-full w-72 overflow-y-auto border-l border-ink-700/60 bg-ink-950 p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <AdminSidebar tabs={TABS} tab={tab} setTab={goToTab} />
            </aside>
          </div>
        )}

        {/* Content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          {/* Quick navigation bar — move between sections without full logout */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={goBack}
              disabled={historyRef.current.length === 0}
              title={t("adminBackTitle")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-600/60 px-3 py-1.5 text-xs font-bold text-ink-200 transition-colors hover:border-gold-500/50 hover:text-gold-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Undo2 className="h-3.5 w-3.5" />
              {t("adminBack")}
            </button>
            <div className="hidden items-center gap-1 overflow-x-auto rounded-lg border border-ink-600/60 px-2 py-1.5 md:flex">
              <ArrowDownToLine className="h-3.5 w-3.5 shrink-0 text-ink-400" />
              <select
                value={tab}
                onChange={(e) => goToTab(e.target.value as AdminTab)}
                className="bg-transparent text-xs font-bold text-ink-200 outline-none"
                aria-label={t("adminSectionNav")}
              >
                {TABS.map((t) => (
                  <option key={t.key} value={t.key} className="bg-ink-950">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-1 items-center gap-1 overflow-x-auto pb-1 md:hidden">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => goToTab(t.key)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                    tab === t.key
                      ? "bg-gold-500/15 text-gold-300"
                      : "border border-ink-600/60 text-ink-300 hover:text-cream"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="text-xl font-black text-cream">
              <activeTab.icon className="mb-1 ml-2 inline h-5 w-5 text-gold-400" />
              {activeTab.label}
            </h1>
          </div>

          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {tab === "overview" && <AdminOverview token={token} setTab={goToTab} />}
            {tab === "jobs" && <AdminSubmissions token={token} category="jobs" />}
            {tab === "real_estate" && <AdminSubmissions token={token} category="real_estate" />}
            {tab === "emarket" && <AdminSubmissions token={token} category="emarket" />}
            {tab === "software" && <AdminSubmissions token={token} category="software" />}
            {tab === "archived" && <AdminSubmissions token={token} category="all" archived />}
            {tab === "ads" && <AdminAds token={token} />}
            {tab === "offers" && <AdminOffers token={token} />}
            {tab === "finance" && <AdminFinance token={token} />}
            {tab === "notifications" && <AdminNotifications token={token} />}
            {tab === "clients" && <AdminClients token={token} />}
            {tab === "releases" && <AdminReleases token={token} />}
            {tab === "settings" && <AdminSettings token={token} />}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function AdminSidebar({ tabs, tab, setTab }: { tabs: { key: AdminTab; label: string; icon: any; category?: string }[]; tab: AdminTab; setTab: (t: AdminTab) => void }) {
  const { t: tFn } = useLang();
  return (
    <nav className="space-y-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-right text-[13px] font-bold transition-colors",
            tab === t.key
              ? "bg-gold-500/15 text-gold-300"
              : "text-ink-200 hover:bg-ink-800/70 hover:text-cream"
          )}
        >
          <t.icon className={cn("h-5 w-5 shrink-0", tab === t.key ? "text-gold-400" : "text-ink-400")} />
          {t.label}
        </button>
      ))}
      <div className="border-t border-ink-700/50 pt-2">
        <Link
          to="/"
          className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-right text-[13px] font-bold text-ink-200 transition-colors hover:bg-ink-800/70 hover:text-gold-300"
        >
          <Globe className="h-5 w-5 shrink-0 text-ink-400" />
          {tFn("adminBackToSite")}
        </Link>
      </div>
    </nav>
  );
}