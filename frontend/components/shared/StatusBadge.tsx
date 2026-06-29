import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/lib/types";

type StatusBadgeProps = {
  status: DocumentStatus;
};

const variants: Record<DocumentStatus, "default" | "secondary" | "outline"> = {
  uploaded: "outline",
  processing: "secondary",
  ready: "default",
  failed: "outline",
  archived: "outline",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={variants[status]}>{status}</Badge>;
}
