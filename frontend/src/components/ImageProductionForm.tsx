import { useState, useEffect, useMemo, useRef } from "react";
import { saveImageData, triggerImageGeneration } from "@/lib/api";
import { NewsSource, ManualImageProduction } from "@/lib/types";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { FormField } from "@/components/FormField";
import { ProductionStatusBadge } from "@/components/ProductionStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImagePlus, Save, Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const CATEGORY_OPTIONS = [
  { value: "simple_headline", label: "Simple Headline" },
  { value: "keyword_highlight", label: "Keyword Highlight" },
  { value: "question", label: "Question" },
  { value: "statistic", label: "Statistic" },
];

interface Props {
  article: NewsSource;
  onSuccess: () => void;
}

export function ImageProductionForm({ article, onSuccess }: Props) {
  const [form, setForm] = useState({
    image_for_post: "",
    catogires: "",
    image_url: "",
    image_owner_name: "",
  });
  const [savingAndGenerating, setSavingAndGenerating] = useState(false);
  // Tracks if we've already pre-filled the form once — prevents WebSocket pushes from overwriting user edits
  const initializedRef = useRef(false);

  // Live data from WebSocket — used for status badge and download link display only after init
  const { data: allImages, isLoading, refresh } = useRealtimeData<ManualImageProduction>("images");

  const existing = useMemo(() => {
    if (!allImages) return null;
    return allImages.find((img) => img.news_source_id === article.id) || null;
  }, [allImages, article.id]);

  // Pre-fill form only on the FIRST time data arrives — never overwrite user edits after that
  useEffect(() => {
    if (existing && !initializedRef.current) {
      initializedRef.current = true;
      setForm({
        image_for_post: existing.image_for_post || "",
        catogires: existing.catogires || "",
        image_url: existing.image_url || "",
        image_owner_name: existing.image_owner_name || "",
      });
    }
  }, [existing]);

  const handleSaveAndGenerate = async () => {
    if (!isValid) return;
    setSavingAndGenerating(true);
    try {
      console.log(`[Image] Save & Generate: saving + webhook for article ${article.id}`);
      await saveImageData({ news_source_id: article.id, title: article.article_title, ...form });
      toast({ title: "Saved", description: "Image data saved." });

      await triggerImageGeneration(article.id, form.catogires);
      toast({ title: "Triggered", description: "Image generation webhook called." });
      refresh();
    } catch (e: any) {
      console.error("[Image] Save & Generate error:", e);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingAndGenerating(false);
    }
  };

  const isValid = form.image_for_post && form.catogires && form.image_url && form.image_owner_name;
  const hasDownloadLink = !!existing?.download_link;
  const isDone = existing?.status === "Done";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-primary" /> Image Production
          {existing && <ProductionStatusBadge status={existing.status} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Image for Post" value={form.image_for_post} onChange={(v) => setForm({ ...form, image_for_post: v })} placeholder="Enter image for post text" />

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</label>
          <Select value={form.catogires} onValueChange={(val) => setForm({ ...form, catogires: val })}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <FormField label="Image URL" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} placeholder="Enter source image URL" />
        <FormField label="Image Owner Name" value={form.image_owner_name} onChange={(v) => setForm({ ...form, image_owner_name: v })} placeholder="Enter image owner name" />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            onClick={handleSaveAndGenerate}
            disabled={savingAndGenerating || !isValid}
            className="gap-1.5"
          >
            {savingAndGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save & Generate
          </Button>
        </div>

        {/* Download section */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generated Image</p>
            {existing && <ProductionStatusBadge status={existing.status} />}
          </div>
          {hasDownloadLink && isDone ? (
            <>
              <p className="text-xs font-mono break-all text-foreground mb-2">{existing!.download_link}</p>
              <Button variant="outline" size="sm" asChild className="gap-1 text-xs h-7">
                <a href={existing!.download_link!} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-3 w-3" /> Download
                </a>
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled className="gap-1 text-xs h-7">
                <Download className="h-3 w-3" /> Download
              </Button>
              <span className="text-xs text-muted-foreground">
                {existing && !isDone ? "Processing..." : "No image generated yet"}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
