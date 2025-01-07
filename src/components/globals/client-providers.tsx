"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MetadataProvider } from "../providers/metadata-provider";
import { useState } from "react";
import { DashboardTitleProvider } from "../providers/dashboard-title-provider";

interface ClientProvidersProps {
  children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MetadataProvider>
        <DashboardTitleProvider />
        {children}
      </MetadataProvider>
    </QueryClientProvider>
  );
}
