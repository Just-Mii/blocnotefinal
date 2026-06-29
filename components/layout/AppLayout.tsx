"use client";

import Sidebar from "@/components/layout/Sidebar";
import SearchModal from "@/components/search/SearchModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto min-w-0">{children}</main>
      {/* Global Ctrl+P search — mounted once here so it works on every page */}
      <SearchModal />
    </div>
  );
}
