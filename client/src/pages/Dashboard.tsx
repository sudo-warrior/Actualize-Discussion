import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  BarChart,
  Bar,
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
  Database,
  Globe,
  Shield,
  Zap
} from "lucide-react";

// Mock Data
const VOLUME_DATA = [
  { time: "00:00", incidents: 2, auto_resolved: 1 },
  { time: "04:00", incidents: 1, auto_resolved: 1 },
  { time: "08:00", incidents: 8, auto_resolved: 5 },
  { time: "12:00", incidents: 12, auto_resolved: 8 },
  { time: "16:00", incidents: 9, auto_resolved: 6 },
  { time: "20:00", incidents: 4, auto_resolved: 3 },
  { time: "24:00", incidents: 3, auto_resolved: 2 },
];

const SEVERITY_DATA = [
  { name: "Critical", count: 12, fill: "hsl(0 62.8% 30.6%)" },
  { name: "High", count: 24, fill: "hsl(30 80% 55%)" },
  { name: "Medium", count: 45, fill: "hsl(220 70% 50%)" },
  { name: "Low", count: 86, fill: "hsl(160 60% 45%)" },
];

const SYSTEM_STATUS = [
  { name: "API Gateway", status: "operational", latency: "45ms", uptime: "99.99%" },
  { name: "Auth Service", status: "operational", latency: "12ms", uptime: "99.95%" },
  { name: "Payment Processor", status: "degraded", latency: "850ms", uptime: "98.20%" },
  { name: "Search Engine", status: "operational", latency: "120ms", uptime: "99.90%" },
  { name: "Notification Svc", status: "operational", latency: "24ms", uptime: "99.99%" },
];

export default function Dashboard() {
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

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Incidents", value: "3", change: "-2", trend: "down", icon: AlertTriangle, color: "text-red-500" },
            { label: "Mean Time to Resolve", value: "14m", change: "-12%", trend: "down", icon: Clock, color: "text-blue-500" },
            { label: "Auto-Resolution Rate", value: "64%", change: "+5%", trend: "up", icon: Zap, color: "text-amber-500" },
            { label: "System Uptime", value: "99.92%", change: "+0.01%", trend: "up", icon: Activity, color: "text-emerald-500" },
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
          {/* Main Chart */}
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
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
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
                  <Area 
                    type="monotone" 
                    dataKey="incidents" 
                    name="Total Incidents"
                    stroke="hsl(220 70% 50%)" 
                    fillOpacity={1} 
                    fill="url(#colorIncidents)" 
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="auto_resolved" 
                    name="Auto-Resolved"
                    stroke="hsl(160 60% 45%)" 
                    fillOpacity={1} 
                    fill="url(#colorResolved)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Service Health List */}
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
                  <div className="text-right">
                    <Badge variant="outline" className={`font-mono text-[10px] ${service.status === 'operational' ? 'text-emerald-500 border-emerald-500/20' : 'text-amber-500 border-amber-500/20'}`}>
                      {service.uptime}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-muted/10 text-center border-t border-border">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary w-full h-8">
                View All Services
              </Button>
            </div>
          </Card>
        </div>

        {/* Recent Activity Feed */}
        <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Activity Feed
        </h3>
        <Card className="bg-card/50 border-border overflow-hidden">
          <div className="divide-y divide-border">
            {[
              { action: "Incident Resolved", target: "Redis Connection Timeout", user: "Operator_01", time: "10m ago", icon: CheckCircle2, color: "text-emerald-500" },
              { action: "New Alert", target: "High CPU Usage (Worker Node 4)", user: "System", time: "25m ago", icon: AlertTriangle, color: "text-red-500" },
              { action: "Configuration Change", target: "Updated retention policy", user: "DevOps_Lead", time: "1h ago", icon: Settings, color: "text-blue-500" },
              { action: "Deployment", target: "v2.4.0 (Hotfix)", user: "CI/CD Pipeline", time: "2h ago", icon: Zap, color: "text-purple-500" },
            ].map((item, i) => (
              <div key={i} className="p-4 flex items-center gap-4 hover:bg-muted/10 transition-colors">
                <div className={`p-2 rounded-full bg-muted/50 ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    <span className={item.color}>{item.action}</span>: {item.target}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    by {item.user} • {item.time}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0">
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
}

// Temporary icon import for mocked data
import { Settings } from "lucide-react";