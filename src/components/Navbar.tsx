import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LayoutDashboard, LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { getAdminToken, clearAdminToken } from "@/lib/convex";
import { LanguageToggle, useLang } from "@/lib/i18n";

const LINKS = [
  { to: "/", key: "home" },
  { to: "/jobs", key: "jobs" },
  { to: "/real-estate", key: "realEstate" },
  { to: "/emarket", key: "emarket" },
  { to: "/software", key: "software" },
  { to: "/offers", key: "offers" },
  { to: "/channels", key: "channels" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [signedIn, setSignedIn] = useState(() => !!getAdminToken());
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLang();

  // Reflect login/logout state: re-check the session token whenever the
  // route changes (e.g. after signing in at /auth or logging out).
  useEffect(() => {
    setSignedIn(!!getAdminToken());
  }, [location.pathname]);

  function handleLogout() {
    clearAdminToken();
    setSignedIn(false);
    navigate("/");
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-ink-700/50 bg-ink-950/85 backdrop-blur-lg transition-shadow",
        scrolled && "shadow-[0_10px_40px_-20px_rgba(0,0,0,0.8)]"
      )}
    >
      <div className="container-app flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="ViP Yemen">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label={t("navAriaLabel")}>
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-bold transition-colors",
                  isActive
                    ? "bg-gold-500/10 text-gold-300"
                    : "text-ink-200 hover:bg-ink-800/70 hover:text-cream"
                )
              }
            >
              {t(l.key)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Link to="/assistant" className="btn-ghost hidden !px-3.5 !py-2 text-xs md:inline-flex">
            {t("assistant")}
          </Link>
          <Link to="/admin" className="btn-gold hidden !px-4 !py-2 text-xs md:inline-flex">
            <LayoutDashboard className="h-4 w-4" />
            {t("dashboard")}
          </Link>
          {signedIn && (
            <button
              onClick={handleLogout}
              title={t("logout")}
              className="hidden items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/20 md:inline-flex"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t("logout")}
            </button>
          )}
          <button
            className="rounded-lg border border-ink-600/70 p-2 text-cream lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? t("menuClose") : t("menuOpen")}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-700/50 bg-ink-950/98 lg:hidden">            <nav className="container-app flex flex-col gap-1 py-3" aria-label={t("navMobileAria")}>
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-4 py-2.5 text-sm font-bold",
                    isActive ? "bg-gold-500/10 text-gold-300" : "text-ink-200 hover:bg-ink-800/70"
                  )
                }
              >
                {t(l.key)}
              </NavLink>
            ))}
            <div className="mt-2 flex gap-2 border-t border-ink-700/50 pt-3">
              <Link to="/assistant" className="btn-ghost flex-1 text-xs">
                {t("assistant")}
              </Link>
              <Link to="/admin" className="btn-gold flex-1 text-xs">
                <LayoutDashboard className="h-4 w-4" />
                {t("dashboard")}
              </Link>
              {signedIn && (
                <button
                  onClick={handleLogout}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/20"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {t("logout")}
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}