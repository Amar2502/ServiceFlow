"use client";

import { Plus, Download, Search, Copy, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EmployeesTable } from "./employees-table";
import { useState } from "react";
import { useActiveEmployees } from "@/hooks/use-employees";
import { useDepartments } from "@/hooks/use-departments";
import { useAuth } from "@/components/auth-provider";
import { RbacGuard } from "@/components/rbac-guard";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Building2, UserCheck } from "lucide-react";

export default function EmployeesPage() {
  const { user } = useAuth();
  const isEmployeeMode = user?.routingMode === "EMPLOYEE";
  const { data: employees = [], isLoading, refetch } = useActiveEmployees(user?.tenantId);
  const { data: departments = [] } = useDepartments();

  const [searchQuery, setSearchQuery] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "AGENT">("AGENT");
  const [inviteDepartmentId, setInviteDepartmentId] = useState<string>("");
  const [inviteTitle, setInviteTitle] = useState<string>("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<{
    token: string;
    invite_url: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inviteRole === "AGENT") {
      if (!isEmployeeMode && !inviteDepartmentId) {
        toast.error("Please select a predefined department for the agent invite.");
        return;
      }
      if (isEmployeeMode && !inviteTitle.trim()) {
        toast.error("Employee title is required when routing strategy is employee-centric.");
        return;
      }
    }

    setInviteLoading(true);
    try {
      const response = await api.post<{ token: string; invite_url: string }>(
        "/api/invite/create",
        {
          role: inviteRole,
          departmentId: inviteRole === "AGENT" && !isEmployeeMode ? inviteDepartmentId : undefined,
          title: inviteRole === "AGENT" && isEmployeeMode && inviteTitle.trim() ? inviteTitle.trim() : undefined,
        }
      );
      setGeneratedInvite({
        token: response.token,
        invite_url: response.invite_url,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate invite");
    } finally {
      setInviteLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Invitation link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredEmployees = employees.filter((emp) => {
    const name = emp.user?.name || emp.name || "";
    const email = emp.user?.email || "";
    return (
      searchQuery === "" ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <RbacGuard allowedRoles={["ADMIN"]}>
      <div className="flex-1 overflow-auto space-y-5">
        {/* Strategy Context Banner */}
        <div className="bg-slate-100 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {isEmployeeMode ? (
              <UserCheck className="h-4 w-4 text-purple-700 shrink-0" />
            ) : (
              <Building2 className="h-4 w-4 text-amber-700 shrink-0" />
            )}
            <span>
              {isEmployeeMode ? (
                <><strong>Direct Employee Routing Active:</strong> Complaints are routed to staff based on employee titles.</>
              ) : (
                <><strong>Department Workload Mode Active:</strong> Complaints are routed to departments first, then assigned to least-loaded agents.</>
              )}
            </span>
          </div>
          <Badge className={isEmployeeMode ? "bg-purple-100 text-purple-800" : "bg-amber-100 text-amber-900"}>
            {isEmployeeMode ? "EMPLOYEE STRATEGY" : "DEPARTMENT STRATEGY"}
          </Badge>
        </div>

        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#3d2a1c]">
              Employee Workload & Capacity
            </h1>
            <p className="text-sm text-slate-500">
              Real-time active load tracking and agent invitation portal.
            </p>
          </div>
          <div>
            <Sheet>
              <SheetTrigger asChild>
                <Button className="bg-[#3d2a1c] hover:bg-[#2a1d14] text-[#faf6f2] text-xs font-medium">
                  <Plus className="mr-1.5 h-4 w-4" /> Invite Employee
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-[#faf6f2] p-4">
                <SheetHeader>
                  <SheetTitle>Invite New Staff</SheetTitle>
                  <SheetDescription>
                    Generate a single-use invitation link for a new support agent or administrator.
                  </SheetDescription>
                </SheetHeader>

                {generatedInvite ? (
                  <div className="mt-6 space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                      <p className="text-xs font-medium text-amber-900 mb-2">
                        ⚠️ Single-use link: Share this invite link with the staff member. It expires in 24 hours and is deleted once accepted.
                      </p>
                      <div className="flex items-center space-x-2">
                        <Input
                          value={generatedInvite.invite_url}
                          readOnly
                          className="bg-white font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generatedInvite.invite_url)}
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-[#3d2a1c] hover:bg-[#2a1d14] text-white text-xs"
                      onClick={() => {
                        setGeneratedInvite(null);
                        setInviteRole("AGENT");
                        setInviteDepartmentId("");
                        setInviteTitle("");
                      }}
                    >
                      Generate Another Invite
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleCreateInvite} className="space-y-4 mt-6">
                    <div>
                      <Label htmlFor="role" className="text-xs font-semibold">
                        Role <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(value: "ADMIN" | "AGENT") => setInviteRole(value)}
                      >
                        <SelectTrigger className="w-full bg-white mt-1.5 text-xs">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="AGENT">Agent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {inviteRole === "AGENT" && (
                      <>
                        {!isEmployeeMode ? (
                          <div>
                            <Label htmlFor="department" className="text-xs font-semibold">
                              Predefined Department <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              value={inviteDepartmentId}
                              onValueChange={(val) => setInviteDepartmentId(val)}
                            >
                              <SelectTrigger className="w-full bg-white mt-1.5 text-xs">
                                <SelectValue placeholder="Select department to map agent to" />
                              </SelectTrigger>
                              <SelectContent>
                                {departments.map((dept) => (
                                  <SelectItem key={dept.id} value={dept.id}>
                                    {dept.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-[11px] text-slate-500 mt-1">
                              The invited agent will automatically be mapped to this department upon joining.
                            </p>
                          </div>
                        ) : (
                          <div>
                            <Label htmlFor="title" className="text-xs font-semibold">
                              Employee Title <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="title"
                              placeholder="e.g. Billing Specialist, Tier 2 Support"
                              value={inviteTitle}
                              onChange={(e) => setInviteTitle(e.target.value)}
                              required
                              className="bg-white mt-1.5 text-xs"
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                              Required for Employee-Centric routing so AI can route complaints to this title.
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-[#3d2a1c] hover:bg-[#2a1d14] text-white text-xs font-medium"
                      disabled={inviteLoading}
                    >
                      {inviteLoading ? "Generating..." : "Generate Invite Link"}
                    </Button>
                  </form>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <Card className="bg-white border-[#EED9C4] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#5a3e2b]">Active Support Agents</CardTitle>
            <CardDescription>
              Live load counters recalculated in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search staff members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-white w-[280px] text-xs"
                />
              </div>

              <Button variant="outline" className="bg-white text-xs">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export List
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-10 text-xs text-slate-400">Loading active staff workload...</div>
            ) : (
              <EmployeesTable employees={filteredEmployees} onRefresh={refetch} />
            )}
          </CardContent>
        </Card>
      </div>
    </RbacGuard>
  );
}
