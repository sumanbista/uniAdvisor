import { AppShell } from "@/components/layout/AppShell";
import { DashboardTabs } from "@/components/layout/DashboardTabs";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <AppShell>
      <section className="space-y-4 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[hsl(var(--line))] pb-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Badge className="shrink-0 bg-[hsl(var(--evidence-teal-tint))] text-[hsl(var(--evidence-teal))]">
              Knowledge base
            </Badge>
            <Badge className="shrink-0" variant="outline">
              Advising sources
            </Badge>
            <Badge className="shrink-0" variant="outline">
              Grounded answers
            </Badge>
          </div>
          <div className="max-w-3xl">
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[hsl(var(--ink-navy))]">
              Knowledge Base
            </h2>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--slate))]">
              Process Computer Science advising documents into searchable evidence for grounded student answers.
            </p>
          </div>
        </div>

        <DashboardTabs />
      </section>
    </AppShell>
  );
}
