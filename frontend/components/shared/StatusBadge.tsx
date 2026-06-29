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
  uploaded: "border-slate-300 text-slate-700",
  processing: "bg-amber-100 text-amber-900",
  ready: "bg-emerald-700 text-white",
  failed: "border-red-300 text-red-700",
  archived: "border-slate-200 text-slate-500",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge className={cn(statusStyles[status], className)} variant={variants[status]}>
      {status}
    </Badge>
  );
}
