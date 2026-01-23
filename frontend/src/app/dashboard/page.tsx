"use client";

import { Users, FileText, BarChart2, MessageSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview } from "./overview";
import { RecentComplaints } from "./recent-complaints";
import { useState, useEffect } from "react";
import axios from "axios";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalComplaints: 0,
    pendingComplaints: 0,
    employees: 0,
    customers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [complaintsRes, employeesRes] = await Promise.all([
          axios.get("http://localhost:5000/api/complaints/all", {
            withCredentials: true,
          }),
          axios.get("http://localhost:5000/api/employees/active", {
            withCredentials: true,
          }),
        ]);

        const complaints = complaintsRes.data || [];
        const activeComplaints = complaints.filter((c: any) => !c.deleted_at);
        const pendingComplaints = activeComplaints.filter(
          (c: any) => c.status === "open" || c.status === "in_progress"
        );
        const uniqueCustomers = new Set(
          activeComplaints.map((c: any) => c.customer_email).filter(Boolean)
        );

        setStats({
          totalComplaints: activeComplaints.length,
          pendingComplaints: pendingComplaints.length,
          employees: employeesRes.data?.length || 0,
          customers: uniqueCustomers.size,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your ServiceFlow system.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Complaints
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-[#c9a382]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.totalComplaints}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Complaints
            </CardTitle>
            <FileText className="h-4 w-4 text-[#c9a382]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.pendingComplaints}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <Users className="h-4 w-4 text-[#c9a382]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.employees}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <BarChart2 className="h-4 w-4 text-[#c9a382]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.customers}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4 mt-6">
        <TabsList className="bg-[#f5eadf]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recent">Recent Complaints</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Overview />
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <RecentComplaints />
        </TabsContent>
      </Tabs>
    </div>
  );
}
