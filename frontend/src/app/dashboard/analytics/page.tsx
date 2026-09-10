"use client";

import { useAnalyticsOverview } from "@/hooks/use-analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ShieldCheck, Sparkles, AlertTriangle, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useAnalyticsOverview();

  if (isLoading || !analytics) {
    return (
      <div className="flex-1 p-8 text-center text-xs text-muted-foreground">
        Computing Mean Time to Resolution & SLA compliance aggregations...
      </div>
    );
  }

  const { summary, mttrByPriority, mttrByDepartment } = analytics;

  const PRIORITY_COLORS: Record<string, string> = {
    URGENT: "#ef4444",
    HIGH: "#f97316",
    MEDIUM: "#3b82f6",
    LOW: "#64748b",
  };

  return (
    <div className="flex-1 overflow-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Operations & AI Analytics Performance
        </h1>
        <p className="text-xs text-muted-foreground">
          Data-driven metrics tracking Mean Time to Resolution (MTTR), SLA compliance %, and Groq AI accuracy.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* MTTR Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Mean Time to Resolution</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{summary.overallMttrHours}h</div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-600" /> Average hours across resolved cases
            </p>
          </CardContent>
        </Card>

        {/* SLA Compliance Rate Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">SLA Compliance Rate</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{summary.slaComplianceRate}%</div>
            <div className="mt-1">
              <Badge className={summary.slaComplianceRate >= 90 ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800" : "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800"}>
                {summary.slaComplianceRate >= 90 ? "Target Met (≥90%)" : "Target Breached"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Groq AI Routing Accuracy Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Groq AI Accuracy Rate</CardTitle>
            <Sparkles className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{summary.aiAccuracyRate}%</div>
            <p className="text-[11px] text-muted-foreground mt-1">Human agent feedback loop calibration</p>
          </CardContent>
        </Card>

        {/* Total Volume Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Active vs Resolved</CardTitle>
            <AlertTriangle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{summary.resolvedComplaints} / {summary.totalComplaints}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{summary.openComplaints} currently open</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* MTTR by Priority Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">MTTR Breakdown by Priority</CardTitle>
            <CardDescription className="text-xs">Average resolution time in hours for each priority tier</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mttrByPriority} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="priority" stroke="#888888" />
                <YAxis unit="h" stroke="#888888" />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }} formatter={(value: any) => [`${value} hours`, "Avg MTTR"]} />
                <Bar dataKey="avgHours" radius={[4, 4, 0, 0]}>
                  {mttrByPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority] || "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MTTR by Department Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">MTTR Breakdown by Department</CardTitle>
            <CardDescription className="text-xs">Average resolution time across routing departments</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {mttrByDepartment.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                No department resolution data logged yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mttrByDepartment} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="department" stroke="#888888" />
                  <YAxis unit="h" stroke="#888888" />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }} formatter={(value: any) => [`${value} hours`, "Avg MTTR"]} />
                  <Bar dataKey="avgHours" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
