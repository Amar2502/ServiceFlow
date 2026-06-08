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
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [routingMode, setRoutingMode] = useState<"DEPARTMENT" | "EMPLOYEE">(
    "DEPARTMENT"
  );
  const [displayName, setDisplayName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);

  const handleTenantUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId || !tenantName.trim()) return;
    setLoading(true);
    try {
      await api.put("/api/tenant/update/name", {
        tenantId: user.tenantId,
        name: tenantName.trim(),
      });
      toast.success("Organization name updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRoutingUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId) return;
    setRoutingLoading(true);
    try {
      await api.put("/api/tenant/update/routing-mode", {
        tenantId: user.tenantId,
        routingMode,
      });
      toast.success("Default routing strategy updated for new API complaints");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setRoutingLoading(false);
    }
  };

  const handleDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employeeId || !displayName.trim()) {
      toast.error("Employee profile not linked or name empty");
      return;
    }
    setNameLoading(true);
    try {
      await api.patch("/api/employees/update-name", {
        employeeId: user.employeeId,
        name: displayName.trim(),
      });
      toast.success("Display name updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setNameLoading(false);
    }
  };

  if (user?.role === "AGENT") {
    return (
      <div className="flex-1 overflow-auto max-w-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Account</h1>
          <p className="text-muted-foreground">
            Update how your name appears in the workspace.
          </p>
        </div>
        <Card className="bg-white border-[#EED9C4]">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Maps to your employee record. Requires an invite-based profile with{" "}
              <code className="text-xs bg-muted px-1 rounded">employeeId</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDisplayName} className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="bg-white mt-2"
                />
              </div>
              <Button
                type="submit"
                className="bg-[#c9a382] hover:bg-[#b08e70]"
                disabled={nameLoading || !user.employeeId}
              >
                {nameLoading ? "Saving…" : "Save"}
              </Button>
              {!user.employeeId && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
                  No employee profile on this session. Open your invite link once, or ask an
                  admin to re-invite you so routing and assignments work.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workspace settings</h1>
        <p className="text-muted-foreground">
          Tenant name and how inbound API complaints are routed (department vs specific
          agents).
        </p>
      </div>

      <Card className="bg-white border-[#EED9C4]">
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Shown in the console and internal references.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTenantUpdate} className="space-y-4">
            <div>
              <Label htmlFor="tenantName">Organization name</Label>
              <Input
                id="tenantName"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Acme Inc."
                required
                className="bg-white mt-2"
              />
            </div>
            <Button
              type="submit"
              className="bg-[#c9a382] hover:bg-[#b08e70]"
              disabled={loading}
            >
              {loading ? "Saving…" : "Save name"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-white border-[#EED9C4]">
        <CardHeader>
          <CardTitle>API complaint routing</CardTitle>
          <CardDescription>
            Controls ML routing for{" "}
            <code className="text-xs bg-muted px-1 rounded">POST /api/complaints/create</code>{" "}
            when using an API key. Your classifier maps text to departments or employees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRoutingUpdate} className="space-y-4">
            <div>
              <Label>Strategy</Label>
              <Select
                value={routingMode}
                onValueChange={(v: "DEPARTMENT" | "EMPLOYEE") => setRoutingMode(v)}
              >
                <SelectTrigger className="bg-white mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEPARTMENT">
                    Department — predict department, then assign within team
                  </SelectItem>
                  <SelectItem value="EMPLOYEE">
                    Employee — predict best agent by profile vectors
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              variant="outline"
              className="border-[#c9a382]"
              disabled={routingLoading}
            >
              {routingLoading ? "Saving…" : "Save routing strategy"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
