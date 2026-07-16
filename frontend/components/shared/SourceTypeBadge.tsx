import { Badge } from "@/components/ui/badge";
import type { SourceType } from "@/lib/types";

type SourceTypeBadgeProps = {
  sourceType: SourceType;
};

const labels: Record<SourceType, string> = {
  course_catalog: "Course catalog",
  four_year_plan: "Four-year plan",
  major_checksheet: "Major checksheet",
  degree_audit: "Degree audit",
  degree_requirements: "Degree requirements",
  department_advising: "Advising doc",
  other: "Other",
};

export function SourceTypeBadge({ sourceType }: SourceTypeBadgeProps) {
  return (
    <Badge className="border-[hsl(var(--evidence-teal))]/25 bg-[hsl(var(--evidence-teal-tint))] text-[hsl(var(--evidence-teal))]" variant="outline">
      {labels[sourceType]}
    </Badge>
  );
}
