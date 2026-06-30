import { DocumentUploadForm } from "@/components/documents/DocumentUploadForm";
import { RagAskPanel } from "@/components/rag/RagAskPanel";
import { RagSearchPanel } from "@/components/rag/RagSearchPanel";
import { SectionHeader } from "@/components/shared/SectionHeader";
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
      <TabsList className="w-full justify-start sm:w-auto">
        {panels.map((panel) => (
          <TabsTrigger key={panel.value} value={panel.value}>
            {panel.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="documents">
        <div className="space-y-4">
          <SectionHeader
            eyebrow="Pipeline manager"
            title="Document Processing"
            description="Upload, extract, and chunk one academic document at a time before searching or asking questions."
          />
          <DocumentUploadForm />
        </div>
      </TabsContent>

      <TabsContent value="search">
        <div className="space-y-4">
          <SectionHeader
            eyebrow="Evidence retrieval"
            title="RAG Search"
            description="Search indexed document chunks and inspect the sources before generating an answer."
          />
          <RagSearchPanel />
        </div>
      </TabsContent>

      <TabsContent value="ask">
        <div className="space-y-4">
          <SectionHeader
            eyebrow="Answer verification"
            title="Grounded Answers"
            description="Ask one grounded advising question and inspect the answer, safety state, advisor note, and source references."
          />
          <RagAskPanel />
        </div>
      </TabsContent>
    </Tabs>
  );
}
