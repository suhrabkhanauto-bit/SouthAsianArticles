import { LucideIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function PageHeader({ icon: Icon, title, subtitle, onRefresh, isRefreshing }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
        </div>
        <p className="text-xs text-muted-foreground ml-12">{subtitle}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="gap-1.5 text-xs">
        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
        Refresh
      </Button>
    </div>
  );
}
