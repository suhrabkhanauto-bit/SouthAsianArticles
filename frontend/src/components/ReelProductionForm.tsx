import { useState, useEffect, useMemo, useRef } from "react";
import { saveReelData, triggerVideoGeneration, triggerCoverImageCreation } from "@/lib/api";
import { NewsSource, Reel } from "@/lib/types";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { FormField } from "@/components/FormField";
import { ProductionStatusBadge } from "@/components/ProductionStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clapperboard, Save, Download, Loader2, ImagePlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  article: NewsSource;
  onSuccess: () => void;
}

const DIMENSION_OPTIONS = [
  { value: "portrait 9:16", label: "Portrait 9:16" },
  { value: "landscape 16:9", label: "Landscape 16:9" },
];

export function ReelProductionForm({ article, onSuccess }: Props) {
  const [form, setForm] = useState({
    video_url: "",
    video_owner_name: "",
    video_dimension: "",
    reel_cover_image: "",
  });
  const [regenerating, setRegenerating] = useState(false);
  const [savingAndGenerating, setSavingAndGenerating] = useState(false);
  const [creatingCover, setCreatingCover] = useState(false);
  // Tracks if we've already pre-filled the form once — prevents WebSocket pushes from overwriting user edits
  const initializedRef = useRef(false);

  // Live data from WebSocket — used for status badge and download link display only after init
  const { data: allReels, isLoading, refresh } = useRealtimeData<Reel>("reels");

  const existing = useMemo(() => {
    if (!allReels) return null;
    return allReels.find((r) => r.news_source_id === article.id) || null;
  }, [allReels, article.id]);

  // Pre-fill form only on the FIRST time data arrives — never overwrite user edits after that
  useEffect(() => {
    if (existing && !initializedRef.current) {
      initializedRef.current = true;
      setForm({
        video_url: existing.video_url || "",
        video_owner_name: existing.video_owner_name || "",
        video_dimension: existing.video_dimension || "",
        reel_cover_image: existing.reel_cover_image || "",
      });
    }
  }, [existing]);

  const handleCreateCover = async () => {
    setCreatingCover(true);
    try {
      console.log(`[Reel] Create Cover: webhook for article ${article.id}`);
      await triggerCoverImageCreation(article.id);
      toast({ title: "Triggered", description: "Cover image creation webhook called." });
      refresh();
    } catch (e: any) {
      console.error("[Reel] Create Cover error:", e);
      toast({ title: "Webhook Error", description: e.message, variant: "destructive" });
    } finally {
      setCreatingCover(false);
    }
  };

  const handleSaveAndGenerate = async () => {
    if (!isValid) return;
    setSavingAndGenerating(true);
    try {
      console.log(`[Reel] Save & Generate: saving + webhook for article ${article.id}`);
      await saveReelData({ news_source_id: article.id, title: article.article_title, ...form });
      toast({ title: "Saved", description: "Reel data saved." });

      await triggerVideoGeneration({
        id: article.id,
        video_url: form.video_url,
        video_dimension: form.video_dimension,
        video_without_voice_over: "",
        reel_cover_image: form.reel_cover_image,
      });
      toast({ title: "Triggered", description: "Video generation webhook called." });
      refresh();
    } catch (e: any) {
      console.error("[Reel] Save & Generate error:", e);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingAndGenerating(false);
    }
  };

  const isValid = form.video_url && form.video_owner_name && form.video_dimension;
  const isDone = existing?.status === "Done";
  const hasVideoWithoutVO = !!existing?.video_without_voice_over;
  const hasFinalVideo = !!existing?.final_video;
  const hasCoverDownload = !!existing?.final_reel_cover_download_link;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clapperboard className="h-4 w-4 text-primary" /> Reel Production
          {existing && <ProductionStatusBadge status={existing.status} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          label="Video URL"
          value={form.video_url}
          onChange={(v) => setForm({ ...form, video_url: v })}
          placeholder="Enter video URL"
        />
        <FormField
          label="Video Owner"
          value={form.video_owner_name}
          onChange={(v) => setForm({ ...form, video_owner_name: v })}
          placeholder="Enter video owner name"
        />

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dimension</label>
          <Select
            key={form.video_dimension || "empty"}
            value={form.video_dimension}
            onValueChange={(val) => {
              console.log(`[Reel] Dimension changed to: ${val}`);
              setForm((prev) => ({ ...prev, video_dimension: val }));
            }}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select dimension" />
            </SelectTrigger>
            <SelectContent>
              {DIMENSION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <FormField
          label="Reel Cover Image (Optional)"
          value={form.reel_cover_image}
          onChange={(v) => setForm({ ...form, reel_cover_image: v })}
          placeholder="Enter cover image URL (optional)"
        />

        {/* Create Cover Button */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleCreateCover}
            disabled={creatingCover}
            className="gap-1.5"
          >
            {creatingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            Create Cover
          </Button>
          {hasCoverDownload ? (
            <Button variant="outline" size="sm" asChild className="gap-1 text-xs h-7">
              <a href={existing!.final_reel_cover_download_link!} download target="_blank" rel="noopener noreferrer">
                <Download className="h-3 w-3" /> Download Cover
              </a>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">No cover generated yet</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={handleSaveAndGenerate} disabled={savingAndGenerating || !isValid} className="gap-1.5">
            {savingAndGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save & Generate
          </Button>
        </div>

        {/* Download section */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generated Videos</p>
            {existing && <ProductionStatusBadge status={existing.status} />}
          </div>

          {/* Video Without Voice Over */}
          <div className="flex items-center gap-2">
            {hasVideoWithoutVO && isDone ? (
              <Button variant="outline" size="sm" asChild className="gap-1 text-xs h-7">
                <a href={existing!.video_without_voice_over!} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-3 w-3" /> Video Without Voice Over
                </a>
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" disabled className="gap-1 text-xs h-7">
                  <Download className="h-3 w-3" /> Video Without Voice Over
                </Button>
                {!isDone && existing && <span className="text-xs text-muted-foreground">Processing...</span>}
                {!existing && <span className="text-xs text-muted-foreground">Not generated</span>}
              </>
            )}
          </div>

          {/* Final Video */}
          <div className="flex items-center gap-2">
            {hasFinalVideo && isDone ? (
              <Button variant="outline" size="sm" asChild className="gap-1 text-xs h-7">
                <a href={existing!.final_video!} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-3 w-3" /> Final Video
                </a>
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" disabled className="gap-1 text-xs h-7">
                  <Download className="h-3 w-3" /> Final Video
                </Button>
                {!isDone && existing && <span className="text-xs text-muted-foreground">Processing...</span>}
                {!existing && <span className="text-xs text-muted-foreground">Not generated</span>}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
