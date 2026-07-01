import { AppShell } from "@/components/layout/AppShell";
import { StudentAskPanel } from "@/components/student/StudentAskPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentPage() {
  return (
    <AppShell>
      <section className="space-y-5 overflow-hidden">
        <Card className="border-[hsl(var(--line))] bg-[hsl(var(--paper))] shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-[hsl(var(--evidence-teal-tint))] text-[hsl(var(--evidence-teal))]">
                Guidance-first
              </Badge>
              <Badge variant="outline">Source-backed</Badge>
              <Badge variant="outline">Advisor review</Badge>
            </div>
            <CardTitle className="font-serif text-2xl text-[hsl(var(--ink-navy))]">
              Ask about your CS requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-[hsl(var(--slate))]">
            <p>
              uniAdvisor answers only from uploaded Computer Science advising documents,
              then points you to the sources and the questions that still need an advisor.
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Badge className="shrink-0 bg-[hsl(var(--evidence-teal-tint))] text-[hsl(var(--evidence-teal))]">
                ✓ Explains what uploaded documents say
              </Badge>
              <Badge className="shrink-0 border-[hsl(var(--line))] bg-[hsl(var(--verify-amber-tint))] text-[hsl(var(--verify-amber))]">
                ✕ Not a degree audit or registration decision
              </Badge>
            </div>
          </CardContent>
        </Card>

        <StudentAskPanel />

        <p className="text-xs leading-5 text-[hsl(var(--slate))]">
          uniAdvisor summarizes uploaded advising documents. Confirm official graduation,
          registration, prerequisite, and degree-audit decisions with a human advisor.
        </p>
      </section>
    </AppShell>
  );
}
