import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white">
      <AppSidebar />
      <main className="lg:pl-60">
        <div className="min-h-screen pb-20 lg:pb-0">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
