import { useState } from 'react';
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Incident } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertCircle, 
  AlertTriangle, 
  Shield, 
  TrendingUp, 
  Clock,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit,
  Activity,
  Zap,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  revoked: boolean;
}

export default function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<{ id: string; name: string } | null>(null);
  const [profileData, setProfileData] = useState({
    username: user?.user_metadata?.username || "",
    firstName: user?.user_metadata?.firstName || "",
    lastName: user?.user_metadata?.lastName || "",
    phone: user?.user_metadata?.phone || "",
    dob: user?.user_metadata?.dob || "",
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);

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
      setKeyToRevoke(null);
    },
  });

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCreateKey = () => {
    if (newKeyName.trim()) {
      createKeyMutation.mutate(newKeyName);
    }
  };

  const handleCopyNewKey = () => {
    if (newlyCreatedKey) {
      navigator.clipboard.writeText(newlyCreatedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewlyCreatedKey(null);
    setNewKeyName("");
    setCopiedKey(false);
  };

  const handleOpenEditProfile = () => {
    setProfileData({
      username: user?.user_metadata?.username || "",
      firstName: user?.user_metadata?.firstName || "",
      lastName: user?.user_metadata?.lastName || "",
      phone: user?.user_metadata?.phone || "",
      dob: user?.user_metadata?.dob || "",
    });
    setEditProfileOpen(true);
  };

  const handleUpdateProfile = async () => {
    if (!profileData.username || !profileData.firstName) {
      toast({ title: "Error", description: "Username and first name are required", variant: "destructive" });
      return;
    }

    setUpdatingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          username: profileData.username,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone,
          dob: profileData.dob,
        }
      });
      
      if (error) throw error;
      
      toast({ title: "Profile updated!", description: "Your changes have been saved" });
      setEditProfileOpen(false);
      window.location.reload(); // Reload to refresh user data
    } catch (error: any) {
      toast({ 
        title: "Update failed", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const totalIncidents = incidents.length;
  const criticalCount = incidents.filter(i => i.severity === "critical").length;
  const highCount = incidents.filter(i => i.severity === "high").length;
  const mediumCount = incidents.filter(i => i.severity === "medium").length;
  const resolvedCount = incidents.filter(i => i.status === "resolved").length;
  const resolutionRate = totalIncidents > 0 ? Math.round((resolvedCount / totalIncidents) * 100) : 0;

  // Calculate action completion rate
  const totalSteps = incidents.reduce((sum, i) => sum + (i.nextSteps?.length || 0), 0);
  const completedStepsCount = incidents.reduce((sum, i) => sum + (i.completedSteps?.length || 0), 0);
  const actionCompletionRate = totalSteps > 0 ? Math.round((completedStepsCount / totalSteps) * 100) : 0;

  const recentActivities = incidents.slice(0, 4);
  const activeKeys = apiKeys.filter(k => !k.revoked);
  const revokedKeys = apiKeys.filter(k => k.revoked);

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto bg-[#0d1117]">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
            <p className="text-gray-400 text-sm">Your account and activity overview.</p>
          </div>

          {/* Profile Card & Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Profile Info Card */}
            <Card className="lg:col-span-1 bg-[#161b22] border-gray-800 p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mb-4 ring-4 ring-blue-500/20">
                  {(user?.user_metadata?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                </div>
                <h2 className="text-xl font-semibold text-white mb-1">
                  {user?.user_metadata?.firstName || user?.email?.split('@')[0] || 'User'}
                </h2>
                <p className="text-sm text-gray-400 mb-4">{user?.email}</p>
                <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white" onClick={handleOpenEditProfile}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                
                {/* Account Info */}
                <div className="w-full mt-6 pt-6 border-t border-gray-800 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Member since</span>
                    <span className="text-white">{formatDistanceToNow(new Date(user?.created_at || Date.now()), { addSuffix: true })}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Auth method</span>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      Supabase Auth
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            {/* Stats Grid */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="group relative bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30 p-6 hover:border-orange-400/50 transition-all duration-300 cursor-pointer overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-orange-500/20 rounded-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 group-hover:bg-orange-500/30">
                      <AlertCircle className="w-6 h-6 text-orange-400" />
                    </div>
                    <Badge className="bg-orange-500/20 text-orange-400 border-0 group-hover:bg-orange-500/30 transition-colors">
                      Active
                    </Badge>
                  </div>
                  <div className="text-4xl font-bold text-white mb-1 group-hover:scale-105 transition-transform duration-300">{totalIncidents}</div>
                  <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Active Incidents</div>
                  <div className="mt-3 pt-3 border-t border-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-orange-400/80">View details</span>
                      <span className="text-orange-400">→</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="group relative bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-500/30 p-6 hover:border-red-400/50 transition-all duration-300 cursor-pointer overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-red-500/20 rounded-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 group-hover:bg-red-500/30">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <Badge className="bg-red-500/20 text-red-400 border-0 group-hover:bg-red-500/30 transition-colors">
                      Critical
                    </Badge>
                  </div>
                  <div className="text-4xl font-bold text-white mb-1 group-hover:scale-105 transition-transform duration-300">{criticalCount}</div>
                  <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Critical Issues</div>
                  <div className="mt-3 pt-3 border-t border-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-red-400/80">{criticalCount === 0 ? 'All clear' : 'Needs attention'}</span>
                      <span className={criticalCount === 0 ? 'text-emerald-400' : 'text-red-400'}>{criticalCount === 0 ? '✓' : '!'}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="group relative bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30 p-6 hover:border-emerald-400/50 transition-all duration-300 cursor-pointer overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-emerald-500/20 rounded-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 group-hover:bg-emerald-500/30">
                      <Shield className="w-6 h-6 text-emerald-400" />
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0 group-hover:bg-emerald-500/30 transition-colors flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +12%
                    </Badge>
                  </div>
                  <div className="text-4xl font-bold text-white mb-1 group-hover:scale-105 transition-transform duration-300">{highCount}</div>
                  <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Threats Detected</div>
                  <div className="mt-3 pt-3 border-t border-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-400/80">vs. last week</span>
                      <span className="text-emerald-400">+12%</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="group relative bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30 p-6 hover:border-blue-400/50 transition-all duration-300 cursor-pointer overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-blue-500/20 rounded-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 group-hover:bg-blue-500/30">
                      <TrendingUp className="w-6 h-6 text-blue-400" />
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-400 border-0 group-hover:bg-blue-500/30 transition-colors">
                      Perfect
                    </Badge>
                  </div>
                  <div className="text-4xl font-bold text-white mb-1 group-hover:scale-105 transition-transform duration-300">{resolutionRate}%</div>
                  <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Resolution Rate</div>
                  <div className="mt-3 pt-3 border-t border-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-400/80">Avg. 2.3h resolve time</span>
                      <span className="text-blue-400">⚡</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Severity Breakdown */}
              <Card className="bg-[#161b22] border-gray-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-400" />
                      Severity Breakdown
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Incidents by severity level</p>
                  </div>
                  <Badge className="bg-gray-700 text-gray-300 border-0">Last 30 days</Badge>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-300 font-medium">High</span>
                      </div>
                      <span className="text-sm text-gray-400">{highCount}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full" style={{ width: totalIncidents > 0 ? `${(highCount / totalIncidents) * 100}%` : '0%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-sm text-gray-300 font-medium">Medium</span>
                      </div>
                      <span className="text-sm text-gray-400">{mediumCount}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full" style={{ width: totalIncidents > 0 ? `${(mediumCount / totalIncidents) * 100}%` : '0%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm text-gray-300 font-medium">Low</span>
                      </div>
                      <span className="text-sm text-gray-400">{incidents.filter(i => i.severity === "low").length}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full" style={{ width: totalIncidents > 0 ? `${(incidents.filter(i => i.severity === "low").length / totalIncidents) * 100}%` : '0%' }}></div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Action Completion */}
              <Card className="bg-[#161b22] border-gray-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-emerald-400" />
                      Action Completion
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Remediation progress</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">AI Actions Completed</span>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      {actionCompletionRate}%
                    </Badge>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${actionCompletionRate}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{completedStepsCount} of {totalSteps} steps completed</span>
                  </div>
                </div>
              </Card>

              {/* API Keys */}
              <Card className="bg-[#161b22] border-gray-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">API Keys</h3>
                    <p className="text-xs text-gray-500 mt-1">Manage API keys to access the incident API programmatically. <a href="/docs" className="text-blue-400 hover:text-blue-300">View API docs</a></p>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Create
                  </Button>
                </div>

                <div className="space-y-3">
                  {activeKeys.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No API keys yet. Create one to get started.</p>
                  ) : (
                    activeKeys.map((apiKey) => (
                      <div key={apiKey.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 sm:p-4 hover:border-gray-600 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-medium text-white truncate">{apiKey.name}</span>
                              <Badge className="bg-gray-700 text-gray-300 border-0 text-[10px] shrink-0">
                                {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500">
                              {apiKey.lastUsedAt ? `Last used ${formatDistanceToNow(new Date(apiKey.lastUsedAt), { addSuffix: true })}` : 'Never used'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="h-8 w-8 flex items-center justify-center text-gray-600 cursor-not-allowed">
                              <EyeOff className="w-4 h-4" />
                            </div>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-gray-400 hover:text-white"
                              onClick={() => copyToClipboard(apiKey.keyPrefix)}
                              title="Copy key prefix"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-gray-400 hover:text-red-400"
                              onClick={() => setKeyToRevoke({ id: apiKey.id, name: apiKey.name })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="bg-[#0d1117] border border-gray-700 rounded px-2 sm:px-3 py-2 font-mono text-[10px] sm:text-xs text-gray-300 overflow-x-auto">
                          <div className="whitespace-nowrap">{apiKey.keyPrefix}••••••••••••••••••••••••••••</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {revokedKeys.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-400">Revoked Keys ({revokedKeys.length})</h4>
                    </div>
                    <div className="space-y-2">
                      {revokedKeys.map((apiKey) => (
                        <div key={apiKey.id} className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3 opacity-60">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400 line-through">{apiKey.name}</span>
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                                  Revoked
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Right Column - Recent Activity */}
            <div className="lg:col-span-1">
              <Card className="bg-[#161b22] border-gray-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                  <Clock className="w-5 h-5 text-gray-500" />
                </div>

                <div className="space-y-4">
                  {recentActivities.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
                  ) : (
                    recentActivities.map((activity, index) => (
                      <div key={activity.id} className="relative">
                        {index !== recentActivities.length - 1 && (
                          <div className="absolute left-4 top-10 bottom-0 w-px bg-gray-800"></div>
                        )}
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 text-orange-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-300 leading-snug mb-1">{activity.title}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Button variant="ghost" className="w-full mt-6 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                  View All Activity →
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Create API Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={handleCloseCreateDialog}>
        <DialogContent className="bg-[#161b22] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription className="text-gray-400">
              {newlyCreatedKey 
                ? "Save this key securely. You won't be able to see it again."
                : "Give your API key a descriptive name to help you remember what it's for."
              }
            </DialogDescription>
          </DialogHeader>

          {newlyCreatedKey ? (
            <div className="space-y-4">
              <div className="bg-[#0d1117] border border-gray-700 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-2">Your new API key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono text-emerald-400 break-all">
                    {newlyCreatedKey}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCopyNewKey}
                    className="shrink-0 text-gray-400 hover:text-white"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                <p className="text-xs text-orange-400">
                  ⚠️ Make sure to copy your API key now. You won't be able to see it again!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Key Name</label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production Server"
                  className="bg-[#0d1117] border-gray-700 text-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateKey();
                    }
                  }}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {newlyCreatedKey ? (
              <Button onClick={handleCloseCreateDialog} className="bg-blue-600 hover:bg-blue-700">
                Done
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={handleCloseCreateDialog} className="text-gray-400 hover:text-white">
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateKey} 
                  disabled={!newKeyName.trim() || createKeyMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createKeyMutation.isPending ? "Creating..." : "Create Key"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="bg-[#161b22] border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update your profile information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-username" className="text-gray-300">
                  Username <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="edit-username"
                  value={profileData.username}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  placeholder="operator_01"
                  className="bg-[#0d1117] border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-firstName" className="text-gray-300">
                  First Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="edit-firstName"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  placeholder="John"
                  className="bg-[#0d1117] border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-lastName" className="text-gray-300">
                  Last Name
                </Label>
                <Input
                  id="edit-lastName"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  placeholder="Doe"
                  className="bg-[#0d1117] border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="text-gray-300">
                  Phone
                </Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="bg-[#0d1117] border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-dob" className="text-gray-300">
                  Date of Birth
                </Label>
                <Input
                  id="edit-dob"
                  type="date"
                  value={profileData.dob}
                  onChange={(e) => setProfileData({ ...profileData, dob: e.target.value })}
                  className="bg-[#0d1117] border-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditProfileOpen(false)} className="text-gray-400 hover:text-white">
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateProfile} 
              disabled={!profileData.username || !profileData.firstName || updatingProfile}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updatingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!keyToRevoke} onOpenChange={() => setKeyToRevoke(null)}>
        <AlertDialogContent className="bg-[#161b22] border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to revoke "{keyToRevoke?.name}"? This action cannot be undone and any applications using this key will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 text-white border-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => keyToRevoke && revokeKeyMutation.mutate(keyToRevoke.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {revokeKeyMutation.isPending ? "Revoking..." : "Revoke Key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
