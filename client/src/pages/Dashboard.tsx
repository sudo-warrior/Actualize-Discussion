import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { Incident } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
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
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight,
  Server,
  Zap,
  Settings
} from "lucide-react";

const VOLUME_DATA = [
  { time: "00:00", incidents: 2, auto_resolved: 1 },
  { time: "04:00", incidents: 1, auto_resolved: 1 },
  { time: "08:00", incidents: 8, auto_resolved: 5 },
  { time: "12:00", incidents: 12, auto_resolved: 8 },
  { time: "16:00", incidents: 9, auto_resolved: 6 },
  { time: "20:00", incidents: 4, auto_resolved: 3 },
  { time: "24:00", incidents: 3, auto_resolved: 2 },
];

const SYSTEM_STATUS = [
  { name: "API Gateway", status: "operational", latency: "45ms", uptime: "99.99%" },
  { name: "Auth Service", status: "operational", latency: "12ms", uptime: "99.95%" },
  { name: "Payment Processor", status: "degraded", latency: "850ms", uptime: "98.20%" },
  { name: "Search Engine", status: "operational", latency: "120ms", uptime: "99.90%" },
  { name: "Notification Svc", status: "operational", latency: "24ms", uptime: "99.99%" },
];

export default function Dashboard() {
  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
    refetchInterval: 10000,
  });

  const totalIncidents = incidents.length;
  const criticalCount = incidents.filter(i => i.severity === "critical").length;
  const highCount = incidents.filter(i => i.severity === "high").length;
  const avgConfidence = totalIncidents > 0 
    ? Math.round(incidents.reduce((sum, i) => sum + i.confidence, 0) / totalIncidents) 
    : 0;

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-8 relative z-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 font-sans text-foreground">
              System Overview
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              Real-time monitoring and incident metrics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono bg-green-500/10 text-green-500 border-green-500/20 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
              SYSTEMS OPERATIONAL
            </Badge>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Incidents", value: String(totalIncidents), change: totalIncidents > 0 ? `${totalIncidents} total` : "none", trend: "up" as const, icon: AlertTriangle, color: "text-red-500" },
            { label: "Critical Issues", value: String(criticalCount), change: criticalCount > 0 ? "needs attention" : "all clear", trend: criticalCount > 0 ? "up" as const : "down" as const, icon: Clock, color: "text-blue-500" },
            { label: "Avg. Confidence", value: avgConfidence > 0 ? `${avgConfidence}%` : "—", change: avgConfidence >= 85 ? "high accuracy" : "building data", trend: "up" as const, icon: Zap, color: "text-amber-500" },
            { label: "System Uptime", value: "99.92%", change: "+0.01%", trend: "up" as const, icon: Activity, color: "text-emerald-500" },
          ].map((stat, i) => (
            <Card key={i} className="p-4 bg-card/50 backdrop-blur-sm border-border hover:border-primary/30 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-sans">{stat.value}</span>
                <span className={`text-xs flex items-center ${stat.trend === "up" ? "text-emerald-500" : "text-red-500"}`}>
                  {stat.trend === "up" ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {stat.change}
                </span>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 p-6 bg-card/50 border-border">
            <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Incident Volume (24h)
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={VOLUME_DATA}>
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
                  <Area type="monotone" dataKey="auto_resolved" name="Auto-Resolved" stroke="hsl(160 60% 45%)" fillOpacity={1} fill="url(#colorResolved)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-0 bg-card/50 border-border overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Server className="h-4 w-4" /> Service Health
              </h3>
            </div>
            <div className="divide-y divide-border">
              {SYSTEM_STATUS.map((service, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${service.status === 'operational' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`} />
                    <div>
                      <p className="text-sm font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{service.latency}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`font-mono text-[10px] ${service.status === 'operational' ? 'text-emerald-500 border-emerald-500/20' : 'text-amber-500 border-amber-500/20'}`}>
                    {service.uptime}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent Incidents from DB */}
        <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Recent Analyses
        </h3>
        <Card className="bg-card/50 border-border overflow-hidden">
          {incidents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No incidents analyzed yet. Go to <span className="text-primary">New Analysis</span> to get started.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {incidents.slice(0, 8).map((incident) => (
                <div key={incident.id} className="p-4 flex items-center gap-4 hover:bg-muted/10 transition-colors">
                  <div className={`p-2 rounded-full bg-muted/50 ${
                    incident.severity === "critical" ? "text-red-500" : 
                    incident.severity === "high" ? "text-amber-500" : 
                    incident.severity === "medium" ? "text-blue-500" : "text-emerald-500"
                  }`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {incident.title}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {incident.severity.toUpperCase()} • {incident.confidence}% confidence • {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-mono ${
                    incident.severity === "critical" ? "text-red-500 border-red-500/20" : 
                    incident.severity === "high" ? "text-amber-500 border-amber-500/20" : 
                    "text-blue-500 border-blue-500/20"
                  }`}>
                    {incident.severity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}