import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: DocumentStatus;
  className?: string;
};

const variants: Record<DocumentStatus, "default" | "secondary" | "outline"> = {
  uploaded: "outline",
  processing: "secondary",
  ready: "default",
  failed: "outline",
  archived: "outline",
};

const statusStyles: Record<DocumentStatus, string> = {
  uploaded: "border-slate-300 bg-white text-slate-700",
  processing: "bg-amber-100 text-amber-950",
  ready: "bg-emerald-700 text-white",
  failed: "border-red-300 bg-red-50 text-red-800",
  archived: "border-slate-200 bg-slate-50 text-slate-500",
};

const statusLabels: Record<DocumentStatus, string> = {
  uploaded: "Uploaded",
  processing: "Processing source",
  ready: "Ready for evidence search",
  failed: "Processing failed",
  archived: "Archived",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge className={cn(statusStyles[status], className)} variant={variants[status]}>
      {statusLabels[status]}
    </Badge>
  );
}
