"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const pathname = usePathname();
  const isStudent = pathname?.startsWith("/student");

  return (
    <header className="border-b border-[hsl(var(--line))] bg-[hsl(var(--ink-navy))] text-primary-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-medium text-primary-foreground/75">
            {isStudent ? "Virtual CS Advisor" : "Computer Science Advising"}
          </p>
          <h1 className="font-serif text-2xl font-semibold tracking-normal">uniAdvisor</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            aria-current={!isStudent ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:bg-white/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
              !isStudent && "bg-white text-[hsl(var(--ink-navy))] shadow-sm hover:bg-white hover:text-[hsl(var(--ink-navy))]"
            )}
            href="/"
          >
            Advisor Console
          </Link>
          <Link
            aria-current={isStudent ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:bg-white/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
              isStudent && "bg-white text-[hsl(var(--ink-navy))] shadow-sm hover:bg-white hover:text-[hsl(var(--ink-navy))]"
            )}
            href="/student"
          >
            Student View
          </Link>
          {!isStudent ? (
            <Badge className="border-white/20 bg-white/10 text-primary-foreground" variant="outline">
              EVIDENCE-FIRST · BETA
            </Badge>
          ) : null}
        </div>
      </div>
    </header>
  );
}
