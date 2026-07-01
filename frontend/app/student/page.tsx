import { AppShell } from "@/components/layout/AppShell";
import { StudentAskPanel } from "@/components/student/StudentAskPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function StudentPage() {
  return (
    <AppShell>
      <section className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>What can uniAdvisor help you understand?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              Ask questions about uploaded Computer Science advising documents and
              review answers with source references. uniAdvisor explains what the
              documents say, where the information appears, and what to confirm
              with an advisor.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Student View</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>Guidance-first</Badge>
                <Badge variant="secondary">Source-backed</Badge>
                <Badge variant="outline">Advisor review</Badge>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Answers are based only on uploaded documents and are not official
                graduation, registration, or degree-audit decisions.
              </p>
            </CardContent>
          </Card>
        </div>

        <StudentAskPanel />
      </section>
    </AppShell>
  );
}
