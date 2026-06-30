import { Badge } from "@/components/ui/badge";
import type { RagConfidence } from "@/lib/types";
import { cn } from "@/lib/utils";

type ConfidenceBadgeProps = {
  confidence: RagConfidence;
};

const confidenceStyles: Record<RagConfidence, string> = {
  high: "bg-emerald-700 text-white",
  medium: "bg-secondary text-secondary-foreground",
  low: "bg-amber-100 text-amber-950",
};

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  return <Badge className={cn(confidenceStyles[confidence])}>Confidence: {confidence}</Badge>;
}
