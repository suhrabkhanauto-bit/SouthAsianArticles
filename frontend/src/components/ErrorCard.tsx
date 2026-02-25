import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ErrorCardProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorCard({ message = "Failed to load data", onRetry }: ErrorCardProps) {
  return (
    <Card className="p-8 text-center">
      <p className="text-sm text-destructive font-medium">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">
        Check your network or connection settings and try again.
      </p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        Retry
      </Button>
    </Card>
  );
}
