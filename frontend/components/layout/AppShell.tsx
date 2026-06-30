import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/AppHeader";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6">{children}</main>
    </div>
  );
}
