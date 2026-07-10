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
    label: "Advising Sources",
    title: "Add Advising Source",
    description: "Upload a CS advising document, prepare its text, and index it for source-backed answers.",
  },
  {
    value: "search",
    label: "Indexed Evidence",
    title: "Verify Indexed Evidence",
    description: "Inspect the source evidence that will support student answers.",
  },
  {
    value: "ask",
    label: "Advisor Sandbox",
    title: "Test Grounded Answers",
    description: "Test student-style questions and review grounded answers before relying on them.",
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
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-md border border-[hsl(var(--line))] bg-[hsl(var(--paper))] sm:w-auto">
            {panels.map((panel) => (
              <TabsTrigger
                className="grow sm:grow-0"
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
              Indexed Evidence and Advisor Sandbox can use sources already indexed in the backend. Upload, prepare, and index a new source here when you need to add more evidence.
            </p>
          ) : null}
        </div>

        <TabsContent value="documents">
          <div className="space-y-4">
            <SectionHeader
              eyebrow="Advising sources"
              title="Add Advising Source"
              description="Upload a CS advising document, prepare its text, and index it for source-backed answers."
            />
            <InfoNote title="Processing order" tone="evidence">
              After upload, prepare the text and index the evidence. This workflow stays manual until the backend supports automatic processing.
            </InfoNote>
            <DocumentUploadForm onProgressChange={updateProgress} />
          </div>
        </TabsContent>

        <TabsContent value="search">
          <div className="space-y-4">
            <SectionHeader
              eyebrow="Indexed evidence"
              title="Verify Indexed Evidence"
              description="Search indexed advising sources to verify which evidence will support student answers."
            />
            <InfoNote title="Evidence retrieval" tone="evidence">
              Verify Evidence returns source passages only. Use Advisor Sandbox afterward to review a grounded answer.
            </InfoNote>
            <RagSearchPanel onSearchComplete={() => updateProgress({ searched: true })} />
          </div>
        </TabsContent>

        <TabsContent value="ask">
          <div className="space-y-4">
            <SectionHeader
              eyebrow="Advisor sandbox"
              title="Test Grounded Answers"
              description="Ask a sample advising question to review the answer, confidence, advisor note, and sources."
            />
            <InfoNote title="Grounded answers" tone="warning">
              Answers are generated only from retrieved source evidence. Official academic decisions still require advisor or registrar review.
            </InfoNote>
            <RagAskPanel onAskComplete={() => updateProgress({ asked: true })} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
