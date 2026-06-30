import { AppShell } from "@/components/layout/AppShell";
import { DashboardTabs } from "@/components/layout/DashboardTabs";
import { WorkflowStrip } from "@/components/layout/WorkflowStrip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <AppShell>
      <section className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Evidence-first advising support</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              uniAdvisor Phase 1 helps students and advisors inspect uploaded
              Computer Science documents, retrieve source evidence, and generate
              answers that stay tied to citations.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Phase 1 Console</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>Foundation</Badge>
                <Badge variant="secondary">Documents UI</Badge>
                <Badge variant="outline">Search UI</Badge>
                <Badge variant="outline">Ask UI</Badge>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">
                App shell, document processing, RAG search inspection, grounded
                ask UI, API wiring, and shared types are in place.
              </p>
            </CardContent>
          </Card>
        </div>

        <WorkflowStrip />

        <DashboardTabs />
      </section>
    </AppShell>
  );
}
