import { Badge } from "@/components/ui/badge";

export function AppHeader() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Computer Science Advising RAG</p>
          <h1 className="text-2xl font-semibold tracking-normal">uniAdvisor Phase 1 Console</h1>
        </div>
        <Badge variant="secondary">Frontend Foundation</Badge>
      </div>
    </header>
  );
}
