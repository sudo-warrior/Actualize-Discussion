import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import type { Incident } from "@shared/schema";
import { useLocation } from "wouter";
import { 
  Play, 
  Terminal, 
  AlertTriangle, 
  Copy, 
  Cpu, 
  Loader2,
  Search,
  Activity,
  Check,
  ExternalLink,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [logs, setLogs] = useState("");
  const [result, setResult] = useState<Incident | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [guidanceData, setGuidanceData] = useState<Record<number, string>>({});
  const [loadingGuidance, setLoadingGuidance] = useState<number | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async (logInput: string) => {
      const res = await apiRequest("POST", "/api/incidents/analyze", { logs: logInput });
      return res.json() as Promise<Incident>;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Redirecting to login...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    }
  });

  const handleAnalyze = () => {
    if (!logs.trim()) return;
    analyzeMutation.mutate(logs);
  };

  const handleReset = () => {
    setLogs("");
    setResult(null);
    setExpandedStep(null);
    setGuidanceData({});
    analyzeMutation.reset();
  };

  const handleIncidentSelect = async (id: string) => {
    try {
      const res = await apiRequest("GET", `/api/incidents/${id}`);
      const incident = await res.json() as Incident;
      setLogs(incident.rawLogs);
      setResult(incident);
    } catch {
      toast({ title: "Failed to load incident", variant: "destructive" });
    }
  };

  const toggleStepMutation = useMutation({
    mutationFn: async ({ incidentId, stepIndex }: { incidentId: string; stepIndex: number }) => {
      const res = await apiRequest("PATCH", `/api/incidents/${incidentId}/steps/${stepIndex}`);
      return res.json() as Promise<Incident>;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      
      // Auto-update status based on completion
      const completedCount = data.completedSteps?.length || 0;
      const totalSteps = data.nextSteps.length;
      
      if (completedCount === totalSteps) {
        toast({ 
          title: "All steps completed!", 
          description: "Great work! Incident resolved." 
        });
      }
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Redirecting to login...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Failed to update step", description: error.message, variant: "destructive" });
    },
  });

  const handleStepToggle = (stepIndex: number) => {
    if (!result) return;
    toggleStepMutation.mutate({ incidentId: result.id, stepIndex });
  };

  const handleGetGuidance = async (stepIndex: number) => {
    if (!result) return;
    if (guidanceData[stepIndex]) {
      setExpandedStep(expandedStep === stepIndex ? null : stepIndex);
      return;
    }
    setExpandedStep(stepIndex);
    setLoadingGuidance(stepIndex);
    try {
      const res = await apiRequest("POST", `/api/incidents/${result.id}/steps/${stepIndex}/guidance`);
      const data = await res.json();
      setGuidanceData(prev => ({ ...prev, [stepIndex]: data.guidance }));
    } catch {
      toast({ title: "Failed to get guidance", description: "Please try again.", variant: "destructive" });
      setExpandedStep(null);
    } finally {
      setLoadingGuidance(null);
    }
  };

  const copyStepToClipboard = (step: string) => {
    navigator.clipboard.writeText(step);
    toast({ title: "Copied", description: "Action copied to clipboard." });
  };

  const copyToClipboard = () => {
    if (result?.fix) {
      navigator.clipboard.writeText(result.fix);
      toast({ title: "Copied to clipboard", description: "The fix has been copied." });
    }
  };

  const isAnalyzing = analyzeMutation.isPending;
  const isComplete = !!result;

  return (
    <Layout onIncidentSelect={handleIncidentSelect}>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
        <header className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 md:mb-2 font-sans text-foreground">
              Incident Analysis
            </h1>
            <p className="text-muted-foreground font-mono text-xs md:text-sm">
              Paste logs below to identify root cause and generate fixes.
            </p>
          </div>
          {isComplete && (
            <Button variant="outline" onClick={handleReset} className="font-mono text-xs border-primary/20 text-primary hover:bg-primary/10 self-start sm:self-auto">
              <Terminal className="mr-2 h-3 w-3" />
              NEW SESSION
            </Button>
          )}
        </header>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 pb-20">
          <div className={`transition-all duration-500 ease-in-out ${isComplete ? "lg:col-span-5" : "lg:col-span-12"}`}>
            <div className="mb-4 font-mono text-xs text-muted-foreground flex items-center gap-2 px-1 opacity-70">
              <span className="text-green-500">$</span>
              <span>incident analyze</span>
              <span className="text-yellow-500">build.log</span>
              <span className="animate-pulse">_</span>
            </div>

            <Card className="h-[50vh] md:h-[60vh] bg-card/80 backdrop-blur-md border-border flex flex-col overflow-hidden shadow-2xl relative group">
              <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground ml-2">input.log</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono bg-primary/5 text-primary border-primary/20">
                  PLAIN TEXT
                </Badge>
              </div>
              
              <div className="flex-1 relative">
                <Textarea 
                  data-testid="input-logs"
                  value={logs}
                  onChange={(e) => setLogs(e.target.value)}
                  placeholder="Paste stack traces, error logs, or terminal output here..."
                  className="w-full h-full resize-none bg-transparent border-0 rounded-none p-4 font-mono text-sm leading-relaxed focus-visible:ring-0 text-muted-foreground focus:text-foreground selection:bg-primary/20 placeholder:text-muted-foreground/30"
                  spellCheck={false}
                  disabled={isAnalyzing}
                />
              </div>

              <div className="p-4 border-t border-border bg-muted/10">
                <Button 
                  data-testid="button-analyze"
                  onClick={handleAnalyze} 
                  disabled={!logs.trim() || isAnalyzing || isComplete}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide h-12 shadow-[0_0_20px_-5px_hsl(var(--primary))]"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ANALYZING PATTERNS...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      ANALYZE INCIDENT
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          <AnimatePresence>
            {isComplete && result && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="lg:col-span-7 flex flex-col gap-4 overflow-y-auto pr-1"
              >
                <Card className="p-6 border-l-4 border-l-red-500 bg-gradient-to-br from-card to-card/50 shadow-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <AlertTriangle className="h-24 w-24 text-red-500" />
                  </div>
                  <button
                    data-testid="button-copy-root-cause"
                    onClick={() => { navigator.clipboard.writeText(result.rootCause); toast({ title: "Copied", description: "Root cause copied." }); }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground h-7 w-7 rounded flex items-center justify-center hover:bg-muted z-20"
                    title="Copy root cause"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <h2 data-testid="text-root-cause" className="text-xl font-bold font-sans text-foreground flex items-center gap-2">
                        <AlertTriangle className="text-red-500 h-5 w-5" />
                        {result.rootCause.length > 80 ? result.title : result.rootCause}
                      </h2>
                      <div className="flex gap-2 mt-3">
                        <Badge variant="destructive" className="uppercase text-[10px] tracking-wider bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">
                          Severity: {result.severity}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] tracking-wider border-primary/30 text-primary bg-primary/5">
                          Confidence: {result.confidence}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {result.rootCause.length > 80 && (
                    <p className="text-sm text-muted-foreground mt-2 relative z-10">{result.rootCause}</p>
                  )}
                </Card>

                <Card className="p-0 overflow-hidden border-border bg-card/50 backdrop-blur-sm relative group">
                  <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                    <Search className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Key Evidence</span>
                    <button
                      data-testid="button-copy-evidence"
                      onClick={() => { navigator.clipboard.writeText(result.evidence.join("\n")); toast({ title: "Copied", description: "All evidence copied." }); }}
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground h-6 w-6 rounded flex items-center justify-center hover:bg-muted"
                      title="Copy all evidence"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="p-4 space-y-2 bg-black/40 font-mono text-xs">
                    {result.evidence.map((line, i) => (
                      <div key={i} className="text-red-300/90 border-l-2 border-red-500/50 pl-3 py-1 break-all group/line relative">
                        {line}
                        <button
                          onClick={() => { navigator.clipboard.writeText(line); toast({ title: "Copied", description: "Evidence line copied." }); }}
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
                    <code className="text-sm font-mono text-emerald-100 block whitespace-pre-wrap">
                      {result.fix}
                    </code>
                    <Button 
                      data-testid="button-copy-fix"
                      onClick={copyToClipboard}
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 hover:bg-emerald-500/20 hover:text-emerald-400"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>

                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between mt-2">
                    <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Recommended Actions
                    </h3>
                    <span className="text-xs font-mono text-muted-foreground">
                      {(result.completedSteps || []).length}/{result.nextSteps.length} done
                    </span>
                  </div>
                  {result.nextSteps.map((step, i) => {
                    const isDone = (result.completedSteps || []).includes(i);
                    const isExpanded = expandedStep === i;
                    const hasGuidance = !!guidanceData[i];
                    const isLoadingThis = loadingGuidance === i;

                    return (
                      <div key={i}>
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 + 0.3 }}
                          className={`bg-card border rounded-lg transition-all ${isDone ? "border-emerald-500/30 bg-emerald-500/5" : isExpanded ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/5"}`}
                        >
                          <div className="p-4 flex items-center gap-3 group">
                            <button
                              data-testid={`button-toggle-step-${i}`}
                              onClick={() => handleStepToggle(i)}
                              className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-colors border ${isDone ? "bg-emerald-500 border-emerald-500 text-white" : "bg-muted border-border hover:border-primary hover:bg-primary/20"}`}
                            >
                              {isDone ? <Check className="h-3 w-3" /> : <span className="text-xs font-mono">{i + 1}</span>}
                            </button>
                            <span className={`text-sm font-medium flex-1 ${isDone ? "line-through text-muted-foreground" : ""}`}>{step}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                data-testid={`button-copy-step-${i}`}
                                onClick={(e) => { e.stopPropagation(); copyStepToClipboard(step); }}
                                className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title="Copy action"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <div className="px-4 pb-3">
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
                                    onClick={() => { if (guidanceData[i]) copyStepToClipboard(guidanceData[i]); }}
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
                                  <>
                                    <div className="max-h-[400px] overflow-y-auto text-xs leading-relaxed pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent prose prose-sm prose-invert max-w-none">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {guidanceData[i]}
                                      </ReactMarkdown>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                                      {!isDone && (
                                        <Button
                                          variant="default"
                                          size="sm"
                                          className="w-full text-xs font-mono bg-emerald-600 hover:bg-emerald-700"
                                          onClick={() => {
                                            toggleStepMutation.mutate({ incidentId: result.id, stepIndex: i });
                                            toast({ title: "Step marked as complete!" });
                                          }}
                                        >
                                          <CheckCircle2 className="h-3 w-3 mr-2" />
                                          Mark Step as Complete
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs font-mono"
                                        onClick={() => navigate(`/incidents/${result.id}/chat?step=${i}`)}
                                      >
                                        <MessageSquare className="h-3 w-3 mr-2" />
                                        Ask Follow-up Questions
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  {result.nextSteps.length > 0 && (
                    <Button 
                      data-testid="button-view-incident-detail"
                      variant="outline" 
                      onClick={() => navigate(`/incidents/${result.id}`)}
                      className="font-mono text-xs border-primary/20 text-primary hover:bg-primary/10 mt-2"
                    >
                      <ExternalLink className="mr-2 h-3 w-3" />
                      VIEW FULL INCIDENT DETAILS
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}