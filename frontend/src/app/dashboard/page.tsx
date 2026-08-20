"use client";

import { Users, FileText, BarChart2, MessageSquare, ClipboardList, Terminal, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview } from "./overview";
import { RecentComplaints, type RecentComplaint } from "./recent-complaints";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useComplaints } from "@/hooks/use-complaints";
import { useActiveEmployees } from "@/hooks/use-employees";
import { useAnalyticsOverview } from "@/hooks/use-analytics";

export default function DashboardPage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  // Real-time backend queries connected via TanStack React Query + Socket.io listeners
  const { data: complaints = [], isLoading: complaintsLoading } = useComplaints(tenantId);
  const { data: employees = [], isLoading: employeesLoading } = useActiveEmployees(tenantId);
  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsOverview();

  const loading = complaintsLoading || employeesLoading;

  // Filter non-deleted complaints
  const activeComplaints = complaints.filter((c) => c.status !== "deleted");
  const pendingComplaints = activeComplaints.filter(
    (c) => c.status === "open" || c.status === "in_progress"
  );
  const resolvedComplaints = activeComplaints.filter((c) => c.status === "resolved");
  const unassignedComplaints = activeComplaints.filter(
    (c) => !c.assignment || (!c.assignment.employee_id && !c.assignment.department_id)
  );

  // Distinct customer count
  const customersSet = new Set(
    activeComplaints.map((c) => c.customer_email).filter(Boolean)
  );

  // My agent assignments
  const myAssignments = activeComplaints.filter(
    (c) => c.assignment?.employee_id === user?.employeeId
  );

  // Sorted recent 6 complaints
  const sortedRecent = [...activeComplaints]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const recentItems: RecentComplaint[] = sortedRecent.map((c) => ({
    id: c.id,
    customer_name: c.customer_name || "Valued Customer",
    title: c.title,
    description: c.description || undefined,
    status: c.status,
    created_at: c.created_at,
  }));

  if (user?.role === "AGENT") {
    return (
      <div className="flex-1 overflow-auto space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Console</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back. Manage your assigned customer complaints below.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-white border-[#EED9C4]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">My Open Queue</CardTitle>
              <ClipboardList className="h-4 w-4 text-[#c9a382]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? "…" : myAssignments.filter(c => c.status !== "resolved").length}</div>
              <p className="text-xs text-muted-foreground mt-1">Tickets assigned to you</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#EED9C4]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Resolved by Me</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? "…" : myAssignments.filter(c => c.status === "resolved").length}</div>
              <p className="text-xs text-muted-foreground mt-1">Completed complaints</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#EED9C4] flex flex-col justify-center">
            <CardContent className="pt-6">
              <Button asChild className="w-full bg-[#3d2a1c] hover:bg-[#2a1d14] text-[#faf6f2]">
                <Link href="/dashboard/my-assignments">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  View My Assignments Queue
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-dashed border-[#dfc7ae] bg-[#faf6f2]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#8c6d4e]" />
              API Ingestion Notice
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Incoming customer tickets arrive via{" "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-[#3d2a1c]">POST /api/complaints/create</code>{" "}
              with a valid Bearer API key. See{" "}
              <Link href="/dashboard/api-docs" className="text-[#8c6d4e] underline font-medium">
                API Docs
              </Link>{" "}
              for integration samples.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Console Overview</h1>
            <Badge className={user?.routingMode === "EMPLOYEE" ? "bg-purple-100 text-purple-900 border-purple-300 font-mono text-[11px]" : "bg-amber-100 text-amber-900 border-amber-300 font-mono text-[11px]"}>
              <Sparkles className="h-3 w-3 mr-1" />
              Strategy: {user?.routingMode === "EMPLOYEE" ? "EMPLOYEE (Direct Role)" : "DEPARTMENT (Workload Balancer)"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time multi-tenant operations dashboard & key metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="bg-white border-[#dfc7ae]">
            <Link href="/dashboard/complaints">Manage Complaints Queue</Link>
          </Button>
          <Button asChild className="bg-[#3d2a1c] hover:bg-[#2a1d14] text-[#faf6f2]">
            <Link href="/dashboard/api-docs">API Docs</Link>
          </Button>
        </div>
      </div>

      {/* Primary Metrics Cards Connected to Real Backend API */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
            <MessageSquare className="h-4 w-4 text-[#c9a382]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : activeComplaints.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All ingested tickets</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active / Pending</CardTitle>
            <FileText className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : pendingComplaints.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Open & In Progress</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : resolvedComplaints.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed tickets</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-[#c9a382]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : employees.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Staff members</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Distinct Customers</CardTitle>
            <BarChart2 className="h-4 w-4 text-[#c9a382]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : customersSet.size}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique customer emails</p>
          </CardContent>
        </Card>
      </div>

      {unassignedComplaints.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-amber-900 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>{unassignedComplaints.length} complaint(s) require Admin manual routing assignment.</span>
            </div>
            <Button asChild size="sm" variant="outline" className="border-amber-400 text-amber-900 hover:bg-amber-100">
              <Link href="/dashboard/complaints">Review Unassigned Queue</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs with Real Analytics & Recent Complaints */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList className="bg-[#f5eadf]">
          <TabsTrigger value="recent">Latest Tickets</TabsTrigger>
          <TabsTrigger value="overview">Analytics & MTTR Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <RecentComplaints items={recentItems} />
        </TabsContent>

        <TabsContent value="overview">
          <Overview />
        </TabsContent>
      </Tabs>
    </div>
  );
}
