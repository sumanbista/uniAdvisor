import { AppShell } from "@/components/layout/AppShell";
import { DashboardTabs } from "@/components/layout/DashboardTabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <AppShell>
      <section className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Project Description</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              uniAdvisor Phase 1 is a focused advising RAG foundation for uploaded
              Computer Science academic documents. The frontend shell prepares the
              demo surface for document processing, retrieval, and grounded answers.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Phase 1 Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>Foundation</Badge>
                <Badge variant="secondary">Documents UI</Badge>
                <Badge variant="outline">Search UI</Badge>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">
                App shell, document processing UI, RAG search inspection, API
                wiring, and shared types are in place.
              </p>
            </CardContent>
          </Card>
        </div>

        <DashboardTabs />
      </section>
    </AppShell>
  );
}
