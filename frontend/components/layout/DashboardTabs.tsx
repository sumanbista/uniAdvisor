import { DocumentUploadForm } from "@/components/documents/DocumentUploadForm";
import { RagAskPanel } from "@/components/rag/RagAskPanel";
import { RagSearchPanel } from "@/components/rag/RagSearchPanel";
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

      <TabsContent value="search">
        <Card>
          <CardHeader>
            <CardTitle>RAG Search</CardTitle>
            <CardDescription>Search indexed document chunks and inspect retrieved evidence.</CardDescription>
          </CardHeader>
          <CardContent>
            <RagSearchPanel />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ask">
        <Card>
          <CardHeader>
            <CardTitle>Grounded Answers</CardTitle>
            <CardDescription>Ask one grounded advising question and inspect source references.</CardDescription>
          </CardHeader>
          <CardContent>
            <RagAskPanel />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
