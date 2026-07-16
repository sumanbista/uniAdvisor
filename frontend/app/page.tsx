import { AppShell } from "@/components/layout/AppShell";
import { DashboardTabs } from "@/components/layout/DashboardTabs";

export default function Home() {
  return (
    <AppShell wide>
      <section aria-labelledby="knowledge-base-title">
        <div className="mb-7 border-b border-[hsl(var(--line))] pb-6 text-center">
          <h1
            className="font-serif text-3xl font-semibold tracking-tight text-[hsl(var(--ink-navy))] sm:text-4xl"
            id="knowledge-base-title"
          >
            Knowledge Base
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--slate))] sm:text-base">
            Add, prepare, and verify the official advising sources uniAdvisor uses for student answers.
          </p>
        </div>
        <DashboardTabs />
      </section>
    </AppShell>
  );
}
