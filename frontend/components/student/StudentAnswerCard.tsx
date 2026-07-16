import { AdvisorReviewCallout } from "@/components/student/AdvisorReviewCallout";
import { StudentSourceCard } from "@/components/student/StudentSourceCard";
import { ConfidenceRibbon } from "@/components/shared/ConfidenceRibbon";
import { InfoNote } from "@/components/shared/InfoNote";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { StudentRagAskResponse } from "@/lib/types";

type StudentAnswerCardProps = {
  answer: StudentRagAskResponse;
};

export function StudentAnswerCard({ answer }: StudentAnswerCardProps) {
  const refusalMessage = answer.refusal_reason || answer.answer;
  const answerDisplay = getStudentFacingAnswerDisplay(answer.refused ? refusalMessage : answer.answer);
  const reviewReasons = getAdvisorReviewReasons(answer);
  const needsDisplayReview = answer.refused || !answerDisplay.hasStudentFacingAnswer;

  return (
    <article
      className={
        needsDisplayReview
          ? "flex flex-col gap-5 rounded-xl border border-[hsl(var(--verify-amber))]/45 bg-[hsl(var(--verify-amber-tint))] p-5"
          : "flex flex-col gap-5 rounded-xl border border-[hsl(var(--line))] border-l-[3px] border-l-[hsl(var(--evidence-teal))] bg-white p-5 surface-shadow"
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-[hsl(var(--evidence-teal))]">
              uniAdvisor
            </p>
            <h3 className="mt-1 font-serif text-xl font-semibold text-[hsl(var(--ink-navy))]">
              {getAnswerHeading(answer, answerDisplay.hasStudentFacingAnswer)}
            </h3>
            <p className="mt-1 text-sm leading-6 text-[hsl(var(--slate))]">{answer.question}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {needsDisplayReview ? (
              <Badge className="bg-[hsl(var(--verify-amber))] text-white">Needs advisor review</Badge>
            ) : null}
          </div>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
          {answerDisplay.text}
        </p>
      </div>

      <ConfidenceRibbon confidence={answer.confidence} confidenceScore={answer.confidence_score} />

      {answer.sources.length > 0 ? (
        <section className="flex flex-col gap-3" aria-label="Source evidence">
          <h4 className="font-serif text-lg font-semibold text-[hsl(var(--ink-navy))]">Source evidence</h4>
          <div className="grid gap-3">
            {answer.sources.map((source) => (
              <StudentSourceCard key={`${source.source_number}-${source.document_title}`} source={source} />
            ))}
          </div>
        </section>
      ) : null}

      {answer.advisor_note ? (
        <>
          <Separator />
          <InfoNote title="What to confirm with an advisor" tone="warning">
            {answer.advisor_note}
          </InfoNote>
        </>
      ) : null}

      {reviewReasons.length > 0 ? <AdvisorReviewCallout reasons={reviewReasons} /> : null}
    </article>
  );
}

function getAdvisorReviewReasons(answer: StudentRagAskResponse) {
  const reasons = new Set<string>();

  if (answer.refused) {
    reasons.add("This answer hit an academic boundary.");
  }
  if (!getStudentFacingAnswerDisplay(answer.refused ? answer.refusal_reason || answer.answer : answer.answer)
    .hasStudentFacingAnswer) {
    reasons.add("A student-facing answer was not available for this question.");
  }
  if (answer.advisor_note) {
    reasons.add("The response includes advisor guidance.");
  }
  if (answer.confidence === "low" || answer.confidence_score < 35) {
    reasons.add("The source match is low.");
  }
  if (isHighImpactQuestion(answer.question)) {
    reasons.add("This question may affect graduation, registration, or official requirements.");
  }

  return Array.from(reasons);
}

function isHighImpactQuestion(question: string) {
  return /graduat|register|registration|degree audit|eligible|eligibility|official|waive|substitut|transfer credit|clearance|approve/i.test(
    question
  );
}

type StudentFacingAnswerDisplay = {
  text: string;
  hasStudentFacingAnswer: boolean;
};

function getAnswerHeading(answer: StudentRagAskResponse, hasStudentFacingAnswer: boolean) {
  if (answer.refused) {
    return "uniAdvisor cannot determine that from documents alone";
  }
  if (!hasStudentFacingAnswer) {
    return "Student-facing answer unavailable";
  }
  return "Answer";
}

function getStudentFacingAnswerDisplay(answerText: string): StudentFacingAnswerDisplay {
  const cleaned = stripReasoningBlocks(answerText);

  if (cleaned) {
    return {
      text: cleaned,
      hasStudentFacingAnswer: true,
    };
  }

  return {
    text: "A student-facing answer was not available, so uniAdvisor is not showing a response. Try asking in a different way or confirm the question with your academic advisor.",
    hasStudentFacingAnswer: false,
  };
}

function stripReasoningBlocks(answerText: string) {
  let cleaned = answerText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const lower = cleaned.toLowerCase();
  const openReasoningTag = lower.indexOf("<think>");

  if (openReasoningTag >= 0) {
    const closeReasoningTag = lower.indexOf("</think>", openReasoningTag);
    cleaned =
      closeReasoningTag >= 0
        ? `${cleaned.slice(0, openReasoningTag)}${cleaned.slice(closeReasoningTag + "</think>".length)}`.trim()
        : cleaned.slice(0, openReasoningTag).trim();
  }

  return cleaned;
}
