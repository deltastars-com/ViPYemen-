import { useState } from "react";
import { useQuery } from "convex/react";
import { Navigate, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { api } from "../convex/_generated/api";
import { getAdminToken, clearAdminToken, CONVEX_URL } from "@/lib/convex";
import { isBiometricEnrolled, verifyBiometric } from "@/lib/biometric";
import { Fingerprint } from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminSubmissions } from "@/components/admin/AdminSubmissions";
import { AdminAds } from "@/components/admin/AdminAds";
import { AdminOffers } from "@/components/admin/AdminOffers";
import { AdminFinance } from "@/components/admin/AdminFinance";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { AdminReleases } from "@/components/admin/AdminReleases";
import { AdminSettings } from "@/components/admin/AdminSettings";

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
  | "releases"
  | "settings";

const TABS: { key: AdminTab; label: string; icon: any; category?: string }[] = [
  { key: "overview", label: "نظرة عامة", icon: LayoutDashboard },
  { key: "jobs", label: "طلبات التوظيف", icon: Briefcase, category: "jobs" },
  { key: "real_estate", label: "طلبات العقارات", icon: Home, category: "real_estate" },
  { key: "emarket", label: "طلبات التسويق الإلكتروني", icon: ShoppingBag, category: "emarket" },
  { key: "software", label: "طلبات البرمجيات", icon: Code2, category: "software" },
  { key: "archived", label: "الأرشيف", icon: Archive },
  { key: "ads", label: "الإعلانات الترويجية", icon: Megaphone },
  { key: "offers", label: "العروض", icon: Crown },
  { key: "finance", label: "النظام المالي", icon: Wallet },
  { key: "notifications", label: "الإشعارات", icon: Bell },
  { key: "releases", label: "الإصدارات", icon: PackageOpen },
  { key: "settings", label: "الإعدادات", icon: Settings },
];

export function AdminPage() {
  const token = getAdminToken();
  const session = useQuery(api.users.getSession, { token });
  const [tab, setTab] = useState<AdminTab>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  // Biometric gate state (hooks must run unconditionally — early returns follow)
  const [biometricUnlocked, setBiometricUnlocked] = useState(!isBiometricEnrolled());
  const [bioBusy, setBioBusy] = useState(false);
  const [bioError, setBioError] = useState("");

  if (!CONVEX_URL) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="card-surface max-w-md p-8 text-center">
          <Logo compact className="justify-center" />
          <h1 className="mt-4 text-lg font-black text-cream">لوحة التحكم</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            خدمات البيانات غير مُفعّلة في هذا الإصدار بعد — تُفعَّل لوحة
            التحكم تلقائياً بمجرد ربط المنصة بخادم البيانات السحابي
            (VITE_CONVEX_URL في إعدادات البناء).
          </p>
          <a
            href="https://wa.me/967711780999"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold mt-6 w-full"
          >
            تواصل مع الإدارة عبر واتساب
          </a>
          <button onClick={() => navigate("/")} className="btn-ghost mt-3 w-full">
            العودة للرئيسية
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
    const ok = await verifyBiometric("فتح لوحة التحكم");
    setBioBusy(false);
    if (ok) setBiometricUnlocked(true);
    else setBioError("لم يتم التحقق — حاول مجدداً");
  }

  if (isBiometricEnrolled() && !biometricUnlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="card-surface w-full max-w-sm p-8 text-center">
          <LogoMark className="mx-auto h-16 w-16" />
          <h1 className="mt-4 text-lg font-black text-cream">حماية بالبصمة</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">
            لوحة التحكم محمية بالتحقق الحيوي — ثبّت بصمتك أو أظهر وجهك للمتابعة.
          </p>
          <Fingerprint className="mx-auto mt-5 h-10 w-10 text-gold-400" />
          {bioError && <p className="mt-3 text-xs font-bold text-rose-400">{bioError}</p>}
          <button onClick={unlockWithBiometric} disabled={bioBusy} className="btn-gold mt-5 w-full disabled:opacity-60">
            {bioBusy ? "جارٍ التحقق..." : "تحقق بالبصمة / الوجه"}
          </button>
          <button onClick={handleLogout} className="btn-ghost mt-3 w-full text-xs">
            تسجيل خروج
          </button>
        </div>
      </div>
    );
  }

  function handleLogout() {
    clearAdminToken();
    navigate("/");
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
              aria-label="قائمة لوحة التحكم"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Logo compact />
            <span className="hidden rounded-lg border border-gold-500/30 bg-gold-500/10 px-2.5 py-1 text-[10px] font-black text-gold-300 sm:block">
              لوحة التحكم
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-bold text-ink-300 sm:block">{session.name}</span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              خروج
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
          <AdminSidebar tab={tab} setTab={setTab} />
        </aside>

        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMenuOpen(false)}>
            <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" />
            <aside
              className="absolute right-0 top-0 h-full w-72 overflow-y-auto border-l border-ink-700/60 bg-ink-950 p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <AdminSidebar tab={tab} setTab={(t) => { setTab(t); setMenuOpen(false); }} />
            </aside>
          </div>
        )}

        {/* Content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="text-xl font-black text-cream">
              <activeTab.icon className="mb-1 ml-2 inline h-5 w-5 text-gold-400" />
              {activeTab.label}
            </h1>
          </div>
          {tab === "overview" && <AdminOverview token={token} setTab={setTab} />}
          {tab === "jobs" && <AdminSubmissions token={token} category="jobs" />}
          {tab === "real_estate" && <AdminSubmissions token={token} category="real_estate" />}
          {tab === "emarket" && <AdminSubmissions token={token} category="emarket" />}
          {tab === "software" && <AdminSubmissions token={token} category="software" />}
          {tab === "archived" && <AdminSubmissions token={token} category="all" archived />}
          {tab === "ads" && <AdminAds token={token} />}
          {tab === "offers" && <AdminOffers token={token} />}
          {tab === "finance" && <AdminFinance token={token} />}
          {tab === "notifications" && <AdminNotifications token={token} />}
          {tab === "releases" && <AdminReleases token={token} />}
          {tab === "settings" && <AdminSettings token={token} />}
        </main>
      </div>
    </div>
  );
}

function AdminSidebar({ tab, setTab }: { tab: AdminTab; setTab: (t: AdminTab) => void }) {
  return (
    <nav className="space-y-1">
      {TABS.map((t) => (
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
    </nav>
  );
}