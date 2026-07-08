import { StudentAnswerCard } from "@/components/student/StudentAnswerCard";
import type { StudentChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

type StudentChatThreadProps = {
  messages: StudentChatMessage[];
};

export function StudentChatThread({ messages }: StudentChatThreadProps) {
  if (messages.length === 0) {
    return (
      <section
        className="rounded-lg border border-dashed border-[hsl(var(--line))] bg-white/60 p-5 text-sm leading-6 text-[hsl(var(--slate))]"
        aria-label="Conversation"
      >
        Choose a prompt starter or ask your own advising question. The answer will appear here with
        confidence, advisor guidance, and source evidence.
      </section>
    );
  }

  return (
    <section className="space-y-5" aria-label="Conversation" role="log">
      {messages.map((message) => (
        <ChatMessageBubble key={message.id} message={message} />
      ))}
    </section>
  );
}

type ChatMessageBubbleProps = {
  message: StudentChatMessage;
};

function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  if (message.role === "student") {
    return (
      <div className="flex justify-end">
        <article className="max-w-[88%] rounded-lg bg-[hsl(var(--ink-navy))] px-4 py-3 text-sm leading-6 text-white shadow-sm sm:max-w-[72%]">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </article>
      </div>
    );
  }

  if (message.answer) {
    return (
      <div className="flex justify-start">
        <div className="max-w-full sm:max-w-[86%]">
          <StudentAnswerCard answer={message.answer} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <article
        className={cn(
          "max-w-[88%] rounded-lg border px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[72%]",
          message.error
            ? "border-[hsl(var(--verify-amber))] bg-[hsl(var(--verify-amber-tint))] text-[hsl(var(--ink-navy))]"
            : "border-[hsl(var(--line))] bg-[hsl(var(--paper))] text-[hsl(var(--slate))]"
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-normal text-[hsl(var(--slate))]">uniAdvisor</p>
        <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
        {message.isLoading ? (
          <div className="mt-3 flex gap-1" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--evidence-teal))]" />
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--evidence-teal))]/70" />
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--evidence-teal))]/40" />
          </div>
        ) : null}
      </article>
    </div>
  );
}
