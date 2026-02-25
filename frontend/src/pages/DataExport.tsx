import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
    Database,
    Download,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    Clock,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

interface TableStat {
    table: string;
    total: string;
    within_30d: string;
    oldest: string | null;
    newest: string | null;
}

interface ExportStats {
    tables: TableStat[];
    purge_date: string;
    window_days: number;
}

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function daysUntil(iso: string): number {
    const diff = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatTableName(name: string): string {
    return name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function DataExport() {
    const { token } = useAuth();
    const [stats, setStats] = useState<ExportStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [exported, setExported] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        setIsLoadingStats(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/export/stats`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data: ExportStats = await res.json();
            setStats(data);
        } catch (e: any) {
            setError(e.message ?? "Failed to load stats");
        } finally {
            setIsLoadingStats(false);
        }
    }, [token]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const res = await fetch(`${API_BASE}/export/download`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error ?? `Server error ${res.status}`);
            }

            // Stream the blob and trigger download
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const dateTag = new Date().toISOString().slice(0, 10);
            a.download = `content-studio-export-${dateTag}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            setExported(true);
            toast.success("Export downloaded successfully", {
                description: "Your ZIP file contains all tables as CSV files.",
            });
        } catch (e: any) {
            toast.error("Export failed", { description: e.message });
        } finally {
            setIsDownloading(false);
        }
    };

    const daysLeft = stats ? daysUntil(stats.purge_date) : null;
    const totalRows = stats
        ? stats.tables.reduce((sum, t) => sum + parseInt(t.within_30d, 10), 0)
        : 0;

    return (
        <div className="max-w-4xl space-y-6">
            <PageHeader
                icon={Database}
                title="Data Export"
                subtitle="Export all database tables within the 30-day retention window"
                onRefresh={fetchStats}
            />

            {/* ── Alert Banner ─────────────────────────────────────────────────── */}
            {stats && daysLeft !== null && (
                <Alert
                    className={
                        daysLeft <= 7
                            ? "border-destructive/50 bg-destructive/10 text-destructive"
                            : "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    }
                >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="font-semibold">
                        {daysLeft <= 7 ? "⚠️ Urgent — Data expires soon!" : "Data retention policy"}
                    </AlertTitle>
                    <AlertDescription className="mt-1 text-sm">
                        Records older than{" "}
                        <span className="font-semibold">{stats.window_days} days</span> are
                        automatically purged at <strong>02:00 daily</strong>.{" "}
                        {daysLeft > 0 ? (
                            <>
                                Next purge cycle is in{" "}
                                <span className="font-semibold">{daysLeft} day{daysLeft !== 1 ? "s" : ""}</span>.{" "}
                                Export your data before it is removed.
                            </>
                        ) : (
                            <>A purge may occur at any time — export immediately.</>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            {/* ── Success Banner ───────────────────────────────────────────────── */}
            {exported && (
                <Alert className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle className="font-semibold">Export complete</AlertTitle>
                    <AlertDescription className="text-sm">
                        Your data has been downloaded. The ZIP contains one CSV file per
                        table plus a <code>manifest.json</code>.
                    </AlertDescription>
                </Alert>
            )}

            {/* ── Stats Table ──────────────────────────────────────────────────── */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Available Data
                    </CardTitle>
                    {isLoadingStats && (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                </CardHeader>
                <CardContent>
                    {error ? (
                        <p className="text-sm text-destructive">{error}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                                        Table
                                    </TableHead>
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">
                                        Last 30 days
                                    </TableHead>
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">
                                        Total rows
                                    </TableHead>
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                                        Latest record
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingStats
                                    ? [1, 2, 3].map((i) => (
                                        <TableRow key={i}>
                                            {[1, 2, 3, 4].map((j) => (
                                                <TableCell key={j}>
                                                    <div className="h-4 rounded bg-muted animate-pulse" />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                    : stats?.tables.map((t) => (
                                        <TableRow key={t.table}>
                                            <TableCell className="font-medium text-sm">
                                                {formatTableName(t.table)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="font-mono text-xs">
                                                    {parseInt(t.within_30d, 10).toLocaleString()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {parseInt(t.total, 10).toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDate(t.newest)}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    )}

                    {!isLoadingStats && !error && stats && (
                        <p className="mt-3 text-xs text-muted-foreground border-t pt-3">
                            <span className="font-semibold text-foreground">
                                {totalRows.toLocaleString()} rows
                            </span>{" "}
                            across {stats.tables.length} tables will be included in the export.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* ── Export Action ────────────────────────────────────────────────── */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Download Export
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Exports a <strong>ZIP archive</strong> containing one{" "}
                        <strong>CSV file per table</strong> filtered to the last 30 days,
                        plus a <code className="text-xs bg-muted px-1 py-0.5 rounded">manifest.json</code>{" "}
                        with metadata. Includes: News Sources, Image Production, Reels, and Users.
                    </p>
                    <Button
                        onClick={handleDownload}
                        disabled={isDownloading || isLoadingStats}
                        className="gap-2"
                    >
                        {isDownloading ? (
                            <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Preparing export…
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" />
                                Export All Tables (.zip)
                            </>
                        )}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                        The download will begin automatically once the server has packaged all tables.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
