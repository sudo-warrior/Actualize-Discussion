import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Terminal, Sparkles, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function Onboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    phone: "",
    dob: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.firstName) return;

    setLoading(true);
    try {
      await apiRequest("PATCH", "/api/user/profile", formData);
      navigate("/");
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 border-primary/20 bg-card/80 backdrop-blur-sm">
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-mono flex items-center justify-center gap-2">
            <Terminal className="h-6 w-6 text-primary" />
            Welcome to Incident Command
          </h1>
          <p className="text-sm text-muted-foreground mt-2 font-mono">
            Let's set up your profile to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="font-mono text-xs uppercase tracking-wider">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="operator_01"
                className="font-mono"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName" className="font-mono text-xs uppercase tracking-wider">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="John"
                className="font-mono"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="font-mono text-xs uppercase tracking-wider">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Doe"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="font-mono text-xs uppercase tracking-wider">
                Phone (Optional)
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="font-mono"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="dob" className="font-mono text-xs uppercase tracking-wider">
                Date of Birth (Optional)
              </Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="font-mono"
              />
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={!formData.username || !formData.firstName || loading}
              className="w-full font-mono"
              size="lg"
            >
              {loading ? "Setting up..." : "Complete Setup"}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground font-mono">
            You can update these details later in your profile settings
          </p>
        </form>
      </Card>
    </div>
  );
}
