import { Component, Suspense, lazy, useEffect, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useLang } from "./lib/i18n";
import { Analytics } from "@vercel/analytics/react";
import { AppLayout } from "./components/AppLayout";
import { LogoMark } from "./components/Logo";
import { useExternalLinkGuard } from "./lib/utils";
import { initNativeShell } from "./lib/native";
import { markAppReady, reportFatal } from "./lib/autoRecovery";

const Landing = lazy(() => import("./pages/Landing").then((m) => ({ default: m.Landing })));
const JobsPage = lazy(() => import("./pages/JobsPage").then((m) => ({ default: m.JobsPage })));
const RealEstatePage = lazy(() =>
  import("./pages/RealEstatePage").then((m) => ({ default: m.RealEstatePage }))
);
const EMarketPage = lazy(() => import("./pages/EMarketPage").then((m) => ({ default: m.EMarketPage })));
const SoftwarePage = lazy(() =>
  import("./pages/SoftwarePage").then((m) => ({ default: m.SoftwarePage }))
);
const OffersPage = lazy(() => import("./pages/OffersPage").then((m) => ({ default: m.OffersPage })));
const ChannelsPage = lazy(() =>
  import("./pages/ChannelsPage").then((m) => ({ default: m.ChannelsPage }))
);
const AssistantPage = lazy(() =>
  import("./pages/AssistantPage").then((m) => ({ default: m.AssistantPage }))
);
const PrivacyPolicyPage = lazy(() =>
  import("./pages/PrivacyPolicyPage").then((m) => ({ default: m.PrivacyPolicyPage }))
);
const AuthPage = lazy(() => import("./pages/AuthPage").then((m) => ({ default: m.AuthPage })));
const AdminPage = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <LogoMark className="h-14 w-14 animate-pulse" />
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />
    </div>
  );
}

class ErrorBoundaryInner extends Component<{ children: ReactNode; t: (k: string) => string }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    reportFatal(error, "interface");
  }

  render() {
    if (this.state.hasError) {
      const t = this.props.t;
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-xl font-black text-cream">{t("unexpectedError")}</h1>
          <p className="max-w-md text-sm text-ink-300">{t("autoRestart")}</p>
          <div className="flex gap-3">
            <button onClick={() => window.location.reload()} className="btn-gold">
              {t("restartPlatform")}
            </button>
            <Link to="/" className="btn-ghost" onClick={() => this.setState({ hasError: false })}>
              {t("backToHome")}
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useLang();
  return <ErrorBoundaryInner t={t}>{children}</ErrorBoundaryInner>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

function ExternalLinkGuard() {
  useExternalLinkGuard();
  return null;
}

function NativeShell() {
  const navigate = useNavigate();
  useEffect(() => {
    initNativeShell({ navigate }).catch(() => {});
  }, [navigate]);
  return null;
}

// GitHub Pages serves this repo under /ViPYemen-/ (base set in the Pages
// workflow build), while the main site is hosted at the domain root. Vite's
// BASE_URL reflects the build base, so routing adapts automatically to both.
const ROUTER_BASENAME =
  import.meta.env.BASE_URL && import.meta.env.BASE_URL !== "/"
    ? import.meta.env.BASE_URL.replace(/\/$/, "")
    : "/";

export default function App() {
  // The React tree mounted and painted — disarm the boot watchdog.
  useEffect(() => {
    markAppReady();
  }, []);

  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <ErrorBoundary>
        <ScrollToTop />
        <ExternalLinkGuard />
        <NativeShell />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/real-estate" element={<RealEstatePage />} />
              <Route path="/emarket" element={<EMarketPage />} />
              <Route path="/software" element={<SoftwarePage />} />
              <Route path="/offers" element={<OffersPage />} />
              <Route path="/channels" element={<ChannelsPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
        <Analytics />
      </ErrorBoundary>
    </BrowserRouter>
  );
}