import { DocumentUploadForm } from "@/components/documents/DocumentUploadForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const panels = [
  {
    value: "documents",
    label: "Documents",
    title: "Document Processing",
    description: "Upload and process academic documents. Coming in Spec 008.",
  },
  {
    value: "search",
    label: "Search",
    title: "RAG Search",
    description: "Search indexed document chunks. Coming in Spec 009.",
  },
  {
    value: "ask",
    label: "Ask",
    title: "Grounded Answers",
    description: "Ask grounded advising questions. Coming in Spec 010.",
  },
];

export function DashboardTabs() {
  return (
    <Tabs defaultValue="documents" className="w-full">
      <TabsList>
        {panels.map((panel) => (
          <TabsTrigger key={panel.value} value={panel.value}>
            {panel.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="documents">
        <Card>
          <CardHeader>
            <CardTitle>Document Processing</CardTitle>
            <CardDescription>Upload, extract, and chunk one academic document at a time.</CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentUploadForm />
          </CardContent>
        </Card>
      </TabsContent>

      {panels.slice(1).map((panel) => (
        <TabsContent key={panel.value} value={panel.value}>
          <Card>
            <CardHeader>
              <CardTitle>{panel.title}</CardTitle>
              <CardDescription>Phase 1 placeholder panel</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState title={panel.label} description={panel.description} />
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
