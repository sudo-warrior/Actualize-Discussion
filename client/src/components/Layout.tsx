import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Activity, 
  Terminal, 
  Clock, 
  ShieldAlert, 
  Settings, 
  LogOut, 
  Command,
  Search,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data for History
export const HISTORY_ITEMS = [
  { id: "inc-109", title: "Redis Connection Timeout", status: "resolved", time: "2h ago", type: "db" },
  { id: "inc-108", title: "Payment Gateway 502", status: "critical", time: "5h ago", type: "api" },
  { id: "inc-107", title: "Memory Leak in Worker", status: "resolved", time: "1d ago", type: "system" },
  { id: "inc-106", title: "Auth Token Expiry", status: "resolved", time: "2d ago", type: "auth" },
];

interface LayoutProps {
  children: React.ReactNode;
  onIncidentSelect?: (id: string) => void;
}

export default function Layout({ children, onIncidentSelect }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-sm flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <Terminal className="h-6 w-6" />
            <span className="font-bold text-lg tracking-tight">INCIDENT<span className="text-muted-foreground">.CMD</span></span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2 text-xs font-mono text-muted-foreground uppercase tracking-wider">Menu</div>
          <nav className="space-y-1 px-2 mb-8">
            <Link href="/">
              <a className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location === "/" 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                <Command className="h-4 w-4" />
                New Analysis
              </a>
            </Link>
            <Link href="/dashboard">
              <a className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location === "/dashboard" 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                <Activity className="h-4 w-4" />
                Dashboard
              </a>
            </Link>
          </nav>

          <div className="px-4 mb-2 text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Recent Incidents</span>
            <Search className="h-3 w-3 cursor-pointer hover:text-foreground" />
          </div>
          <div className="space-y-1 px-2">
            {HISTORY_ITEMS.map((item) => (
              <div 
                key={item.id} 
                onClick={() => onIncidentSelect?.(item.id)}
                className="group flex flex-col gap-1 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-primary/80">{item.id}</span>
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    item.status === "critical" ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                  )} />
                </div>
                <span className="text-sm font-medium truncate">{item.title}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-border bg-card/30">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center border border-primary/30 text-primary font-bold">
              OP
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Operator_01</p>
              <p className="text-xs text-muted-foreground truncate">System Admin</p>
            </div>
            <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute inset-0 bg-radial-[circle_800px_at_50%_-20%] from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        {children}
      </main>
    </div>
  );
}