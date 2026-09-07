import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "الرئيسية" },
  { to: "/jobs", label: "التوظيف" },
  { to: "/real-estate", label: "العقارات" },
  { to: "/emarket", label: "التسويق الإلكتروني" },
  { to: "/software", label: "البرمجيات" },
  { to: "/offers", label: "العروض" },
  { to: "/channels", label: "قنواتنا" },
  { to: "/releases", label: "الإصدارات" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

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
        <Link to="/" aria-label="ViP Yemen الرئيسية">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="أقسام المنصة">
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
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/assistant" className="btn-ghost hidden !px-3.5 !py-2 text-xs md:inline-flex">
            المساعد — البحث الشامل
          </Link>
          <Link to="/admin" className="btn-gold hidden !px-4 !py-2 text-xs md:inline-flex">
            <LayoutDashboard className="h-4 w-4" />
            لوحة التحكم
          </Link>
          <button
            className="rounded-lg border border-ink-600/70 p-2 text-cream lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-700/50 bg-ink-950/98 lg:hidden">
          <nav className="container-app flex flex-col gap-1 py-3" aria-label="قائمة الجوال">
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
                {l.label}
              </NavLink>
            ))}
            <div className="mt-2 flex gap-2 border-t border-ink-700/50 pt-3">
              <Link to="/assistant" className="btn-ghost flex-1 text-xs">
                المساعد — البحث الشامل
              </Link>
              <Link to="/admin" className="btn-gold flex-1 text-xs">
                <LayoutDashboard className="h-4 w-4" />
                لوحة التحكم
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}