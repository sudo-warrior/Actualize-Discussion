import { useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Incident } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import {
  User,
  Mail,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  LogOut,
  ChevronRight,
  BarChart3,
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff
} from "lucide-react";

interface ApiKeyInfo {
  id: string;
  name: string;
  key?: string;
  keyPrefix: string;
  revoked: boolean;
  requestCount: number;
  lastResetDate: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function Profile() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const { data: apiKeys = [] } = useQuery<ApiKeyInfo[]>({
    queryKey: ["/api/keys"],
  });

  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/keys", { name });
      return res.json();
    },
    onSuccess: (data) => {
      setNewlyCreatedKey(data.key);
      setNewKeyName("");
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      toast({ title: "API key revoked", description: "This key can no longer be used." });
    },
  });

  const handleRevokeKey = (keyId: string, keyName: string) => {
    if (window.confirm(`Are you sure you want to revoke "${keyName}"? This action cannot be undone and the key will stop working immediately.`)) {
      revokeKeyMutation.mutate(keyId);
    }
  };
  });

  const handleCopyKey = () => {
    if (newlyCreatedKey) {
      navigator.clipboard.writeText(newlyCreatedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const totalIncidents = incidents.length;
  const criticalCount = incidents.filter(i => i.severity === "critical").length;
  const highCount = incidents.filter(i => i.severity === "high").length;
  const mediumCount = incidents.filter(i => i.severity === "medium").length;
  const lowCount = incidents.filter(i => i.severity === "low").length;
  const resolvedCount = incidents.filter(i => i.status === "resolved").length;
  const avgConfidence = totalIncidents > 0
    ? Math.round(incidents.reduce((sum, i) => sum + i.confidence, 0) / totalIncidents)
    : 0;

  const totalSteps = incidents.reduce((sum, i) => sum + i.nextSteps.length, 0);
  const completedStepCount = incidents.reduce((sum, i) => sum + (i.completedSteps || []).length, 0);
  const actionProgress = totalSteps > 0 ? Math.round((completedStepCount / totalSteps) * 100) : 0;

  const recentIncidents = incidents.slice(0, 5);

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 md:mb-2 font-sans text-foreground">
            Profile
          </h1>
          <p className="text-muted-foreground font-mono text-xs md:text-sm">
            Your account and activity overview.
          </p>
        </header>

        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 pb-20">
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 bg-card/50 border-border text-center">
              {user?.user_metadata?.profileImageUrl ? (
                <img src={user.user_metadata.profileImageUrl} alt="" className="h-20 w-20 rounded-full border-2 border-primary/30 object-cover mx-auto mb-4" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30 text-primary font-bold text-2xl mx-auto mb-4">
                  {(user?.user_metadata?.firstName?.[0] || user?.email?.[0] || "?").toUpperCase()}
                </div>
              )}
              <h2 data-testid="text-user-name" className="text-lg font-bold">
                {user?.user_metadata?.firstName ? `${user.user_metadata.firstName}${user.user_metadata.lastName ? ` ${user.user_metadata.lastName}` : ""}` : user?.email || ""}
              </h2>
              <p className="text-sm text-muted-foreground font-mono mt-1 flex items-center justify-center gap-1">
                <Mail className="h-3 w-3" /> {user?.email || ""}
              </p>
              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  data-testid="button-logout-profile"
                  variant="outline"
                  onClick={() => logout()}
                  className="w-full text-muted-foreground hover:text-foreground font-mono text-xs"
                >
                  <LogOut className="mr-2 h-3 w-3" /> SIGN OUT
                </Button>
              </div>
            </Card>

            <Card className="p-5 bg-card/50 border-border">
              <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" /> Account Info
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member since</span>
                  <span className="font-mono text-xs">
                    {incidents.length > 0
                      ? formatDistanceToNow(new Date(incidents[incidents.length - 1].createdAt), { addSuffix: true })
                      : "Just now"
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auth method</span>
                  <span className="font-mono text-xs">Supabase Auth</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Analyzed", value: totalIncidents, icon: Activity, color: "text-primary" },
                { label: "Critical", value: criticalCount, icon: AlertTriangle, color: "text-red-500" },
                { label: "Resolved", value: resolvedCount, icon: CheckCircle2, color: "text-emerald-500" },
                { label: "Avg Confidence", value: avgConfidence > 0 ? `${avgConfidence}%` : "--", icon: Zap, color: "text-amber-500" },
              ].map((stat) => (
                <Card key={stat.label} className="p-4 bg-card/50 border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <span className="text-xl font-bold">{stat.value}</span>
                </Card>
              ))}
            </div>

            <Card className="p-5 bg-card/50 border-border">
              <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Severity Breakdown
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Critical", count: criticalCount, color: "bg-red-500", textColor: "text-red-500" },
                  { label: "High", count: highCount, color: "bg-amber-500", textColor: "text-amber-500" },
                  { label: "Medium", count: mediumCount, color: "bg-blue-500", textColor: "text-blue-500" },
                  { label: "Low", count: lowCount, color: "bg-emerald-500", textColor: "text-emerald-500" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className={item.textColor}>{item.label}</span>
                      <span className="text-muted-foreground">{item.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all`}
                        style={{ width: totalIncidents > 0 ? `${(item.count / totalIncidents) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 bg-card/50 border-border">
              <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" /> Action Completion
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs font-mono text-muted-foreground mb-1">
                    <span>{completedStepCount} of {totalSteps} actions completed</span>
                    <span>{actionProgress}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${actionProgress}%` }} />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-card/50 border-border border-l-4 border-l-primary/40">
              <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Key className="h-4 w-4" /> API Keys
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Generate API keys to access the developer API programmatically. <span data-testid="link-api-docs" className="text-primary cursor-pointer hover:underline" onClick={() => navigate("/docs")}>View API docs</span>
              </p>

              {newlyCreatedKey && (
                <div className="mb-4 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-xs text-emerald-400 font-mono mb-2">Key created! Copy it now — you won't see it again.</p>
                  <div className="flex items-center gap-2">
                    <code data-testid="text-new-api-key" className="flex-1 text-xs font-mono bg-background/50 p-2 rounded border border-border truncate select-all">{newlyCreatedKey}</code>
                    <Button data-testid="button-copy-api-key" variant="ghost" size="icon" onClick={handleCopyKey} className="shrink-0 h-8 w-8">
                      {copiedKey ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mb-4">
                <Input
                  data-testid="input-api-key-name"
                  placeholder="Key name (e.g. CI/CD Pipeline)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="text-xs font-mono bg-card/50 border-border"
                  onKeyDown={(e) => { if (e.key === "Enter" && newKeyName.trim()) createKeyMutation.mutate(newKeyName.trim()); }}
                />
                <Button
                  data-testid="button-create-api-key"
                  variant="outline"
                  size="sm"
                  disabled={!newKeyName.trim() || createKeyMutation.isPending}
                  onClick={() => createKeyMutation.mutate(newKeyName.trim())}
                  className="shrink-0 font-mono text-xs border-primary/20 text-primary hover:bg-primary/10"
                >
                  <Plus className="h-3 w-3 mr-1" /> Create
                </Button>
              </div>

              {apiKeys.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No API keys yet.</p>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((k) => {
                    const now = new Date();
                    const lastReset = new Date(k.lastResetDate);
                    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
                    const currentCount = hoursSinceReset >= 24 ? 0 : k.requestCount;
                    const remaining = 100 - currentCount;
                    
                    return (
                      <div key={k.id} data-testid={`row-api-key-${k.id}`} className="flex items-center gap-3 p-2 rounded-md bg-muted/10 border border-border/50">
                        <Key className={`h-3.5 w-3.5 shrink-0 ${k.revoked ? "text-muted-foreground" : "text-primary"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium truncate ${k.revoked ? "line-through text-muted-foreground" : ""}`}>{k.name}</span>
                            {k.revoked && <Badge variant="outline" className="text-[9px] text-red-400 border-red-400/20">revoked</Badge>}
                            {!k.revoked && (
                              <Badge variant="outline" className={`text-[9px] font-mono ${remaining < 20 ? "text-orange-400 border-orange-400/20" : "text-muted-foreground border-border"}`}>
                                {remaining}/100
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {k.keyPrefix}... · {formatDistanceToNow(new Date(k.createdAt), { addSuffix: true })}
                            {k.lastUsedAt && ` · last used ${formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true })}`}
                          </p>
                        </div>
                        {!k.revoked && (
                          <Button
                            data-testid={`button-revoke-key-${k.id}`}
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRevokeKey(k.id, k.name)}
                            disabled={revokeKeyMutation.isPending}
                          className="h-7 w-7 text-muted-foreground hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-5 bg-card/50 border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Recent Activity
                </h3>
                {incidents.length > 5 && (
                  <Button data-testid="button-view-all-history" variant="ghost" size="sm" onClick={() => navigate("/history")} className="text-xs font-mono text-primary">
                    View All <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
              {recentIncidents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentIncidents.map((incident) => (
                    <div
                      key={incident.id}
                      data-testid={`card-profile-incident-${incident.id}`}
                      onClick={() => navigate(`/incidents/${incident.id}`)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/10 transition-colors cursor-pointer group"
                    >
                      <div className={`p-1.5 rounded-full bg-muted/50 ${
                        incident.severity === "critical" ? "text-red-500" :
                        incident.severity === "high" ? "text-amber-500" :
                        incident.severity === "medium" ? "text-blue-500" : "text-emerald-500"
                      }`}>
                        <AlertTriangle className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{incident.title}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
