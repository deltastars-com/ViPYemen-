import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { Landing } from "./pages/Landing";
import { JobsPage } from "./pages/JobsPage";
import { RealEstatePage } from "./pages/RealEstatePage";
import { EMarketPage } from "./pages/EMarketPage";
import { SoftwarePage } from "./pages/SoftwarePage";
import { OffersPage } from "./pages/OffersPage";
import { AssistantPage } from "./pages/AssistantPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { ReleasesPage } from "./pages/ReleasesPage";
import { AuthPage } from "./pages/AuthPage";
import { AdminPage } from "./pages/AdminPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/real-estate" element={<RealEstatePage />} />
          <Route path="/emarket" element={<EMarketPage />} />
          <Route path="/software" element={<SoftwarePage />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/releases" element={<ReleasesPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}