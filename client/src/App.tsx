import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import Profile from "@/pages/Profile";
import IncidentDetail from "@/pages/IncidentDetail";
import IncidentChat from "@/pages/IncidentChat";
import ApiDocs from "@/pages/ApiDocs";
import Landing from "@/pages/Landing";
import Onboarding from "@/pages/Onboarding";
import Login from "@/pages/Login";
import { Loader2 } from "lucide-react";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/history" component={History} />
      <Route path="/profile" component={Profile} />
      <Route path="/docs" component={ApiDocs} />
      <Route path="/incidents/:id/chat" component={IncidentChat} />
      <Route path="/incidents/:id" component={IncidentDetail} />
      <Route path="/login">{() => <Redirect to="/" />}</Route>
      <Route path="/register">{() => <Redirect to="/" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-mono">Initializing systems...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/" component={Landing} />
        <Route>
          <Landing />
        </Route>
      </Switch>
    );
  }

  // Check if user needs onboarding
  if (!user?.user_metadata?.firstName || !user?.user_metadata?.username) {
    return <Onboarding />;
  }

  return <AuthenticatedRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
