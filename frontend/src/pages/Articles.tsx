import { useRealtimeData } from "@/hooks/useRealtimeData";
import { NewsSource } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ErrorCard } from "@/components/ErrorCard";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Newspaper, Search, ChevronLeft, ChevronRight, Globe, Calendar } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 25;
const STATUS_OPTIONS = ["All", "New", "Under Review", "Ready to Publish", "Published"];

export default function Articles() {
  const { data, isLoading, error, refresh } = useRealtimeData<NewsSource>("news");
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = [...data].sort(
      (a, b) =>
        new Date(b.published_date || b.created_at).getTime() -
        new Date(a.published_date || a.created_at).getTime()
    );
    if (statusFilter !== "All") {
      items = items.filter((n) => n.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (n) =>
          n.article_title.toLowerCase().includes(q) ||
          n.source_name?.toLowerCase().includes(q) ||
          n.category?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [data, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeePage = Math.min(page, totalPages);
  const paged = filtered.slice((safeePage - 1) * PAGE_SIZE, safeePage * PAGE_SIZE);

  // Reset page when filters change
  const handleSearch = (val: string) => { setSearch(val); setPage(1); };
  const handleStatus = (val: string) => { setStatusFilter(val); setPage(1); };

  return (
    <div className="max-w-6xl">
      <PageHeader
        icon={Newspaper}
        title="Articles"
        subtitle={`${filtered.length} article${filtered.length !== 1 ? "s" : ""} • Live updates`}
        onRefresh={refresh}
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatus}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingSkeleton count={6} height="h-12" />}
      {error && <ErrorCard message={error} onRetry={refresh} />}

      {!isLoading && !error && paged.length > 0 && (
        <>
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider w-[45%]">Title</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Source</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((news) => (
                  <TableRow
                    key={news.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(`/article/${news.id}`)}
                  >
                    <TableCell>
                      <p className="text-sm font-medium line-clamp-1">{news.article_title}</p>
                      {news.category && (
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{news.category}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {news.source_name && (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {news.source_name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(news.published_date || news.created_at) && (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(news.published_date || news.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {" · "}
                          {new Date(news.published_date || news.created_at).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={news.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                Showing {(safeePage - 1) * PAGE_SIZE + 1}–{Math.min(safeePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeePage <= 1}
                  onClick={() => setPage(safeePage - 1)}
                  className="h-8 px-2.5 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                </Button>
                <span className="text-xs text-muted-foreground px-3">
                  {safeePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeePage >= totalPages}
                  onClick={() => setPage(safeePage + 1)}
                  className="h-8 px-2.5 text-xs"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState icon={Newspaper} title="No articles found" subtitle="Try adjusting your filters or check back later" />
      )}
    </div>
  );
}
