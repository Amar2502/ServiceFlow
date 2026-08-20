"use client";

import { Users, FileText, BarChart2, MessageSquare, ClipboardList, Terminal } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview } from "./overview";
import { RecentComplaints, type RecentComplaint } from "./recent-complaints";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalComplaints: 0,
    pendingComplaints: 0,
    employees: 0,
    customers: 0,
    assignments: 0,
  });
  const [recent, setRecent] = useState<RecentComplaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user) return;
      setLoading(true);
      try {
        if (user.role === "ADMIN") {
          const [complaintsRes, employeesRes] = await Promise.all([
            api.get<Record<string, unknown>[]>("/api/complaints/all"),
            api.get<unknown[]>("/api/employees/active"),
          ]);
          if (cancelled) return;
          const complaints = complaintsRes || [];
          const active = complaints.filter((c: Record<string, unknown>) => !c.deleted_at);
          const pending = active.filter(
            (c: Record<string, unknown>) =>
              c.status === "open" || c.status === "in_progress"
          );
          const customers = new Set(
            active.map((c: Record<string, unknown>) => c.customer_email).filter(Boolean)
          );
          setStats({
            totalComplaints: active.length,
            pendingComplaints: pending.length,
            employees: employeesRes?.length ?? 0,
            customers: customers.size,
            assignments: 0,
          });
          const sorted = [...active].sort(
            (a, b) =>
              new Date(String(b.created_at)).getTime() -
              new Date(String(a.created_at)).getTime()
          );
          setRecent(
            sorted.slice(0, 6).map((c: Record<string, unknown>) => ({
              id: String(c.id),
              customer_name: String(c.customer_name ?? ""),
              title: String(c.title ?? ""),
              description: c.description ? String(c.description) : undefined,
              status: String(c.status ?? ""),
              created_at: String(c.created_at ?? ""),
            }))
          );
        } else if (user.role === "AGENT" && user.employeeId) {
          const rows = await api.get<{ complaint_id: string }[]>(
            `/api/employees/my-assignments/${user.employeeId}`
          );
          if (cancelled) return;
          setStats((s) => ({ ...s, assignments: rows.length, totalComplaints: rows.length }));
          setRecent([]);
        } else {
          setRecent([]);
        }
      } catch {
        if (!cancelled) {
          setRecent([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (user?.role === "AGENT") {
    return (
      <div className="flex-1 overflow-auto space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground">
            You’re on the agent workspace. Routing happens over the ServiceFlow API from your
            product — this console is for day‑to‑day work.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="bg-white border-[#EED9C4]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Your queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? "…" : stats.assignments}</div>
              <p className="text-xs text-muted-foreground mt-1">Open assignments</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EED9C4] flex flex-col justify-center">
            <CardContent className="pt-6">
              <Button asChild className="w-full bg-[#3d2a1c] hover:bg-[#2a1d14] text-[#faf6f2]">
                <Link href="/dashboard/my-assignments">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Open my assignments
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        <Card className="border-dashed border-[#dfc7ae] bg-[#faf6f2]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              API reminder
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Inbound tickets arrive via{" "}
              <code className="text-xs bg-muted px-1 rounded">POST /api/complaints/create</code>{" "}
              with a Bearer API key. See{" "}
              <Link href="/dashboard/api-docs" className="text-[#8c6d4e] underline">
                API docs
              </Link>{" "}
              for the exact payload.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Console</h1>
            <Badge className={user?.routingMode === "EMPLOYEE" ? "bg-purple-100 text-purple-900 border-purple-300 font-mono text-[11px]" : "bg-amber-100 text-amber-900 border-amber-300 font-mono text-[11px]"}>
              <Sparkles className="h-3 w-3 mr-1" />
              Strategy: {user?.routingMode === "EMPLOYEE" ? "EMPLOYEE (Direct Agent)" : "DEPARTMENT (Workload)"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Tenant overview — wire your apps to the routing API, then operate here.
          </p>
        </div>
        <Button asChild variant="outline" className="bg-white border-[#dfc7ae]">
          <Link href="/dashboard/api-docs">API reference</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complaints</CardTitle>
            <MessageSquare className="h-4 w-4 text-[#c9a382]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : stats.totalComplaints}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <FileText className="h-4 w-4 text-[#c9a382]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : stats.pendingComplaints}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agents</CardTitle>
            <Users className="h-4 w-4 text-[#c9a382]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : stats.employees}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <BarChart2 className="h-4 w-4 text-[#c9a382]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : stats.customers}</div>
            <p className="text-xs text-muted-foreground mt-1">Distinct emails</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recent" className="space-y-4 mt-6">
        <TabsList className="bg-[#f5eadf]">
          <TabsTrigger value="recent">Latest tickets</TabsTrigger>
          <TabsTrigger value="overview">Trend (sample)</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <RecentComplaints items={recent} />
        </TabsContent>

        <TabsContent value="overview">
          <Overview />
        </TabsContent>
      </Tabs>
    </div>
  );
}
