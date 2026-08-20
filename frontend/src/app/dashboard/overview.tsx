"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useAnalyticsOverview } from "@/hooks/use-analytics";
import { useComplaints } from "@/hooks/use-complaints";
import { useAuth } from "@/components/auth-provider";
import { Zap, Clock, ShieldCheck, Brain } from "lucide-react";

export function Overview() {
  const { user } = useAuth();
  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsOverview();
  const { data: complaints = [], isLoading: complaintsLoading } = useComplaints(user?.tenantId);

  const loading = analyticsLoading || complaintsLoading;

  // Build monthly ticket trend from real ingested complaint dates
  const monthlyCounts: Record<string, number> = {};
  const activeComplaints = complaints.filter((c) => c.status !== "deleted");

  activeComplaints.forEach((c) => {
    const date = new Date(c.created_at);
    const monthKey = date.toLocaleString("en-US", { month: "short" });
    monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
  });

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonthIndex = new Date().getMonth();
  
  // Display last 6 months or populated months
  const chartData = months.slice(Math.max(0, currentMonthIndex - 5), currentMonthIndex + 1).map((m) => ({
    name: m,
    complaints: monthlyCounts[m] || 0,
  }));

  const mttrData = analytics?.mttrByPriority.map((item) => ({
    priority: item.priority,
    "Mean Time to Resolution (Hours)": item.avgHours,
    Tickets: item.count,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Realtime Service Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mean Time to Resolution (MTTR)</CardTitle>
            <Clock className="h-4 w-4 text-[#c9a382]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "…" : `${analytics?.summary.overallMttrHours || 0} hrs`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average ticket resolution time</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SLA Compliance Rate</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "…" : `${analytics?.summary.slaComplianceRate || 100}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tickets resolved within target SLA</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Groq AI Classification Accuracy</CardTitle>
            <Brain className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "…" : `${analytics?.summary.aiAccuracyRate || 100}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Confirmed correct AI category score</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Ticket Volume Trend Chart */}
        <Card className="bg-white border-[#EED9C4]">
          <CardHeader>
            <CardTitle className="text-base font-medium">Ingested Ticket Volume Trend</CardTitle>
            <CardDescription>
              Real-time complaint ingestion counts grouped by month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              {activeComplaints.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No ticket volume data yet. Submit test complaints to view charts.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="complaints" stroke="#3d2a1c" strokeWidth={2} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resolution Speed by Priority Chart */}
        <Card className="bg-white border-[#EED9C4]">
          <CardHeader>
            <CardTitle className="text-base font-medium">MTTR Resolution Speed by Priority</CardTitle>
            <CardDescription>
              Average hours to resolution broken down by priority tier.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              {mttrData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No resolved tickets data yet. Resolve complaints to populate MTTR metrics.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mttrData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="priority" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="Mean Time to Resolution (Hours)" fill="#c9a382" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}