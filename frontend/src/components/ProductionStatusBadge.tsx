import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, Loader2, ImageIcon, Video, Type, Mic, XCircle, RotateCcw } from "lucide-react";

const config: Record<string, { className: string; icon: typeof CheckCircle; label: string }> = {
  Done: {
    className: "bg-green-500/10 text-green-600 border-0",
    icon: CheckCircle,
    label: "Done",
  },
  "Under Review": {
    className: "bg-yellow-500/10 text-yellow-600 border-0",
    icon: AlertCircle,
    label: "Under Review",
  },
  Generating: {
    className: "bg-blue-500/10 text-blue-600 border-0",
    icon: Loader2,
    label: "Generating",
  },
  "Creating Cover image": {
    className: "bg-blue-500/10 text-blue-600 border-0",
    icon: ImageIcon,
    label: "Creating Cover Image",
  },
  "Cover Image Created": {
    className: "bg-emerald-500/10 text-emerald-600 border-0",
    icon: ImageIcon,
    label: "Cover Image Created",
  },
  "Saving Cover Image": {
    className: "bg-blue-500/10 text-blue-600 border-0",
    icon: Loader2,
    label: "Saving Cover Image",
  },
  "video without voice over: Created": {
    className: "bg-purple-500/10 text-purple-600 border-0",
    icon: Video,
    label: "Video (No VO) Created",
  },
  "Applying overly text": {
    className: "bg-orange-500/10 text-orange-600 border-0",
    icon: Type,
    label: "Applying Overlay Text",
  },
  "Applying Voice over": {
    className: "bg-indigo-500/10 text-indigo-600 border-0",
    icon: Mic,
    label: "Applying Voice Over",
  },
  "Internal Error": {
    className: "bg-red-500/10 text-red-600 border-0",
    icon: XCircle,
    label: "Internal Error",
  },
  "Try again": {
    className: "bg-red-500/10 text-red-600 border-0",
    icon: RotateCcw,
    label: "Try Again",
  },
  pending: {
    className: "bg-muted text-muted-foreground border-0",
    icon: Clock,
    label: "Pending",
  },
};

// Statuses that indicate processing (not done)
const animatedStatuses = new Set([
  "Generating",
  "Creating Cover image",
  "Saving Cover Image",
  "Applying overly text",
  "Applying Voice over",
]);

export function ProductionStatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const c = config[status];
  if (!c) {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 bg-muted text-muted-foreground border-0">
        {status}
      </Badge>
    );
  }
  const Icon = c.icon;
  const isAnimated = animatedStatuses.has(status);
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${c.className}`}>
      <Icon className={`h-2.5 w-2.5 ${isAnimated ? "animate-spin" : ""}`} /> {c.label}
    </Badge>
  );
}
