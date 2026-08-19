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
      <div className="flex-1 p-8 text-center text-xs text-slate-400">
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
        <h1 className="text-2xl font-bold tracking-tight text-[#3d2a1c]">
          Operations & AI Analytics Performance
        </h1>
        <p className="text-xs text-slate-500">
          Data-driven metrics tracking Mean Time to Resolution (MTTR), SLA compliance %, and Groq AI accuracy.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* MTTR Card */}
        <Card className="bg-white border-[#EED9C4] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">Mean Time to Resolution</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900">{summary.overallMttrHours}h</div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-600" /> Average hours across resolved cases
            </p>
          </CardContent>
        </Card>

        {/* SLA Compliance Rate Card */}
        <Card className="bg-white border-[#EED9C4] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">SLA Compliance Rate</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900">{summary.slaComplianceRate}%</div>
            <div className="mt-1">
              <Badge className={summary.slaComplianceRate >= 90 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
                {summary.slaComplianceRate >= 90 ? "Target Met (≥90%)" : "Target Breached"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Groq AI Routing Accuracy Card */}
        <Card className="bg-white border-[#EED9C4] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">Groq AI Accuracy Rate</CardTitle>
            <Sparkles className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900">{summary.aiAccuracyRate}%</div>
            <p className="text-[11px] text-slate-500 mt-1">Human agent feedback loop calibration</p>
          </CardContent>
        </Card>

        {/* Total Volume Card */}
        <Card className="bg-white border-[#EED9C4] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">Active vs Resolved</CardTitle>
            <AlertTriangle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900">{summary.resolvedComplaints} / {summary.totalComplaints}</div>
            <p className="text-[11px] text-slate-500 mt-1">{summary.openComplaints} currently open</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* MTTR by Priority Chart */}
        <Card className="bg-white border-[#EED9C4] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#5a3e2b]">MTTR Breakdown by Priority</CardTitle>
            <CardDescription className="text-xs">Average resolution time in hours for each priority tier</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mttrByPriority} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="priority" />
                <YAxis unit="h" />
                <Tooltip formatter={(value: any) => [`${value} hours`, "Avg MTTR"]} />
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
        <Card className="bg-white border-[#EED9C4] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#5a3e2b]">MTTR Breakdown by Department</CardTitle>
            <CardDescription className="text-xs">Average resolution time across routing departments</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {mttrByDepartment.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No department resolution data logged yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mttrByDepartment} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="department" />
                  <YAxis unit="h" />
                  <Tooltip formatter={(value: any) => [`${value} hours`, "Avg MTTR"]} />
                  <Bar dataKey="avgHours" fill="#3d2a1c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
