import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Circle } from "lucide-react";

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  New: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "text-muted-foreground",
  },
  "Under Review": {
    bg: "bg-warning/10",
    text: "text-warning",
    dot: "text-warning",
  },
  "Ready to Publish": {
    bg: "bg-info/10",
    text: "text-info",
    dot: "text-info",
  },
  Published: {
    bg: "bg-success/10",
    text: "text-success",
    dot: "text-success",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig["New"];
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium border-0 gap-1.5 px-2.5 py-1",
        config.bg,
        config.text
      )}
    >
      <Circle className={cn("h-1.5 w-1.5 fill-current", config.dot)} />
      {status}
    </Badge>
  );
}
