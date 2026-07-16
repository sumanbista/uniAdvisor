"use client";

import { FormEvent, useRef, useState } from "react";

import { StudentChatThread } from "@/components/student/StudentChatThread";
import { StudentPromptStarters } from "@/components/student/StudentPromptStarters";
import { Button } from "@/components/ui/button";
import { askRag } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  ApiError,
  RagAnswerSource,
  RagAskResponse,
  StudentChatMessage,
  StudentRagAnswerSource,
  StudentRagAskResponse,
} from "@/lib/types";

const DEFAULT_TOP_K = 5;

const promptGroups = [
  {
    title: "Degree Planning",
    prompts: [
      "What courses do I need for the CS major?",
      "What should I take in my first year?",
      "Which electives count toward the major?",
    ],
  },
  {
    title: "Prerequisites",
    prompts: [
      "What math courses are required?",
      "What do I need before taking upper-level CS courses?",
      "What should I complete before the AI track?",
    ],
  },
  {
    title: "Policies",
    prompts: [
      "Where are graduation requirements listed?",
      "What requirements should I confirm with my advisor?",
      "What does the catalog say about major requirements?",
    ],
  },
];

const LOADING_MESSAGE = "Checking the available advising sources…";
const FALLBACK_ERROR_MESSAGE = "I could not reach the advising backend right now. Please try again in a moment.";

export function StudentAskPanel() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<StudentChatMessage[]>([]);
  const [hasSelectedStarter, setHasSelectedStarter] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  function handleStarterSelect(prompt: string) {
    setQuestion(prompt);
    setHasSelectedStarter(true);
    setComposerError(null);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    setComposerError(null);

    if (!trimmedQuestion) {
      setComposerError("Enter a question before asking.");
      return;
    }

    const studentMessage: StudentChatMessage = {
      id: createMessageId(),
      role: "student",
      content: trimmedQuestion,
      createdAt: new Date().toISOString(),
    };
    const loadingMessage: StudentChatMessage = {
      id: createMessageId(),
      role: "assistant",
      content: LOADING_MESSAGE,
      createdAt: new Date().toISOString(),
      isLoading: true,
    };

    setMessages((current) => [...current, studentMessage, loadingMessage]);
    setQuestion("");
    setIsAsking(true);

    try {
      const response = await askRag({
        question: trimmedQuestion,
        filters: {
          department: "Computer Science",
          program: "Computer Science",
        },
        top_k: DEFAULT_TOP_K,
      });
      const safeAnswer = stripTechnicalSourceIds(response);

      setMessages((current) =>
        current.map((message) =>
          message.id === loadingMessage.id
            ? {
                ...message,
                content: safeAnswer.refused
                  ? safeAnswer.refusal_reason || safeAnswer.answer
                  : safeAnswer.answer,
                answer: safeAnswer,
                isLoading: false,
              }
            : message
        )
      );
    } catch (caught) {
      const apiError = caught as Partial<ApiError>;
      const message = apiError.message || FALLBACK_ERROR_MESSAGE;

      setMessages((current) =>
        current.map((existing) =>
          existing.id === loadingMessage.id
            ? {
                ...existing,
                content: message,
                error: message,
                isLoading: false,
              }
            : existing
        )
      );
    } finally {
      setIsAsking(false);
    }
  }

  const hasStarted = hasSelectedStarter || messages.length > 0;

  return (
    <section
      aria-label={hasStarted ? "Student advising conversation" : undefined}
      aria-labelledby={hasStarted ? undefined : "student-advisor-title"}
      className={cn(
        "mx-auto transition-[max-width,padding] duration-300",
        hasStarted ? "flex min-h-[calc(100vh-8rem)] max-w-4xl flex-col" : "max-w-3xl py-5 sm:py-9"
      )}
    >
      {hasStarted ? null : (
        <header className="text-center">
          <h1
            className="font-serif text-3xl font-semibold leading-tight tracking-tight text-[hsl(var(--ink-navy))] sm:text-4xl"
            id="student-advisor-title"
          >
            How can I help with your CS planning?
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[hsl(var(--slate))] sm:text-base">
            Ask about requirements, prerequisites, electives, or policies. Answers use the advising sources available to uniAdvisor and show supporting evidence when it is found.
          </p>
        </header>
      )}

      <div className={cn(hasStarted ? "student-chat-enter flex flex-1 flex-col pt-2" : "mt-6 sm:mt-8")}>
        {hasStarted ? <StudentChatThread messages={messages} /> : null}
        <form
          aria-busy={isAsking}
          className={cn(
            hasStarted
              ? "sticky bottom-0 z-10 -mx-4 mt-auto border-t border-[hsl(var(--line))] bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6"
              : "mx-auto w-full"
          )}
          onSubmit={handleAsk}
        >
          <div className="mx-auto flex max-w-4xl flex-col gap-2">
            <label className="sr-only" htmlFor="student-question">
              Ask an advising question
            </label>
            <div className="rounded-xl border border-[hsl(var(--input))] bg-white p-2 surface-shadow focus-within:border-[hsl(var(--focus-blue))] focus-within:ring-2 focus-within:ring-[hsl(var(--focus-blue))]/20 sm:flex sm:items-end sm:gap-2">
              <textarea
                className="max-h-44 min-h-20 w-full resize-y border-0 bg-transparent px-3 py-2 text-sm leading-6 text-foreground outline-none placeholder:text-[hsl(var(--slate))]/75 focus-visible:outline-none"
                disabled={isAsking}
                id="student-question"
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask about requirements, prerequisites, electives, or policies"
                ref={composerRef}
                required
                value={question}
              />
              <Button className="min-h-11 w-full shrink-0 px-5 sm:w-auto" disabled={isAsking} type="submit">
                {isAsking ? "Checking sources…" : "Ask uniAdvisor"}
              </Button>
            </div>
            <div aria-live="polite">
              {composerError ? <p className="text-sm font-medium text-destructive">{composerError}</p> : null}
            </div>
            {hasStarted ? (
              <p className="text-center text-xs leading-5 text-[hsl(var(--slate))]">Each question is sent separately. uniAdvisor does not use earlier messages as memory.</p>
            ) : null}
          </div>
        </form>

        {hasStarted ? null : (
          <>
            <StudentPromptStarters groups={promptGroups} onSelect={handleStarterSelect} />
            <footer className="mt-7 flex flex-col gap-2 text-center text-xs leading-5 text-[hsl(var(--slate))]">
              <p>Use uniAdvisor as a starting point. Confirm graduation, registration, degree audit, and other official decisions with your academic advisor or registrar.</p>
              <p>Each question is sent separately. uniAdvisor does not use earlier messages as memory.</p>
            </footer>
          </>
        )}
      </div>
    </section>
  );
}

function stripTechnicalSourceIds(response: RagAskResponse): StudentRagAskResponse {
  return {
    ...response,
    sources: response.sources.map(stripSourceTechnicalIds),
  };
}

function stripSourceTechnicalIds(source: RagAnswerSource): StudentRagAnswerSource {
  const safeSource: Partial<RagAnswerSource> = { ...source };
  delete safeSource.chunk_id;
  delete safeSource.document_id;
  return safeSource as StudentRagAnswerSource;
}

function createMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
