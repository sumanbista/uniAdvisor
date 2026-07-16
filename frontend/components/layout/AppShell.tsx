import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/AppHeader";

type AppShellProps = {
  children: ReactNode;
  wide?: boolean;
};

export function AppShell({ children, wide = false }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <a
        className="sr-only rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
        href="#main-content"
      >
        Skip to main content
      </a>
      <AppHeader />
      <main
        className={wide ? "mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8" : "mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:py-10"}
        id="main-content"
      >
        {children}
      </main>
    </div>
  );
}
