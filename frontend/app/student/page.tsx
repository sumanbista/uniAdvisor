import { AppShell } from "@/components/layout/AppShell";
import { StudentAskPanel } from "@/components/student/StudentAskPanel";

export default function StudentPage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-4xl space-y-5">
        <div className="space-y-3 py-2">
          <p className="text-sm font-medium text-[hsl(var(--evidence-teal))]">Virtual CS Advisor</p>
          <h2 className="font-serif text-3xl font-semibold leading-tight text-[hsl(var(--ink-navy))] sm:text-4xl">
            What are we planning today?
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[hsl(var(--slate))] sm:text-base">
            Ask about CS requirements, prerequisites, policies, or planning questions.
            Answers are based on uploaded advising documents and include source evidence when available.
          </p>
        </div>
        <StudentAskPanel />
        <p className="pb-24 text-xs leading-5 text-[hsl(var(--slate))] sm:pb-6">
          uniAdvisor summarizes uploaded advising documents. Confirm official graduation,
          registration, and degree audit decisions with your human advisor or registrar.
        </p>
      </section>
    </AppShell>
  );
}
