import { AppShell } from "@/components/layout/AppShell";
import { DashboardTabs } from "@/components/layout/DashboardTabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <AppShell>
      <section className="space-y-5 overflow-hidden">
        <Card className="border-[hsl(var(--line))] bg-[hsl(var(--paper))] shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Badge className="shrink-0 bg-[hsl(var(--evidence-teal-tint))] text-[hsl(var(--evidence-teal))]">
                Document intelligence console
              </Badge>
              <Badge className="shrink-0" variant="outline">
                Pipeline manager
              </Badge>
              <Badge className="shrink-0" variant="outline">
                Evidence verification
              </Badge>
            </div>
            <CardTitle className="font-serif text-2xl text-[hsl(var(--ink-navy))]">
              Evidence-first advising support
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-[hsl(var(--slate))]">
            Staff can upload Computer Science advising documents, process them into
            searchable evidence, inspect retrieved source chunks, and generate grounded
            answers tied to citations before students use the system.
          </CardContent>
        </Card>

        <DashboardTabs />
      </section>
    </AppShell>
  );
}
