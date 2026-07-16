import { StudentAnswerCard } from "@/components/student/StudentAnswerCard";
import type { StudentChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

type StudentChatThreadProps = {
  messages: StudentChatMessage[];
};

export function StudentChatThread({ messages }: StudentChatThreadProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <section aria-label="Conversation" aria-live="polite" className="flex flex-1 flex-col gap-6 pb-6" role="log">
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
        <article className="max-w-[92%] rounded-2xl rounded-br-md bg-[hsl(var(--ink-navy))] px-4 py-3 text-sm leading-6 text-white sm:max-w-[72%]">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </article>
      </div>
    );
  }

  if (message.answer) {
    return (
      <div className="flex justify-start">
        <div className="max-w-full sm:max-w-[90%]">
          <StudentAnswerCard answer={message.answer} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <article
        className={cn(
          "max-w-[92%] rounded-2xl rounded-bl-md border px-4 py-3 text-sm leading-6 sm:max-w-[72%]",
          message.error
            ? "border-[hsl(var(--verify-amber))] bg-[hsl(var(--verify-amber-tint))] text-[hsl(var(--ink-navy))]"
            : "border-[hsl(var(--line))] bg-[hsl(var(--paper))] text-[hsl(var(--slate))]"
        )}
      >
        <p className="text-xs font-semibold text-[hsl(var(--slate))]">uniAdvisor</p>
        <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
        {message.isLoading ? <p className="sr-only">Answer is loading</p> : null}
      </article>
    </div>
  );
}
