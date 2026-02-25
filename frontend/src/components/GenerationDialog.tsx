import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Download, ExternalLink, Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onGenerate: () => Promise<void>;
  onPoll: () => Promise<{ status: string; url: string | null } | null>;
  existingStatus?: string;
  existingUrl?: string | null;
}

type Phase = "idle" | "triggering" | "polling" | "done" | "error" | "under_review";

export function GenerationDialog({
  open,
  onOpenChange,
  title,
  onGenerate,
  onPoll,
  existingStatus,
  existingUrl,
}: GenerationDialogProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state on open
  useEffect(() => {
    if (open) {
      if (existingUrl && existingStatus === "Done") {
        setPhase("done");
        setResultUrl(existingUrl);
      } else if (existingStatus === "Under Review") {
        setPhase("under_review");
        setResultUrl(null);
      } else {
        setPhase("idle");
        setResultUrl(null);
      }
      setErrorMsg("");
    }
    return () => stopPolling();
  }, [open, existingUrl, existingStatus]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = () => {
    stopPolling();
    setPhase("polling");
    pollRef.current = setInterval(async () => {
      try {
        const result = await onPoll();
        if (!result) return;
        if (result.status === "Done" && result.url) {
          setResultUrl(result.url);
          setPhase("done");
          stopPolling();
        } else if (result.status === "Under Review") {
          setPhase("under_review");
          setErrorMsg("Generation encountered an issue. Status: Under Review");
          stopPolling();
        }
      } catch {
        // keep polling
      }
    }, 5000);
  };

  const handleGenerate = async () => {
    setPhase("triggering");
    setErrorMsg("");
    try {
      await onGenerate();
      // Webhook fired, now poll for result
      startPolling();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to trigger generation");
      setPhase("error");
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      stopPolling();
      setPhase("idle");
      setResultUrl(null);
      setErrorMsg("");
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Data saved successfully. Click generate to start production.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {phase === "idle" && (
            <Button onClick={handleGenerate} className="gap-2">
              <Sparkles className="h-4 w-4" /> Generate
            </Button>
          )}

          {phase === "triggering" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Triggering generation...</p>
            </div>
          )}

          {phase === "polling" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generation in progress... Checking for results.</p>
              <Badge variant="secondary" className="gap-1.5">
                <Clock className="h-3 w-3" /> Pending
              </Badge>
            </div>
          )}

          {phase === "done" && resultUrl && (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <Badge className="bg-green-500/10 text-green-600 border-0 gap-1.5">
                <CheckCircle className="h-3 w-3" /> Done
              </Badge>
              <div className="w-full p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Download URL</p>
                <p className="text-xs font-mono break-all text-foreground">{resultUrl}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild className="gap-1.5">
                  <a href={resultUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> Open
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild className="gap-1.5">
                  <a href={resultUrl} download>
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </Button>
              </div>
            </div>
          )}

          {phase === "under_review" && (
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <Badge className="bg-yellow-500/10 text-yellow-600 border-0 gap-1.5">
                <AlertCircle className="h-3 w-3" /> Under Review
              </Badge>
              <p className="text-sm text-muted-foreground text-center">Generation encountered an issue. The status will update once resolved.</p>
              <Button variant="outline" size="sm" onClick={handleGenerate}>
                Retry
              </Button>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <p className="text-sm text-destructive">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={handleGenerate}>
                Retry
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
