import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [logs, setLogs] = useState("");
  const [result, setResult] = useState<Incident | null>(null);

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
      <div className="flex-1 overflow-y-auto p-8 relative z-10">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 font-sans text-foreground">
              Incident Analysis
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              Paste logs below to identify root cause and generate fixes.
            </p>
          </div>
          {isComplete && (
            <Button variant="outline" onClick={handleReset} className="font-mono text-xs border-primary/20 text-primary hover:bg-primary/10">
              <Terminal className="mr-2 h-3 w-3" />
              NEW SESSION
            </Button>
          )}
        </header>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
          <div className={`transition-all duration-500 ease-in-out ${isComplete ? "lg:col-span-5" : "lg:col-span-12"}`}>
            <div className="mb-4 font-mono text-xs text-muted-foreground flex items-center gap-2 px-1 opacity-70">
              <span className="text-green-500">$</span>
              <span>incident analyze</span>
              <span className="text-yellow-500">build.log</span>
              <span className="animate-pulse">_</span>
            </div>

            <Card className="h-[60vh] bg-card/80 backdrop-blur-md border-border flex flex-col overflow-hidden shadow-2xl relative group">
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
                <Card className="p-6 border-l-4 border-l-red-500 bg-gradient-to-br from-card to-card/50 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <AlertTriangle className="h-24 w-24 text-red-500" />
                  </div>
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

                <Card className="p-0 overflow-hidden border-border bg-card/50 backdrop-blur-sm">
                  <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                    <Search className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Key Evidence</span>
                  </div>
                  <div className="p-4 space-y-2 bg-black/40 font-mono text-xs">
                    {result.evidence.map((line, i) => (
                      <div key={i} className="text-red-300/90 border-l-2 border-red-500/50 pl-3 py-1 break-all">
                        {line}
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
                    return (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 + 0.3 }}
                        className={`bg-card border p-4 rounded-lg flex items-center gap-3 transition-all group ${isDone ? "border-emerald-500/30 bg-emerald-500/5" : "border-border hover:border-primary/50 hover:bg-accent/5"}`}
                      >
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
                      </motion.div>
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