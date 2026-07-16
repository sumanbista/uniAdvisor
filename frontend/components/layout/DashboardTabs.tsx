"use client";

import { useState } from "react";

import { DocumentUploadForm } from "@/components/documents/DocumentUploadForm";
import { WorkflowStrip, type WorkflowProgress } from "@/components/layout/WorkflowStrip";
import { RagAskPanel } from "@/components/rag/RagAskPanel";
import { RagSearchPanel } from "@/components/rag/RagSearchPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const panels = [
  {
    value: "documents",
    label: "Advising Sources",
    title: "Add advising sources",
    description: "Upload and prepare the official materials that should support advising answers.",
  },
  {
    value: "search",
    label: "Indexed Evidence",
    title: "Verify indexed evidence",
    description: "Search the knowledge base and review the exact passages available to uniAdvisor.",
  },
  {
    value: "ask",
    label: "Advisor Sandbox",
    title: "Test student-style questions",
    description: "Review answers, confidence, guidance, and source evidence before students rely on them.",
  },
] as const;

export function DashboardTabs() {
  const [activeTab, setActiveTab] = useState("documents");
  const [progress, setProgress] = useState<WorkflowProgress>({
    uploaded: false,
    extracted: false,
    chunked: false,
    searched: false,
    asked: false,
  });

  const activePanel = panels.find((panel) => panel.value === activeTab) ?? panels[0];

  function updateProgress(nextProgress: Partial<WorkflowProgress>) {
    setProgress((current) => ({ ...current, ...nextProgress }));
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8">
      <WorkflowStrip progress={progress} />
      <Tabs className="min-w-0" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1 rounded-lg border border-[hsl(var(--line))] bg-white p-1 sm:grid-cols-3">
          {panels.map((panel, index) => (
            <TabsTrigger
              className="min-h-11 gap-2 rounded-md px-3 text-sm data-[state=active]:bg-[hsl(var(--secondary))] data-[state=active]:text-[hsl(var(--focus-blue))] data-[state=active]:shadow-none"
              key={panel.value}
              value={panel.value}
            >
              <span aria-hidden="true" className="font-mono text-xs">{index + 1}</span>
              {panel.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6 flex flex-col gap-1">
          <h2 className="font-serif text-2xl font-semibold text-[hsl(var(--ink-navy))]">{activePanel.title}</h2>
          <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--slate))]">{activePanel.description}</p>
        </div>

        <TabsContent className="mt-5" value="documents">
          <DocumentUploadForm onProgressChange={updateProgress} />
        </TabsContent>
        <TabsContent className="mt-5" value="search">
          <RagSearchPanel onSearchComplete={() => updateProgress({ searched: true })} />
        </TabsContent>
        <TabsContent className="mt-5" value="ask">
          <RagAskPanel onAskComplete={() => updateProgress({ asked: true })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
