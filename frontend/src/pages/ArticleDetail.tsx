import { useRealtimeData } from "@/hooks/useRealtimeData";
import { NewsSource } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ErrorCard } from "@/components/ErrorCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageProductionForm } from "@/components/ImageProductionForm";
import { ReelProductionForm } from "@/components/ReelProductionForm";
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Calendar,
  Tag,
  MapPin,
  FileText,
  Image as ImageIcon,
  Film,
  Copy,
  Check,
  Clock,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";

function DetailField({
  label,
  value,
  mono,
  copyable = true
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for HTTP (non-secure) contexts
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  if (!value) return null;

  return (
    <div className="group relative rounded-lg border border-transparent p-2.5 transition-all hover:border-accent hover:bg-accent/10">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{label}</p>
        {copyable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </Button>
        )}
      </div>
      <p className={`text-sm leading-relaxed text-foreground break-words overflow-hidden whitespace-pre-wrap ${mono ? "font-mono text-xs bg-muted/30 p-2 rounded border border-muted/50" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refresh } = useRealtimeData<NewsSource>("news");

  const article = useMemo(() => {
    if (!data || !id) return null;
    return data.find((n) => String(n.id) === id) ?? null;
  }, [data, id]);

  if (isLoading) return <div className="max-w-5xl mx-auto p-4"><LoadingSkeleton count={4} /></div>;
  if (error) return <div className="max-w-5xl mx-auto p-4"><ErrorCard message={error} onRetry={refresh} /></div>;
  if (!article) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4 gap-2 text-xs">
          <ArrowLeft className="h-4 w-4" /> Back to Articles
        </Button>
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-card/50">
          <p className="text-sm text-muted-foreground">Article not found.</p>
          <Button variant="link" onClick={() => navigate("/")}>Browse all articles</Button>
        </div>
      </div>
    );
  }

  const articleDate = article.published_date || article.created_at;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
        className="mb-6 -ml-2 gap-2 text-xs text-muted-foreground hover:text-foreground hover:bg-transparent px-2"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Articles
      </Button>

      {/* Header Section */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-foreground leading-tight tracking-tight max-w-3xl">
            {article.article_title}
          </h1>
          <div className="shrink-0">
            <StatusBadge status={article.status} />
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] md:text-xs text-muted-foreground flex-wrap pt-2 border-t">
          {article.source_name && (
            <span className="inline-flex items-center gap-1.5 bg-accent/30 px-2 py-1 rounded-full"><Globe className="h-3.5 w-3.5" />{article.source_name}</span>
          )}
          {article.country && (
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{article.country}</span>
          )}
          {article.category && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
              <Tag className="h-3.5 w-3.5" />{article.category}
            </span>
          )}
          {articleDate && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(articleDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              <span className="opacity-40">|</span>
              <Clock className="h-3.5 w-3.5" />
              {new Date(articleDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
            </span>
          )}
        </div>
      </div>

      {/* Main content tabs */}
      <Tabs defaultValue="content" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50 p-1">
          <TabsTrigger value="content" className="text-xs sm:text-sm gap-2">
            <FileText className="h-4 w-4" /> Content
          </TabsTrigger>
          <TabsTrigger value="image" className="text-xs sm:text-sm gap-2">
            <ImageIcon className="h-4 w-4" /> Image
          </TabsTrigger>
          <TabsTrigger value="reel" className="text-xs sm:text-sm gap-2">
            <Film className="h-4 w-4" /> Reel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Left Column: Original (2/5) */}
            <div className="xl:col-span-2 space-y-6">
              <Card className="border-none shadow-md bg-card/60 backdrop-blur-sm ring-1 ring-border overflow-hidden">
                <CardHeader className="border-b bg-muted/30 pb-3">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                    Original Source
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {article.orignal_news_image_url && (
                    <div className="aspect-video overflow-hidden rounded-xl bg-muted ring-1 ring-border shadow-inner">
                      <img
                        src={article.orignal_news_image_url}
                        alt="Original"
                        className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                      />
                    </div>
                  )}
                  {article.original_news_url && (
                    <div className="pt-2">
                      <a
                        href={article.original_news_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group text-xs text-primary hover:text-primary/80 inline-flex items-center gap-1.5 font-semibold transition-colors"
                      >
                        Launch Original Article
                        <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                    </div>
                  )}
                  {article.orignal_article && (
                    <div className="space-y-2 pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Full Context</p>
                      <div className="text-xs md:text-sm text-muted-foreground leading-relaxed whitespace-pre-line max-h-[400px] overflow-y-auto pr-2 custom-scrollbar italic bg-accent/5 p-4 rounded-lg border border-border/50">
                        {article.orignal_article}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Rewritten (3/5) */}
            <div className="xl:col-span-3 space-y-6">
              <Card className="border-none shadow-lg shadow-primary/5 bg-card ring-1 ring-border/50">
                <CardHeader className="border-b bg-primary/5 pb-3">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Production Ready Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 gap-4">
                    <DetailField label="Main Headline" value={article.rewritten_headline || ""} />
                    <DetailField label="Rewritten Article" value={article.rewritten_article || ""} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <DetailField label="SEO Title" value={article.meta_title || ""} />
                      <DetailField label="Meta Description" value={article.meta_description || ""} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailField label="Instagram Hashtags" value={article.instagram_hashtags || ""} mono />
                      <DetailField label="Instagram Caption" value={article.instagram_captions || ""} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailField label="X (Twitter) Hashtags" value={article.twitter_hashtags || ""} mono />
                      <DetailField label="X (Twitter) Caption" value={article.twitter_captions || ""} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailField label="Keyword Analysis" value={article.keywords_research || ""} mono />
                      <DetailField label="LLM Keywords" value={article.llm_keywords || ""} mono />
                    </div>

                    {article.website_url && (
                      <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10 group">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-2">Live Website Link</p>
                        <a
                          href={article.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-2 break-all font-medium"
                        >
                          {article.website_url}
                          <ExternalLink className="h-4 w-4 shrink-0 opacity-50 group-hover:opacity-100" />
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="image" className="animate-in slide-in-from-bottom-2 duration-300">
          <Card className="border-none shadow-md ring-1 ring-border">
            <CardContent className="p-0 sm:p-6 lg:p-10">
              <ImageProductionForm article={article} onSuccess={refresh} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reel" className="animate-in slide-in-from-bottom-2 duration-300">
          <Card className="border-none shadow-md ring-1 ring-border">
            <CardContent className="p-0 sm:p-6 lg:p-10">
              <ReelProductionForm article={article} onSuccess={refresh} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.4);
        }
      `}</style>
    </div>
  );
}
