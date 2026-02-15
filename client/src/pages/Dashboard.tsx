import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Incident } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend
} from "recharts";
import { useLocation } from "wouter";
import { 
  Activity, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight,
  Zap,
  Loader2,
  ChevronRight
} from "lucide-react";

type DashboardStats = {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  avgConfidence: number;
  volumeData: { time: string; incidents: number; auto_resolved: number }[];
  recentIncidents: Incident[];
};

export default function Dashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["/api/incidents/stats/summary"],
    refetchInterval: 15000,
  });

  if (error && isUnauthorizedError(error as Error)) {
    toast({ title: "Session expired", description: "Redirecting to login...", variant: "destructive" });
    setTimeout(() => { window.location.href = "/api/login"; }, 500);
  }

  const total = stats?.total ?? 0;
  const critical = stats?.critical ?? 0;
  const avgConfidence = stats?.avgConfidence ?? 0;
  const volumeData = stats?.volumeData ?? [];
  const recentIncidents = stats?.recentIncidents ?? [];

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
        <header className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 md:mb-2 font-sans text-foreground">
              System Overview
            </h1>
            <p className="text-muted-foreground font-mono text-xs md:text-sm">
              Your incident history and analysis metrics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Badge variant="outline" className="font-mono bg-green-500/10 text-green-500 border-green-500/20 px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
                LIVE
              </Badge>
            )}
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          {[
            { label: "Total Incidents", value: String(total), change: total > 0 ? `${total} analyzed` : "none yet", trend: "up" as const, icon: AlertTriangle, color: "text-red-500" },
            { label: "Critical Issues", value: String(critical), change: critical > 0 ? "needs attention" : "all clear", trend: critical > 0 ? "up" as const : "down" as const, icon: Clock, color: "text-blue-500" },
            { label: "Avg. Confidence", value: avgConfidence > 0 ? `${avgConfidence}%` : "--", change: avgConfidence >= 85 ? "high accuracy" : "building data", trend: "up" as const, icon: Zap, color: "text-amber-500" },
            { label: "High Severity", value: String(stats?.high ?? 0), change: (stats?.high ?? 0) > 0 ? "investigate" : "none", trend: (stats?.high ?? 0) > 0 ? "up" as const : "down" as const, icon: Activity, color: "text-emerald-500" },
          ].map((stat, i) => (
            <Card key={i} className="p-4 bg-card/50 backdrop-blur-sm border-border hover:border-primary/30 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="flex items-baseline gap-2">
                <span data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`} className="text-2xl font-bold font-sans">{stat.value}</span>
                <span className={`text-xs flex items-center ${stat.trend === "up" ? "text-emerald-500" : "text-red-500"}`}>
                  {stat.trend === "up" ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {stat.change}
                </span>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="p-6 bg-card/50 border-border">
            <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Incident Volume (24h)
            </h3>
            {volumeData.length > 0 && volumeData.some(v => v.incidents > 0) ? (
              <div className="h-[200px] md:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeData}>
                    <defs>
                      <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(220 70% 50%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(220 70% 50%)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160 60% 45%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(160 60% 45%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px"
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="incidents" name="Total Incidents" stroke="hsl(220 70% 50%)" fillOpacity={1} fill="url(#colorIncidents)" strokeWidth={2} />
                    <Area type="monotone" dataKey="auto_resolved" name="Resolved" stroke="hsl(160 60% 45%)" fillOpacity={1} fill="url(#colorResolved)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] md:h-[300px] w-full flex items-center justify-center text-muted-foreground text-xs md:text-sm text-center px-4">
                No incident data in the last 24 hours. Analyze some logs to see trends.
              </div>
            )}
          </Card>
        </div>

        <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Recent Analyses
        </h3>
        <Card className="bg-card/50 border-border overflow-hidden">
          {recentIncidents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No incidents analyzed yet. Go to <span className="text-primary">New Analysis</span> to get started.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentIncidents.map((incident) => (
                <div key={incident.id} data-testid={`row-incident-${incident.id}`} onClick={() => navigate(`/incidents/${incident.id}`)} className="p-3 md:p-4 flex items-center gap-3 md:gap-4 hover:bg-muted/10 transition-colors cursor-pointer group">
                  <div className={`p-2 rounded-full bg-muted/50 ${
                    incident.severity === "critical" ? "text-red-500" : 
                    incident.severity === "high" ? "text-amber-500" : 
                    incident.severity === "medium" ? "text-blue-500" : "text-emerald-500"
                  }`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium truncate">
                      {incident.title}
                    </p>
                    <p className="text-[10px] md:text-xs text-muted-foreground font-mono mt-0.5">
                      {incident.severity.toUpperCase()} | {incident.confidence}% | {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-mono hidden sm:inline-flex ${
                    incident.severity === "critical" ? "text-red-500 border-red-500/20" : 
                    incident.severity === "high" ? "text-amber-500 border-amber-500/20" : 
                    "text-blue-500 border-blue-500/20"
                  }`}>
                    {incident.severity}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
