import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { 
  Activity, 
  Terminal, 
  Clock, 
  LogOut,
  Command,
  Search,
  History,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Incident } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface LayoutProps {
  children: React.ReactNode;
  onIncidentSelect?: (id: string) => void;
}

export default function Layout({ children, onIncidentSelect }: LayoutProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();

  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
    refetchInterval: 10000,
  });

  const recentIncidents = incidents.slice(0, 6);

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-foreground">
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
            <Link href="/" className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location === "/" 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                <Command className="h-4 w-4" />
                New Analysis
            </Link>
            <Link href="/dashboard" className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location === "/dashboard" 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                <Activity className="h-4 w-4" />
                Dashboard
            </Link>
            <Link href="/history" className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location === "/history" 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                <History className="h-4 w-4" />
                History
            </Link>
            <Link href="/profile" className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location === "/profile" 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                <User className="h-4 w-4" />
                Profile
            </Link>
          </nav>

          <div className="px-4 mb-2 text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Recent Incidents</span>
            <Search className="h-3 w-3 cursor-pointer hover:text-foreground" />
          </div>
          <div className="space-y-1 px-2">
            {recentIncidents.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">No incidents yet. Analyze some logs to get started.</p>
            )}
            {recentIncidents.map((item) => (
              <div 
                key={item.id} 
                data-testid={`card-incident-${item.id}`}
                onClick={() => {
                  if (onIncidentSelect && location === "/") {
                    onIncidentSelect(item.id);
                  } else {
                    navigate(`/incidents/${item.id}`);
                  }
                }}
                className="group flex flex-col gap-1 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-primary/80">{item.id.slice(0, 8)}</span>
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    item.severity === "critical" ? "bg-red-500 animate-pulse" : 
                    item.severity === "high" ? "bg-amber-500" : "bg-emerald-500"
                  )} />
                </div>
                <span className="text-sm font-medium truncate">{item.title}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-border bg-card/30">
          <div className="flex items-center gap-3">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="" className="h-8 w-8 rounded border border-primary/30 object-cover" />
            ) : (
              <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center border border-primary/30 text-primary font-bold text-xs">
                {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.firstName ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}` : user?.email || "Operator"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || "System Admin"}</p>
            </div>
            <button
              data-testid="button-logout"
              onClick={() => logout()}
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none" style={{background: "radial-gradient(circle 800px at 50% -20%, hsl(var(--primary) / 0.05), transparent)"}} />
        {children}
      </main>
    </div>
  );
}
