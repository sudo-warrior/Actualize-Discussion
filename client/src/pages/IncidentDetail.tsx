import { useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import type { Incident } from "@shared/schema";
import { useRoute, useLocation } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import {
  AlertTriangle,
  Check,
  Copy,
  Cpu,
  Search,
  Activity,
  Clock,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  Shield,
  FileText,
  Loader2,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function IncidentDetail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/incidents/:id");
  const incidentId = params?.id;
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [guidanceData, setGuidanceData] = useState<Record<number, string>>({});
  const [loadingGuidance, setLoadingGuidance] = useState<number | null>(null);

  const { data: incident, isLoading, error } = useQuery<Incident>({
    queryKey: [`/api/incidents/${incidentId}`],
    enabled: !!incidentId,
  });

  if (error && isUnauthorizedError(error as Error)) {
    toast({ title: "Session expired", description: "Redirecting to login...", variant: "destructive" });
    setTimeout(() => { window.location.href = "/api/login"; }, 500);
  }

  const toggleStepMutation = useMutation({
    mutationFn: async (stepIndex: number) => {
      const res = await apiRequest("PATCH", `/api/incidents/${incidentId}/steps/${stepIndex}`);
      return res.json() as Promise<Incident>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${incidentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/incidents/${incidentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({ title: "Incident deleted" });
      navigate("/history");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PATCH", `/api/incidents/${incidentId}/status`, { status });
      return res.json() as Promise<Incident>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${incidentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
    },
  });

  const handleGetGuidance = async (stepIndex: number) => {
    if (guidanceData[stepIndex]) {
      setExpandedStep(expandedStep === stepIndex ? null : stepIndex);
      return;
    }
    setExpandedStep(stepIndex);
    setLoadingGuidance(stepIndex);
    try {
      const res = await apiRequest("POST", `/api/incidents/${incidentId}/steps/${stepIndex}/guidance`);
      const data = await res.json();
      setGuidanceData(prev => ({ ...prev, [stepIndex]: data.guidance }));
    } catch (err) {
      toast({ title: "Failed to get guidance", description: "Please try again.", variant: "destructive" });
      setExpandedStep(null);
    } finally {
      setLoadingGuidance(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-red-500 bg-red-500/10 border-red-500/30";
      case "high": return "text-amber-500 bg-amber-500/10 border-amber-500/30";
      case "medium": return "text-blue-500 bg-blue-500/10 border-blue-500/30";
      default: return "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!incident) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <p className="text-muted-foreground">Incident not found.</p>
          <Button variant="outline" onClick={() => navigate("/history")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to History
          </Button>
        </div>
      </Layout>
    );
  }

  const completedSteps = incident.completedSteps || [];
  const progress = incident.nextSteps.length > 0
    ? Math.round((completedSteps.length / incident.nextSteps.length) * 100)
    : 0;

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-8 relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <Button data-testid="button-back" variant="ghost" size="icon" onClick={() => navigate("/history")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 data-testid="text-incident-title" className="text-2xl font-bold tracking-tight font-sans text-foreground">
              {incident.title}
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              {format(new Date(incident.createdAt), "MMM d, yyyy 'at' h:mm a")} ({formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${severityColor(incident.severity)} text-[10px] font-mono uppercase tracking-wider`}>
              {incident.severity}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
              {incident.confidence}% confidence
            </Badge>
          </div>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 border-l-4 border-l-red-500 bg-gradient-to-br from-card to-card/50 relative group">
              <div className="flex items-center gap-2 mb-3 text-red-500">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-bold uppercase tracking-wider text-sm">Root Cause</h3>
              </div>
              <p data-testid="text-root-cause" className="text-sm text-foreground leading-relaxed">{incident.rootCause}</p>
              <button
                data-testid="button-copy-root-cause"
                onClick={() => copyToClipboard(incident.rootCause, "Root cause")}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground h-7 w-7 rounded flex items-center justify-center hover:bg-muted"
                title="Copy root cause"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </Card>

            <Card className="p-0 overflow-hidden border-border bg-card/50 relative group">
              <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                <Search className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Key Evidence</span>
                <button
                  data-testid="button-copy-evidence"
                  onClick={() => copyToClipboard(incident.evidence.join("\n"), "Evidence")}
                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground h-6 w-6 rounded flex items-center justify-center hover:bg-muted"
                  title="Copy all evidence"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="p-4 space-y-2 bg-black/40 font-mono text-xs">
                {incident.evidence.map((line, i) => (
                  <div key={i} className="text-red-300/90 border-l-2 border-red-500/50 pl-3 py-1 break-all group/line relative">
                    {line}
                    <button
                      onClick={() => copyToClipboard(line, "Evidence line")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/line:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 border-border bg-gradient-to-br from-card to-emerald-950/20 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-2 mb-4 text-emerald-500">
                <Cpu className="h-5 w-5" />
                <h3 className="font-bold uppercase tracking-wider text-sm">Suggested Fix</h3>
              </div>
              <div className="bg-background/80 rounded-md p-4 border border-border relative group">
                <code className="text-sm font-mono text-emerald-100 block whitespace-pre-wrap">{incident.fix}</code>
                <Button
                  data-testid="button-copy-fix"
                  onClick={() => copyToClipboard(incident.fix, "Fix")}
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 hover:bg-emerald-500/20 hover:text-emerald-400"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            <Card className="p-0 overflow-hidden border-border bg-card/50 relative group">
              <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Raw Logs</span>
                <button
                  data-testid="button-copy-logs"
                  onClick={() => copyToClipboard(incident.rawLogs, "Raw logs")}
                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground h-6 w-6 rounded flex items-center justify-center hover:bg-muted"
                  title="Copy raw logs"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="p-4 bg-black/40 font-mono text-xs max-h-[300px] overflow-y-auto">
                <pre className="text-muted-foreground whitespace-pre-wrap break-all">{incident.rawLogs}</pre>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-5 border-border bg-card/50">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Action Progress</h3>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-xs font-mono text-muted-foreground mb-1">
                  <span>{completedSteps.length} of {incident.nextSteps.length}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                {incident.nextSteps.map((step, i) => {
                  const isDone = completedSteps.includes(i);
                  const isExpanded = expandedStep === i;
                  const hasGuidance = !!guidanceData[i];
                  const isLoadingThis = loadingGuidance === i;

                  return (
                    <div key={i}>
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex flex-col rounded-lg border transition-all ${isDone ? "border-emerald-500/30 bg-emerald-500/5" : isExpanded ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/5"}`}
                      >
                        <div className="flex items-start gap-3 p-3 group">
                          <button
                            data-testid={`button-toggle-step-${i}`}
                            onClick={() => toggleStepMutation.mutate(i)}
                            className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors border ${isDone ? "bg-emerald-500 border-emerald-500 text-white" : "bg-muted border-border hover:border-primary hover:bg-primary/20"}`}
                          >
                            {isDone ? <Check className="h-3 w-3" /> : <span className="text-[10px] font-mono">{i + 1}</span>}
                          </button>
                          <span className={`text-xs leading-relaxed flex-1 ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>{step}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(step, "Action"); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground h-6 w-6 rounded flex items-center justify-center hover:bg-muted"
                              title="Copy"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="px-3 pb-2 flex gap-1">
                          <button
                            data-testid={`button-guidance-${i}`}
                            onClick={() => handleGetGuidance(i)}
                            className="flex items-center gap-1.5 text-[10px] font-mono text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded hover:bg-primary/10"
                          >
                            {isLoadingThis ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            {isLoadingThis ? "Getting help..." : hasGuidance && isExpanded ? "Hide guidance" : "How do I do this?"}
                            {hasGuidance && !isLoadingThis && (isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                          </button>
                        </div>
                      </motion.div>

                      <AnimatePresence>
                        {isExpanded && (hasGuidance || isLoadingThis) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-1 p-4 bg-primary/5 border border-primary/20 rounded-lg relative">
                              <div className="flex items-center gap-2 mb-3 text-primary">
                                <Sparkles className="h-4 w-4" />
                                <span className="text-xs font-mono uppercase tracking-wider">AI Guidance</span>
                                <button
                                  onClick={() => copyToClipboard(guidanceData[i] || "", "Guidance")}
                                  className="ml-auto text-muted-foreground hover:text-foreground h-6 w-6 rounded flex items-center justify-center hover:bg-muted"
                                  title="Copy guidance"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => setExpandedStep(null)}
                                  className="text-muted-foreground hover:text-foreground h-6 w-6 rounded flex items-center justify-center hover:bg-muted"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                              {isLoadingThis ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Generating step-by-step instructions...</span>
                                </div>
                              ) : (
                                <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-mono">
                                  {guidanceData[i]}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5 border-border bg-card/50">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Status</h3>
              </div>
              <div className="space-y-2">
                {(["resolved", "critical", "analyzing"] as const).map((s) => (
                  <button
                    key={s}
                    data-testid={`button-status-${s}`}
                    onClick={() => statusMutation.mutate(s)}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs font-mono uppercase tracking-wider transition-colors border ${
                      incident.status === s
                        ? s === "resolved" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                          : s === "critical" ? "bg-red-500/20 border-red-500/30 text-red-400"
                          : "bg-blue-500/20 border-blue-500/30 text-blue-400"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {s === "resolved" && <CheckCircle2 className="h-3 w-3 inline mr-2" />}
                    {s === "critical" && <AlertTriangle className="h-3 w-3 inline mr-2" />}
                    {s === "analyzing" && <Activity className="h-3 w-3 inline mr-2" />}
                    {s}
                  </button>
                ))}
              </div>
            </Card>

            <Button
              data-testid="button-delete-incident"
              variant="outline"
              onClick={() => {
                if (confirm("Are you sure you want to delete this incident?")) {
                  deleteMutation.mutate();
                }
              }}
              className="w-full text-red-500 border-red-500/20 hover:bg-red-500/10 hover:text-red-400 font-mono text-xs"
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-3 w-3" />
              {deleteMutation.isPending ? "DELETING..." : "DELETE INCIDENT"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
