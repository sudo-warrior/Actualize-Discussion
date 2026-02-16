import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Terminal, 
  Zap, 
  Shield, 
  Activity,
  ArrowRight,
  Command,
  Lock,
  Search
} from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none" style={{background: "radial-gradient(circle 800px at 50% -20%, hsl(var(--primary) / 0.08), transparent)"}} />

      <nav className="relative z-10 border-b border-border/50 backdrop-blur-md bg-background/80">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Terminal className="h-5 w-5" />
            <span className="font-bold text-lg tracking-tight">INCIDENT<span className="text-muted-foreground">.CMD</span></span>
          </div>
          <Link href="/login">
            <Button data-testid="button-login" className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-sm shadow-[0_0_15px_-3px_hsl(var(--primary))]">
              <Lock className="mr-2 h-3.5 w-3.5" />
              SIGN IN
            </Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center mb-10 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono mb-8">
            <Zap className="h-3 w-3" />
            AI-POWERED INCIDENT ANALYSIS
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-4 md:mb-6 leading-tight">
            Decode Errors.<br />
            <span className="text-primary">Resolve Faster.</span>
          </h1>

          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed px-2">
            Paste your server logs, stack traces, or error output. Our AI identifies root causes, 
            assigns severity, and generates actionable remediation steps in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/login">
              <Button data-testid="button-get-started" size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide h-14 px-8 text-base shadow-[0_0_30px_-5px_hsl(var(--primary))]">
                GET STARTED
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-emerald-500" />
              Free to use
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-emerald-500" />
              Secure login
            </span>
          </div>
        </div>

        <div className="max-w-5xl w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 px-2">
          {[
            {
              icon: Search,
              title: "Paste & Analyze",
              description: "Drop in raw logs, stack traces, or terminal output. Our AI scans for patterns across 100+ known incident types."
            },
            {
              icon: Command,
              title: "Root Cause Detection",
              description: "Get a structured diagnosis with severity level, confidence score, and the exact evidence from your logs."
            },
            {
              icon: Activity,
              title: "Track & Resolve",
              description: "Every analysis is stored in your incident history. Monitor trends and track resolution across your systems."
            },
          ].map((feature, i) => (
            <Card 
              key={i} 
              className="p-6 bg-card/30 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 group"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div className="mt-12 md:mt-20 max-w-3xl w-full px-2">
          <Card className="p-1 bg-card/50 border-border/50 overflow-hidden">
            <div className="p-3 border-b border-border/50 flex items-center gap-2 bg-muted/20">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/30 border border-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/30 border border-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/30 border border-green-500/50" />
              </div>
              <span className="text-xs font-mono text-muted-foreground ml-2">terminal — incident-cmd</span>
            </div>
            <div className="p-6 font-mono text-sm space-y-2 bg-black/40">
              <div className="text-muted-foreground">
                <span className="text-green-500">$</span> incident analyze production.log
              </div>
              <div className="text-amber-400/80">
                [WARN] QueuePool limit exceeded — 15/15 connections in use
              </div>
              <div className="text-red-400/80">
                [ERROR] sqlalchemy.exc.TimeoutError: QueuePool limit reached
              </div>
              <div className="text-muted-foreground mt-4">
                <span className="text-emerald-500">✓</span> Root Cause: <span className="text-foreground">Database Connection Pool Exhaustion</span>
              </div>
              <div className="text-muted-foreground">
                <span className="text-emerald-500">✓</span> Severity: <span className="text-red-400">CRITICAL</span> | Confidence: <span className="text-primary">94%</span>
              </div>
              <div className="text-muted-foreground">
                <span className="text-emerald-500">✓</span> Fix: <span className="text-foreground">Increase pool_size and max_overflow in DB config</span>
              </div>
              <div className="text-muted-foreground animate-pulse">_</div>
            </div>
          </Card>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/50 py-6 text-center text-xs text-muted-foreground font-mono">
        INCIDENT.CMD &copy; {new Date().getFullYear()} — AI-Powered Incident Analysis
      </footer>
    </div>
  );
}
