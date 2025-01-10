"use client";

import Sidebar from "@/components/dashboard/sidebar";
import ClientProviders from "@/components/globals/client-providers";
import dynamic from "next/dynamic";

const NetworkStateBanner = dynamic(
  () => import("@/components/providers/network-state-banner"),
  { ssr: false },
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      <div className="mx-auto flex h-[100dvh] w-full flex-col">
        <NetworkStateBanner />
        <div className="flex h-full max-h-full gap-4 overflow-hidden">
          <Sidebar />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </ClientProviders>
  );
}
