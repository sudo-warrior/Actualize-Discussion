import { useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";
import type { Incident } from "@shared/schema";
import { useLocation } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import {
  AlertTriangle,
  Search,
  Clock,
  Filter,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Activity,
  SortDesc,
  Link2,
  Trash2,
  Tag,
  RefreshCw,
  Pause,
  Play,
  Download
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SeverityFilter = "all" | "critical" | "high" | "medium" | "low";
type SortBy = "newest" | "oldest" | "severity" | "confidence";

export default function History() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: incidents = [], isLoading, error } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/incidents/bulk/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({ title: `Deleted ${data.count} incident(s)` });
      setSelectedIds([]);
    },
  });

  const bulkExportMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/incidents/export/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to export");
      return res.blob();
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incidents-report-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `Exported ${selectedIds.length} incident(s) to PDF` });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const res = await fetch("/api/incidents/bulk/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({ title: `Updated ${data.count} incident(s)` });
      setSelectedIds([]);
    },
  });

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/incidents/${id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(i => i.id));
    }
  };

  if (error && isUnauthorizedError(error as Error)) {
    toast({ title: "Session expired", description: "Redirecting to login...", variant: "destructive" });
    setTimeout(() => { window.location.href = "/api/login"; }, 500);
  }

  const filtered = incidents
    .filter(i => {
      if (severityFilter !== "all" && i.severity !== severityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return i.title.toLowerCase().includes(q) || i.rootCause.toLowerCase().includes(q) || i.rawLogs.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "severity": {
          const order = { critical: 0, high: 1, medium: 2, low: 3 };
          return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
        }
        case "confidence": return b.confidence - a.confidence;
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const severityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-red-500";
      case "high": return "text-amber-500";
      case "medium": return "text-blue-500";
      default: return "text-emerald-500";
    }
  };

  const severities: SeverityFilter[] = ["all", "critical", "high", "medium", "low"];
  const sorts: { value: SortBy; label: string }[] = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "severity", label: "Severity" },
    { value: "confidence", label: "Confidence" },
  ];

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
        <header className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 md:mb-2 font-sans text-foreground">
            Incident History
          </h1>
          <p className="text-muted-foreground font-mono text-xs md:text-sm">
            Browse and search through all past incident analyses.
          </p>
        </header>

        <div className="flex flex-col gap-3 mb-4 md:mb-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="input-search-incidents"
                placeholder="Search incidents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-card/50 border-border font-mono text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="shrink-0"
            >
              {autoRefresh ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {autoRefresh ? "Pause" : "Resume"}
            </Button>
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-md p-2">
              <span className="text-xs font-mono text-primary">{selectedIds.length} selected</span>
              <div className="flex gap-1 ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: "resolved" })}>
                      Mark Resolved
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: "analyzing" })}>
                      Mark Analyzing
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: "critical" })}>
                      Mark Critical
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Delete ${selectedIds.length} incident(s)?`)) {
                      bulkDeleteMutation.mutate(selectedIds);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkExportMutation.mutate(selectedIds)}
                  disabled={bulkExportMutation.isPending}
                >
                  <Download className="h-3 w-3 mr-1" />
                  {bulkExportMutation.isPending ? 'Exporting...' : 'Export PDF'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-1 bg-card/50 border border-border rounded-md p-1 overflow-x-auto">
              <Filter className="h-3 w-3 text-muted-foreground ml-2 shrink-0" />
              {severities.map((s) => (
                <button
                  key={s}
                  data-testid={`button-filter-${s}`}
                  onClick={() => setSeverityFilter(s)}
                  className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-colors whitespace-nowrap ${
                    severityFilter === s
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-card/50 border border-border rounded-md p-1 overflow-x-auto">
              <SortDesc className="h-3 w-3 text-muted-foreground ml-2 shrink-0" />
              {sorts.map((s) => (
                <button
                  key={s.value}
                  data-testid={`button-sort-${s.value}`}
                  onClick={() => setSortBy(s.value)}
                  className={`px-2 py-1 rounded text-[10px] font-mono tracking-wider transition-colors whitespace-nowrap ${
                    sortBy === s.value
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 bg-card/50 border-border text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-2">
              {search || severityFilter !== "all" ? "No incidents match your filters." : "No incidents yet."}
            </p>
            <p className="text-muted-foreground text-xs font-mono">
              {search || severityFilter !== "all" ? "Try adjusting your search or filters." : "Go to New Analysis to analyze your first logs."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-muted-foreground">{filtered.length} incident{filtered.length !== 1 ? "s" : ""}</p>
              {filtered.length > 0 && (
                <div className="flex items-center gap-2 cursor-pointer" onClick={toggleSelectAll}>
                  <Checkbox checked={selectedIds.length === filtered.length} />
                  <span className="text-sm text-muted-foreground hover:text-foreground">Select All</span>
                </div>
              )}
            </div>
            {filtered.map((incident) => {
              const completedSteps = incident.completedSteps || [];
              const progress = incident.nextSteps.length > 0
                ? Math.round((completedSteps.length / incident.nextSteps.length) * 100)
                : 0;
              const isSelected = selectedIds.includes(incident.id);

              return (
                <Card
                  key={incident.id}
                  data-testid={`card-history-incident-${incident.id}`}
                  className={`p-3 md:p-5 bg-card/50 border-border hover:border-primary/30 transition-all group overflow-hidden ${isSelected ? "border-primary" : ""}`}
                >
                  <div className="flex items-start gap-3 md:gap-4 min-w-0">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(incident.id)}
                      className="mt-1 shrink-0"
                    />
                    <div
                      onClick={() => navigate(`/incidents/${incident.id}`)}
                      className="flex items-start gap-3 md:gap-4 flex-1 cursor-pointer min-w-0"
                    >
                      <div className={`p-1.5 md:p-2 rounded-full bg-muted/50 mt-0.5 shrink-0 ${severityColor(incident.severity)}`}>
                        <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-xs md:text-sm font-medium truncate flex-1">{incident.title}</h3>
                          <div className="flex items-center gap-1 md:gap-2 shrink-0">
                            <Badge variant="outline" className={`text-[10px] font-mono ${severityColor(incident.severity)} border-current/20`}>
                              {incident.severity}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-mono border-primary/20 text-primary hidden sm:inline-flex">
                              {incident.confidence}%
                            </Badge>
                          </div>
                        </div>
                        <p className="text-[10px] md:text-xs text-muted-foreground truncate mb-2">{incident.rootCause}</p>
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-[10px] md:text-xs text-muted-foreground font-mono">
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span className="truncate">{formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}</span>
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            {incident.status === "resolved" ? <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> : <Activity className="h-3 w-3 text-blue-500 shrink-0" />}
                            {incident.status}
                          </span>
                          {incident.nextSteps.length > 0 && (
                            <span className="flex items-center gap-1 shrink-0">
                              <div className="h-1.5 w-8 md:w-12 bg-muted rounded-full overflow-hidden shrink-0">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                              </div>
                              {completedSteps.length}/{incident.nextSteps.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyLink(incident.id);
                      }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start"
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
