import { AppShell } from "@/components/layout/AppShell";
import { StudentAskPanel } from "@/components/student/StudentAskPanel";

export default function StudentPage() {
  return (
    <AppShell>
      <section aria-labelledby="student-advisor-title" className="mx-auto max-w-4xl">
        <div className="border-b border-[hsl(var(--line))] pb-7 text-center sm:pb-9">
          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-[hsl(var(--ink-navy))] sm:text-4xl" id="student-advisor-title">
            How can I help with your CS planning?
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[hsl(var(--slate))] sm:text-base">
            Ask about requirements, prerequisites, electives, or policies. Answers use the advising sources available to uniAdvisor and show supporting evidence when it is found.
          </p>
        </div>
        <StudentAskPanel />
        <p className="mx-auto max-w-3xl pb-24 pt-6 text-center text-xs leading-5 text-[hsl(var(--slate))] sm:pb-8">
          Use uniAdvisor as a starting point. Confirm graduation, registration, degree audit, and other official decisions with your academic advisor or registrar.
        </p>
      </section>
    </AppShell>
  );
}
