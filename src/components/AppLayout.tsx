import { Outlet } from "react-router-dom";
import { TickerBar } from "./TickerBar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { OfflineBanner } from "./OfflineBanner";
import { UpdateNotice } from "./UpdateNotice";
import { WhatsAppButton, AssistantEntry } from "./FloatingButtons";

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <TickerBar />
      <OfflineBanner />
      <UpdateNotice />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
      <AssistantEntry />
    </div>
  );
}