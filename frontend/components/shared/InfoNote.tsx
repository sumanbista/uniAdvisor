import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type InfoNoteProps = {
  title: string;
  children: string;
  tone?: "info" | "success" | "warning" | "evidence";
};

const toneStyles = {
  info: "border-primary/20 bg-white/70 text-foreground",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  evidence: "border-[hsl(var(--evidence-teal))]/25 bg-[hsl(var(--evidence-teal-tint))] text-[hsl(var(--ink-navy))]",
};

export function InfoNote({ title, children, tone = "info" }: InfoNoteProps) {
  return (
    <Alert className={cn(toneStyles[tone])}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
