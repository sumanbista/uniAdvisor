"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function AppHeader() {
  const pathname = usePathname();
  const isStudent = pathname?.startsWith("/student");

  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--line))] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          className="flex min-h-16 items-center font-serif text-xl font-bold tracking-tight text-[hsl(var(--ink-navy))] focus-visible:rounded-md"
          href="/"
        >
          uniAdvisor
        </Link>
        <nav aria-label="Primary navigation" className="flex min-h-16 items-stretch">
          <NavLink active={!isStudent} href="/">
            Advisor Console
          </NavLink>
          <NavLink active={isStudent} href="/student">
            Student View
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ active, children, href }: { active: boolean; children: React.ReactNode; href: string }) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-16 items-center px-3 text-sm font-semibold text-[hsl(var(--slate))] transition-colors hover:text-[hsl(var(--ink-navy))] sm:px-5",
        active && "text-[hsl(var(--focus-blue))] after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-[hsl(var(--focus-blue))]"
      )}
      href={href}
    >
      {children}
    </Link>
  );
}
