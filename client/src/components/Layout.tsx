import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Activity, 
  Terminal, 
  Clock, 
  LogOut,
  Command,
  Search,
  History,
  User,
  Menu,
  X,
  BookOpen,
  Settings,
  ChevronDown
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
    refetchInterval: 10000,
  });

  const filteredIncidents = searchQuery
    ? incidents.filter(i => 
        i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.rawLogs.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : incidents;

  const recentIncidents = filteredIncidents.slice(0, 6);

  const handleNavClick = () => setMobileOpen(false);

  const handleIncidentClick = (item: Incident) => {
    setMobileOpen(false);
    if (onIncidentSelect && location === "/") {
      onIncidentSelect(item.id);
    } else {
      navigate(`/incidents/${item.id}`);
    }
  };

  const sidebarContent = (
    <>
      <div className="p-4 md:p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Terminal className="h-5 w-5 md:h-6 md:w-6" />
          <span className="font-bold text-lg tracking-tight">INCIDENT<span className="text-muted-foreground">.CMD</span></span>
        </div>
        <button
          data-testid="button-close-mobile-menu"
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-2 text-xs font-mono text-muted-foreground uppercase tracking-wider">Menu</div>
        <nav className="space-y-1 px-2 mb-8">
          <Link href="/" onClick={handleNavClick} className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              location === "/" 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}>
              <Command className="h-4 w-4" />
              New Analysis
          </Link>
          <Link href="/dashboard" onClick={handleNavClick} className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              location === "/dashboard" 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}>
              <Activity className="h-4 w-4" />
              Dashboard
          </Link>
          <Link href="/history" onClick={handleNavClick} className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              location === "/history" 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}>
              <History className="h-4 w-4" />
              History
          </Link>
          <Link href="/docs" onClick={handleNavClick} className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              location === "/docs" 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}>
              <BookOpen className="h-4 w-4" />
              API Docs
          </Link>
        </nav>

        <div className="px-4 mb-2 text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
          <span>Recent Incidents</span>
          <Search 
            className="h-3 w-3 cursor-pointer hover:text-foreground transition-colors" 
            onClick={() => setShowSearch(!showSearch)}
          />
        </div>
        {showSearch && (
          <div className="px-4 mb-2">
            <input
              type="text"
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:border-primary font-mono"
              autoFocus
            />
          </div>
        )}
        <div className="space-y-1 px-2">
          {recentIncidents.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-4 text-center">No incidents yet. Analyze some logs to get started.</p>
          )}
          {recentIncidents.map((item) => (
            <div 
              key={item.id} 
              data-testid={`card-incident-${item.id}`}
              onClick={() => handleIncidentClick(item)}
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
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center gap-3 hover:bg-muted/50 p-2 rounded-md transition-colors">
            {user?.user_metadata?.profileImageUrl ? (
              <img src={user.user_metadata.profileImageUrl} alt="" className="h-8 w-8 rounded border border-primary/30 object-cover" />
            ) : (
              <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center border border-primary/30 text-primary font-bold text-xs">
                {(user?.user_metadata?.firstName?.[0] || user?.email?.[0] || "?").toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate">
                {user?.user_metadata?.firstName ? `${user.user_metadata.firstName}${user.user_metadata.lastName ? ` ${user.user_metadata.lastName}` : ""}` : user?.email || ""}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => window.location.href = "/profile"}>
              <Settings className="h-4 w-4 mr-2" />
              Profile & Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-foreground">
      <aside className="hidden md:flex w-64 border-r border-border bg-card/50 backdrop-blur-sm flex-col">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm z-10">
          <button
            data-testid="button-open-mobile-menu"
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-primary">
            <Terminal className="h-4 w-4" />
            <span className="font-bold text-sm tracking-tight">INCIDENT<span className="text-muted-foreground">.CMD</span></span>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none" style={{background: "radial-gradient(circle 800px at 50% -20%, hsl(var(--primary) / 0.05), transparent)"}} />
          {children}
        </div>
      </main>
    </div>
  );
}
