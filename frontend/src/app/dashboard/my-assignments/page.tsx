"use client";

import { Search, CheckCircle, Clock, AlertCircle, MessageSquareText, MailCheck, ExternalLink } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { TicketMessagesDialog } from "../complaints/ticket-messages-dialog";
import { ResolutionEmailDialog } from "../complaints/resolution-email-dialog";
import { ComplaintItem } from "@/hooks/use-complaints";

type AssignmentRow = {
  id: string;
  complaint_id: string;
  title: string;
  description?: string;
  customer_name: string;
  customer_email: string;
  status: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  sentiment?: "HAPPY" | "NEUTRAL" | "FRUSTRATED" | "ANGRY";
  summary?: string;
  suggested_reply?: string;
  ai_reasoning?: string;
  sla_due_at?: string;
  is_sla_breached?: boolean;
  created_at: string;
  assigned_at: string;
};

export default function MyAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintItem | null>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAssignments = useCallback(async () => {
    if (!user?.employeeId) {
      setAssignments([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await api.get<AssignmentRow[]>(
        `/api/employees/my-assignments/${user.employeeId}`
      );
      setAssignments(rows);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load assignments");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [user?.employeeId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const mapToComplaintItem = (r: AssignmentRow): ComplaintItem => ({
    id: r.complaint_id || r.id,
    tenant_id: user?.tenantId || "",
    title: r.title,
    description: r.description,
    customer_name: r.customer_name,
    customer_email: r.customer_email,
    status: (r.status as any) || "open",
    priority: r.priority || "MEDIUM",
    sentiment: r.sentiment || "NEUTRAL",
    summary: r.summary,
    suggested_reply: r.suggested_reply,
    ai_reasoning: r.ai_reasoning,
    sla_due_at: r.sla_due_at,
    is_sla_breached: Boolean(r.is_sla_breached),
    is_correctly_classified: true,
    created_at: r.created_at,
    updated_at: r.assigned_at,
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      open: { label: "Open", className: "bg-blue-100 text-blue-800 border-blue-200" },
      in_progress: { label: "In Progress", className: "bg-purple-100 text-purple-800 border-purple-200" },
      resolved: { label: "Resolved", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    };
    const c = config[status] ?? { label: status, className: "bg-gray-100 text-gray-800" };
    return (
      <Badge className={`${c.className} font-medium`} variant="outline">
        {c.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));

  const filtered = assignments.filter((a) => {
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.customer_name.toLowerCase().includes(q) ||
      a.customer_email.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: assignments.length,
    open: assignments.filter((a) => a.status === "open").length,
    in_progress: assignments.filter((a) => a.status === "in_progress").length,
    resolved: assignments.filter((a) => a.status === "resolved").length,
  };

  if (!user?.employeeId) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-[#3d2a1c]">My Agent Queue</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900 text-base font-semibold">No Employee Profile Linked</CardTitle>
            <CardDescription className="text-amber-800 text-xs">
              Your user account does not have an active <code className="text-xs font-mono">employeeId</code> attached. Join via an invite link or ask your Administrator to link your staff profile in{" "}
              <Link href="/dashboard/employees" className="underline font-semibold">
                Staff Workload → Invite
              </Link>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#3d2a1c]">My Assigned Complaints</h1>
        <p className="text-xs text-slate-500">
          Active cases routed to your personal queue via vector matching or manual assignment.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {(
          [
            ["Assigned Queue", statusCounts.all, AlertCircle, "text-[#c9a382]"],
            ["Open", statusCounts.open, AlertCircle, "text-blue-500"],
            ["In Progress", statusCounts.in_progress, Clock, "text-purple-500"],
            ["Resolved", statusCounts.resolved, CheckCircle, "text-emerald-500"],
          ] as const
        ).map(([label, n, Icon, color]) => (
          <Card key={label} className="bg-white border-[#EED9C4] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-slate-600">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{n}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white border-[#EED9C4] shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#5a3e2b]">Personal Work Queue</CardTitle>
          <CardDescription>Review messages, add investigation notes, and send resolution emails</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search assigned cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-white w-full sm:w-[280px] text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white text-xs">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({statusCounts.all})</SelectItem>
                <SelectItem value="open">Open ({statusCounts.open})</SelectItem>
                <SelectItem value="in_progress">In Progress ({statusCounts.in_progress})</SelectItem>
                <SelectItem value="resolved">Resolved ({statusCounts.resolved})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-[#EED9C4] overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#faf6f2]">
                <TableRow>
                  <TableHead className="w-[8ch]">ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="w-[280px]">Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-xs text-slate-400">
                      Loading personal queue...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-xs text-slate-400">
                      No assigned complaints match your filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((assignment) => {
                    const item = mapToComplaintItem(assignment);
                    return (
                      <TableRow key={assignment.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-mono text-xs font-semibold">
                          <Link
                            href={`/dashboard/complaints/${assignment.complaint_id || assignment.id}`}
                            className="text-slate-500 hover:text-indigo-600 hover:underline transition-colors"
                          >
                            #{assignment.complaint_id.substring(0, 6)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/complaints/${assignment.complaint_id || assignment.id}`}
                            className="font-medium text-slate-900 hover:text-indigo-600 hover:underline transition-colors"
                          >
                            {assignment.customer_name}
                          </Link>
                          <div className="text-xs text-slate-500">{assignment.customer_email}</div>
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <Link
                            href={`/dashboard/complaints/${assignment.complaint_id || assignment.id}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600 hover:underline truncate block transition-colors"
                          >
                            {assignment.title}
                          </Link>
                          {assignment.description && (
                            <div className="text-xs text-slate-500 line-clamp-1">{assignment.description}</div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(assignment.assigned_at)}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white border-[#dfc7ae] text-slate-800"
                          >
                            <Link href={`/dashboard/complaints/${assignment.complaint_id || assignment.id}`}>
                              <ExternalLink className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                              View Page
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setSelectedComplaint(item);
                              setShowMessageDialog(true);
                            }}
                          >
                            <MessageSquareText className="h-3.5 w-3.5 mr-1 text-blue-600" />
                            Notes
                          </Button>
                          {assignment.status !== "resolved" && (
                            <Button
                              size="sm"
                              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
                              onClick={() => {
                                setSelectedComplaint(item);
                                setShowResolutionDialog(true);
                              }}
                            >
                              <MailCheck className="h-3.5 w-3.5 mr-1" />
                              Resolution Email
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Conversation Threads & ImageKit Modal */}
      <TicketMessagesDialog
        complaint={selectedComplaint}
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
      />

      {/* 1-Click Resolution Email Modal */}
      <ResolutionEmailDialog
        complaint={selectedComplaint}
        open={showResolutionDialog}
        onOpenChange={setShowResolutionDialog}
      />
    </div>
  );
}
