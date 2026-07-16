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
  },
  {
    value: "search",
    label: "Indexed Evidence",
  },
  {
    value: "ask",
    label: "Advisor Sandbox",
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

  function updateProgress(nextProgress: Partial<WorkflowProgress>) {
    setProgress((current) => ({ ...current, ...nextProgress }));
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8">
      <WorkflowStrip progress={progress} />
      <Tabs className="min-w-0" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-lg border border-[hsl(var(--line))] bg-white p-1">
          {panels.map((panel, index) => (
            <TabsTrigger
              className="min-h-11 min-w-0 gap-1 rounded-md px-1 text-xs data-[state=active]:bg-[hsl(var(--secondary))] data-[state=active]:text-[hsl(var(--focus-blue))] data-[state=active]:shadow-none sm:gap-2 sm:px-3 sm:text-sm"
              key={panel.value}
              value={panel.value}
            >
              <span aria-hidden="true" className="hidden font-mono text-xs sm:inline">{index + 1}</span>
              {panel.label}
            </TabsTrigger>
          ))}
        </TabsList>

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
