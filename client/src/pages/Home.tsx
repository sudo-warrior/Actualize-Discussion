import { useState, useEffect } from "react";
import Layout, { HISTORY_ITEMS } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Terminal, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Cpu, 
  ArrowRight,
  Loader2,
  FileText,
  Code,
  Search,
  Activity,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Types
type AnalysisState = "idle" | "analyzing" | "complete";

type AnalysisResult = {
  rootCause: string;
  confidence: number;
  severity: "low" | "medium" | "high" | "critical";
  evidence: string[];
  fix: string;
  nextSteps: string[];
};

// Mock results for history items
const HISTORY_RESULTS: Record<string, AnalysisResult> = {
  "inc-109": {
    rootCause: "Redis Connection Timeout",
    confidence: 98,
    severity: "medium",
    evidence: [
      "Error: Redis connection to 127.0.0.1:6379 failed - connect ECONNREFUSED",
      "at RedisClient.onError (node_modules/redis/index.js:12)"
    ],
    fix: "Check if Redis service is running. If running, verify the port binding in `redis.conf` matches the application config.",
    nextSteps: [
      "sudo systemctl status redis",
      "Verify firewall rules for port 6379",
      "Check application .env configuration"
    ]
  },
  "inc-108": {
    rootCause: "Payment Gateway 502 Bad Gateway",
    confidence: 89,
    severity: "critical",
    evidence: [
      "Upstream prematurely closed connection while reading response header from upstream",
      "client: 10.0.0.5, server: api.payments.com, request: \"POST /v1/charge HTTP/1.1\""
    ],
    fix: "The upstream payment provider is experiencing downtime or high latency. Implement circuit breaker pattern.",
    nextSteps: [
      "Check status page of payment provider",
      "Enable fallback payment route",
      "Review Nginx proxy timeout settings"
    ]
  },
  "inc-107": {
    rootCause: "Memory Leak in Worker Process",
    confidence: 92,
    severity: "high",
    evidence: [
      "FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory",
      "Last few GCs: ... 2048MB -> 2040MB"
    ],
    fix: "The worker process is consuming all available heap memory. Inspect `worker.ts` for unclosed streams or large object retention.",
    nextSteps: [
      "Increase --max-old-space-size as temporary fix",
      "Run heap profile using `node --inspect`",
      "Check for large file processing in memory"
    ]
  },
  "inc-106": {
    rootCause: "JWT Token Expiration",
    confidence: 99,
    severity: "medium",
    evidence: [
      "jwt expired at 2023-10-25T10:00:00.000Z",
      "UnauthorizedError: No authorization token was found"
    ],
    fix: "The client's refresh token logic is failing to renew the access token before it expires.",
    nextSteps: [
      "Check client-side token refresh interceptor",
      "Verify server time synchronization (NTP)",
      "Ask user to re-login to clear stale state"
    ]
  }
};

export default function Home() {
  const { toast } = useToast();
  const [logs, setLogs] = useState("");
  const [status, setStatus] = useState<AnalysisState>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = () => {
    if (!logs.trim()) return;
    
    setStatus("analyzing");
    
    // Simulate AI analysis delay
    setTimeout(() => {
      setResult({
        rootCause: "Database Connection Pool Exhaustion",
        confidence: 94,
        severity: "high",
        evidence: [
          "TimeoutError: QueuePool limit of size 5 overflow 10 reached, connection timed out, timeout 30.00",
          "at sqlalchemy.pool.impl.QueuePool._do_get (pool.py:134)"
        ],
        fix: "Increase the `pool_size` and `max_overflow` parameters in your SQLAlchemy configuration.",
        nextSteps: [
          "Update `database.py` configuration",
          "Restart the application service",
          "Monitor active connections in Grafana"
        ]
      });
      setStatus("complete");
    }, 2500);
  };

  const handleReset = () => {
    setLogs("");
    setStatus("idle");
    setResult(null);
  };

  const handleIncidentSelect = (id: string) => {
    const historicalResult = HISTORY_RESULTS[id];
    if (historicalResult) {
      // Simulate loading a past incident
      setLogs(`[${new Date().toISOString()}] Loading historical data for ${id}...\n[SYSTEM] Retrieving logs from archive...`);
      setStatus("analyzing");
      setTimeout(() => {
        setLogs(`[LOG_DUMP_RESTORED] ${id}\n\n${historicalResult.evidence.join("\n")}\n... (full logs truncated)`);
        setResult(historicalResult);
        setStatus("complete");
      }, 800);
    }
  };

  const copyToClipboard = () => {
    if (result?.fix) {
      navigator.clipboard.writeText(result.fix);
      toast({
        title: "Copied to clipboard",
        description: "The fix command has been copied to your clipboard.",
      });
    }
  };

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
          {status === "complete" && (
            <Button variant="outline" onClick={handleReset} className="font-mono text-xs border-primary/20 text-primary hover:bg-primary/10">
              <Terminal className="mr-2 h-3 w-3" />
              NEW SESSION
            </Button>
          )}
        </header>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
          
          {/* Input Section */}
          <div className={`transition-all duration-500 ease-in-out ${status === "complete" ? "lg:col-span-5" : "lg:col-span-12"}`}>
            
            {/* CLI Command Preview - Branding */}
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
                  value={logs}
                  onChange={(e) => setLogs(e.target.value)}
                  placeholder="Paste stack traces, error logs, or terminal output here..."
                  className="w-full h-full resize-none bg-transparent border-0 rounded-none p-4 font-mono text-sm leading-relaxed focus-visible:ring-0 text-muted-foreground focus:text-foreground selection:bg-primary/20 placeholder:text-muted-foreground/30"
                  spellCheck={false}
                  disabled={status === "analyzing"}
                />
              </div>

              <div className="p-4 border-t border-border bg-muted/10">
                <Button 
                  onClick={handleAnalyze} 
                  disabled={!logs.trim() || status !== "idle"}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide h-12 shadow-[0_0_20px_-5px_hsl(var(--primary))]"
                >
                  {status === "analyzing" ? (
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

          {/* Results Section */}
          <AnimatePresence>
            {status === "complete" && result && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="lg:col-span-7 flex flex-col gap-4 overflow-y-auto pr-1"
              >
                {/* Summary Card */}
                <Card className="p-6 border-l-4 border-l-red-500 bg-gradient-to-br from-card to-card/50 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <AlertTriangle className="h-24 w-24 text-red-500" />
                  </div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <h2 className="text-xl font-bold font-sans text-foreground flex items-center gap-2">
                        <AlertTriangle className="text-red-500 h-5 w-5" />
                        {result.rootCause}
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
                </Card>

                {/* Evidence Card */}
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

                {/* Solution Card */}
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
                      onClick={copyToClipboard}
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 hover:bg-emerald-500/20 hover:text-emerald-400"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>

                {/* Action Plan */}
                <div className="grid grid-cols-1 gap-3">
                  <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2 mt-2">
                    <Activity className="h-4 w-4" /> Recommended Actions
                  </h3>
                  {result.nextSteps.map((step, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 + 0.3 }}
                      className="bg-card border border-border p-4 rounded-lg flex items-center gap-3 hover:border-primary/50 transition-colors group cursor-pointer hover:bg-accent/5"
                    >
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-mono group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium">{step}</span>
                      <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}