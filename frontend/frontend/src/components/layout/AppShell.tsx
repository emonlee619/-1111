"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "@/lib/cn";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-page text-ink">
      <Topbar onMenuClick={() => setSidebarOpen((value) => !value)} />
      <div className="relative z-10 mx-auto w-full max-w-[1680px] px-3 pb-8 pt-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-[min(86vw,296px)] translate-x-[-100%] border-r border-line bg-card px-3 pt-4 shadow-card backdrop-blur-2xl transition-transform duration-200 sm:px-4 lg:hidden",
            sidebarOpen && "translate-x-0",
          )}
        >
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </div>
        {sidebarOpen ? (
          <button
            aria-label="关闭导航"
            className="fixed inset-0 z-30 bg-[#020815]/72 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}
        <main className="min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
