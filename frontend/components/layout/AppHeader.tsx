import Link from "next/link";

import { Badge } from "@/components/ui/badge";

export function AppHeader() {
  return (
    <header className="border-b border-primary/20 bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-medium text-primary-foreground/75">Computer Science Advising RAG</p>
          <h1 className="text-2xl font-semibold tracking-normal">uniAdvisor Phase 1 Console</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="rounded-md px-3 py-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:bg-white/10 hover:text-primary-foreground"
            href="/"
          >
            Advisor Console
          </Link>
          <Link
            className="rounded-md px-3 py-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:bg-white/10 hover:text-primary-foreground"
            href="/student"
          >
            Student View
          </Link>
          <Badge className="border-white/20 bg-white/10 text-primary-foreground" variant="outline">
            Evidence-first beta
          </Badge>
        </div>
      </div>
    </header>
  );
}
