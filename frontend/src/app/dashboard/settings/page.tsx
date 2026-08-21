"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { RbacGuard } from "@/components/rbac-guard";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, UserCheck, Sparkles } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [routingMode, setRoutingMode] = useState<"DEPARTMENT" | "EMPLOYEE">(
    user?.routingMode || "DEPARTMENT"
  );

  useEffect(() => {
    if (user?.routingMode) {
      setRoutingMode(user.routingMode);
    }
  }, [user?.routingMode]);

  const handleTenantUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId || !tenantName.trim()) return;
    setLoading(true);
    try {
      await api.patch("/api/tenant/update-name", {
        tenantId: user.tenantId,
        name: tenantName.trim(),
      });
      useAuthStore.getState().updateUser({ tenantName: tenantName.trim() });
      toast.success("Organization name updated successfully");
      setTenantName("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update tenant name");
    } finally {
      setLoading(false);
    }
  };

  const handleRoutingUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId) return;
    setRoutingLoading(true);
    try {
      await api.patch("/api/tenant/update-routing-mode", {
        tenantId: user.tenantId,
        routingMode,
      });
      useAuthStore.getState().updateUser({ routingMode });
      toast.success(
        `Routing strategy updated to ${
          routingMode === "EMPLOYEE" ? "Direct Employee Title" : "Department"
        } mode`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update routing strategy");
    } finally {
      setRoutingLoading(false);
    }
  };

  const currentMode = user?.routingMode || "DEPARTMENT";

  return (
    <RbacGuard allowedRoles={["ADMIN"]}>
      <div className="flex-1 overflow-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3d2a1c]">
            Tenant Settings & Workspace Configuration
          </h1>
          <p className="text-sm text-slate-500">
            Administrative settings for organization profile and GenAI routing algorithms.
          </p>
        </div>

        {/* Current Active Strategy Banner */}
        <div className="bg-[#3d2a1c] text-[#faf6f2] rounded-lg p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-300" />
              <h2 className="text-base font-bold">Active Strategy: {currentMode === "EMPLOYEE" ? "Direct Employee Title Routing" : "Department Routing"}</h2>
            </div>
            <Badge className="bg-amber-400 text-black font-mono text-xs hover:bg-amber-300">
              {currentMode === "EMPLOYEE" ? "EMPLOYEE MODE ACTIVE" : "DEPARTMENT MODE ACTIVE"}
            </Badge>
          </div>
          <p className="text-xs text-[#dfc7ae] leading-relaxed">
            {currentMode === "EMPLOYEE" ? (
              <>
                <strong>Direct Employee Strategy Active:</strong> Inbound complaints match directly against employee titles.
              </>
            ) : (
              <>
                <strong>Department Strategy Active:</strong> Inbound complaints match against active department names, then distribute to least-loaded staff.
              </>
            )}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-white border-[#EED9C4] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#5a3e2b]">
                Organization Profile
              </CardTitle>
              <CardDescription>
                Update your tenant workspace display name
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTenantUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tenantName" className="text-xs">
                    New Organization Name
                  </Label>
                  <Input
                    id="tenantName"
                    placeholder="e.g. Acme Enterprise Services"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    required
                    className="bg-white text-xs border-[#dfc7ae]"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[#3d2a1c] hover:bg-[#2a1d14] text-white text-xs font-medium"
                >
                  {loading ? "Updating..." : "Update Tenant Name"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#EED9C4] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#5a3e2b]">
                Groq AI Routing Strategy
              </CardTitle>
              <CardDescription>
                Choose how complaints are assigned when ingested via API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRoutingUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="routingMode" className="text-xs">
                    Routing Strategy Mode
                  </Label>
                  <Select
                    value={routingMode}
                    onValueChange={(val: "DEPARTMENT" | "EMPLOYEE") => setRoutingMode(val)}
                  >
                    <SelectTrigger className="bg-white text-xs border-[#dfc7ae]">
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEPARTMENT">
                        Department Routing Mode
                      </SelectItem>
                      <SelectItem value="EMPLOYEE">
                        Employee Title Direct Routing Mode
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-700 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    {routingMode === "DEPARTMENT" ? (
                      <Building2 className="h-4 w-4 text-amber-700" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-purple-700" />
                    )}
                    Selected: {routingMode === "DEPARTMENT" ? "Department Routing Mode" : "Employee Title Direct Routing Mode"}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {routingMode === "DEPARTMENT"
                      ? "Complaints route to department names, then load-balances staff within that department."
                      : "Complaints route directly to individual staff based on employee titles."}
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={routingLoading}
                  className="bg-[#3d2a1c] hover:bg-[#2a1d14] text-white text-xs font-medium w-full"
                >
                  {routingLoading ? "Saving Strategy..." : "Save Routing Mode"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </RbacGuard>
  );
}
