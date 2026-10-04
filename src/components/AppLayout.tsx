import { Outlet } from "react-router-dom";
import { TickerBar } from "./TickerBar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { OfflineBanner } from "./OfflineBanner";
import { MirrorFailover } from "./MirrorFailover";
import { WhatsAppButton, AssistantEntry } from "./FloatingButtons";

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <TickerBar />
      <OfflineBanner />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
      <AssistantEntry />
      {/* تحويل تلقائي إلى مرآة مجانية عاملة إذا توقف مزود الاستضافة الحالي */}
      <MirrorFailover />
    </div>
  );
}