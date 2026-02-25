"use client";

import { Sidebar } from "@/components/sidebar/sidebar";
import { RightSidebar } from "@/components/sidebar/right-sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-white dark:bg-zinc-900">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>

      <RightSidebar />
    </div>
  );
}
