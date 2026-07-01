"use client";

import { useState } from "react";

import { DocumentUploadForm } from "@/components/documents/DocumentUploadForm";
import { WorkflowStrip, type WorkflowProgress } from "@/components/layout/WorkflowStrip";
import { RagAskPanel } from "@/components/rag/RagAskPanel";
import { RagSearchPanel } from "@/components/rag/RagSearchPanel";
import { InfoNote } from "@/components/shared/InfoNote";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const panels = [
  {
    value: "documents",
    label: "Documents",
    title: "Document processing",
    description: "Upload and process academic documents.",
  },
  {
    value: "search",
    label: "Search",
    title: "RAG Search",
    description: "Search indexed document chunks.",
  },
  {
    value: "ask",
    label: "Ask",
    title: "Grounded Answers",
    description: "Ask grounded advising questions.",
  },
];

export function DashboardTabs() {
  const [activeTab, setActiveTab] = useState("documents");
  const [progress, setProgress] = useState<WorkflowProgress>({
    uploaded: false,
    extracted: false,
    chunked: false,
    searched: false,
    asked: false,
  });

  function updateProgress(nextProgress: Partial<WorkflowProgress>) {
    setProgress((current) => ({ ...current, ...nextProgress }));
  }

  function handleTabChange(nextTab: string) {
    setActiveTab(nextTab);
  }

  return (
    <div className="space-y-5">
      <WorkflowStrip progress={progress} />

      <Tabs className="w-full" onValueChange={handleTabChange} value={activeTab}>
        <div className="space-y-3">
          <TabsList className="w-full justify-start overflow-x-auto rounded-md border border-[hsl(var(--line))] bg-[hsl(var(--paper))] sm:w-auto">
            {panels.map((panel) => (
              <TabsTrigger
                key={panel.value}
                title={panel.description}
                value={panel.value}
              >
                {panel.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {!progress.chunked ? (
            <p className="text-sm leading-6 text-[hsl(var(--slate))]">
              Search and Ask can use documents already indexed in the backend. Upload, extract, and chunk a new document here when you need to add more evidence.
            </p>
          ) : null}
        </div>

        <TabsContent value="documents">
          <div className="space-y-4">
            <SectionHeader
              eyebrow="Pipeline manager"
              title="Document processing"
              description="Upload, extract, and chunk one academic document at a time before searching or asking questions."
            />
            <InfoNote title="Processing order" tone="evidence">
              After upload, run extraction and chunking. Chunking prepares a document for search and grounded answers.
            </InfoNote>
            <DocumentUploadForm onProgressChange={updateProgress} />
          </div>
        </TabsContent>

        <TabsContent value="search">
          <div className="space-y-4">
            <SectionHeader
              eyebrow="Evidence retrieval"
              title="RAG search"
              description="Search indexed document chunks and inspect sources before generating an answer."
            />
            <InfoNote title="Evidence retrieval" tone="evidence">
              Search retrieves source chunks only. Use the Ask tab afterward to generate a grounded answer.
            </InfoNote>
            <RagSearchPanel onSearchComplete={() => updateProgress({ searched: true })} />
          </div>
        </TabsContent>

        <TabsContent value="ask">
          <div className="space-y-4">
            <SectionHeader
              eyebrow="Answer verification"
              title="Grounded answers"
              description="Ask one grounded advising question and inspect the answer, safety state, advisor note, and source references."
            />
            <InfoNote title="Grounded answers" tone="warning">
              Answers are generated only from retrieved document chunks. Official academic decisions still require advisor or registrar review.
            </InfoNote>
            <RagAskPanel onAskComplete={() => updateProgress({ asked: true })} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
