import { useRealtimeData } from "@/hooks/useRealtimeData";
import { ManualImageProduction, Reel } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ErrorCard } from "@/components/ErrorCard";
import { EmptyState } from "@/components/EmptyState";
import { ProductionStatusBadge } from "@/components/ProductionStatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Image, Film, ClipboardList, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ProductionLogs() {
  const navigate = useNavigate();

  const { data: images, isLoading: imgLoading, error: imgError, refresh: imgRefresh } = useRealtimeData<ManualImageProduction>("images");
  const { data: reels, isLoading: reelLoading, error: reelError, refresh: reelRefresh } = useRealtimeData<Reel>("reels");

  // Only show items with "Done" status
  const doneImages = images?.filter((img) => img.status?.toLowerCase() === "done") ?? [];
  const doneReels = reels?.filter((reel) => reel.status?.toLowerCase() === "done") ?? [];

  const isLoading = imgLoading || reelLoading;
  const error = imgError || reelError;

  return (
    <div className="max-w-6xl">
      <PageHeader
        icon={ClipboardList}
        title="Production Logs"
        subtitle="Real-time image & reel generation activity"
        onRefresh={() => { imgRefresh(); reelRefresh(); }}
      />

      {isLoading && <LoadingSkeleton count={5} height="h-12" />}
      {error && <ErrorCard message={error} onRetry={() => { imgRefresh(); reelRefresh(); }} />}

      {!isLoading && !error && (
        <Tabs defaultValue="images" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="images" className="text-xs gap-1.5">
              <Image className="h-3.5 w-3.5" /> Images ({doneImages.length})
            </TabsTrigger>
            <TabsTrigger value="reels" className="text-xs gap-1.5">
              <Film className="h-3.5 w-3.5" /> Reels ({doneReels.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="images">
            {doneImages.length > 0 ? (
              <div className="rounded-xl border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">ID</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Category</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">URL</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doneImages.map((img) => (
                      <TableRow
                        key={img.news_source_id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => navigate(`/article/${img.news_source_id}`)}
                      >
                        <TableCell>
                          <p className="text-sm font-medium">#{img.news_source_id}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{img.catogires || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <ProductionStatusBadge status={img.status} />
                        </TableCell>
                        <TableCell>
                          {img.download_link ? (
                            <Button variant="ghost" size="sm" asChild className="gap-1 text-xs h-7 px-2" onClick={(e) => e.stopPropagation()}>
                              <a href={img.download_link} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" /> Open
                              </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {new Date(img.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState icon={Image} title="No image logs" subtitle="Image production data will appear here" />
            )}
          </TabsContent>

          <TabsContent value="reels">
            {doneReels.length > 0 ? (
              <div className="rounded-xl border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">ID</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Dimension</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">URL</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doneReels.map((reel) => (
                      <TableRow
                        key={reel.news_source_id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => navigate(`/article/${reel.news_source_id}`)}
                      >
                        <TableCell>
                          <p className="text-sm font-medium">#{reel.news_source_id}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{reel.video_dimension || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <ProductionStatusBadge status={reel.status} />
                        </TableCell>
                        <TableCell>
                          {reel.final_video ? (
                            <Button variant="ghost" size="sm" asChild className="gap-1 text-xs h-7 px-2" onClick={(e) => e.stopPropagation()}>
                              <a href={reel.final_video} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" /> Open
                              </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {new Date(reel.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState icon={Film} title="No reel logs" subtitle="Reel production data will appear here" />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
