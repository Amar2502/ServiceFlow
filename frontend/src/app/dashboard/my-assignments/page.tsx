"use client";

import { Search, CheckCircle, Clock, AlertCircle } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

type AssignmentRow = {
  id: string;
  complaint_id: string;
  title: string;
  description?: string;
  customer_name: string;
  customer_email: string;
  status: string;
  external_reference_id?: string;
  created_at: string;
  assigned_at: string;
};

type UiAssignment = {
  id: string;
  assigned_at: string;
  complaint: {
    id: string;
    title: string;
    description?: string;
    customer_name: string;
    customer_email: string;
    status: string;
    external_reference_id?: string;
    created_at: string;
  };
};

function mapRow(r: AssignmentRow): UiAssignment {
  return {
    id: r.id,
    assigned_at: r.assigned_at,
    complaint: {
      id: r.complaint_id,
      title: r.title,
      description: r.description,
      customer_name: r.customer_name,
      customer_email: r.customer_email,
      status: r.status,
      external_reference_id: r.external_reference_id,
      created_at: r.created_at,
    },
  };
}

export default function MyAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<UiAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<UiAssignment | null>(null);
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
      setAssignments(rows.map(mapRow));
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

  const handleStatusUpdate = async (complaintId: string, newStatus: string) => {
    try {
      await api.patch("/api/complaints/update-status", { complaintId, status: newStatus });
      toast.success("Status updated");
      fetchAssignments();
      setSelectedComplaint(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      open: {
        label: "Open",
        className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
        icon: <AlertCircle className="h-3 w-3 mr-1" />,
      },
      in_progress: {
        label: "In progress",
        className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
        icon: <Clock className="h-3 w-3 mr-1" />,
      },
      resolved: {
        label: "Resolved",
        className: "bg-green-100 text-green-800 hover:bg-green-100",
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
      },
    };
    const c = config[status] ?? config.open;
    return (
      <Badge className={`${c.className} font-normal flex items-center gap-1`} variant="outline">
        {c.icon}
        {c.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));

  const filtered = assignments.filter((a) => {
    const matchesStatus = statusFilter === "all" || a.complaint.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      a.complaint.title.toLowerCase().includes(q) ||
      a.complaint.customer_name.toLowerCase().includes(q) ||
      a.complaint.customer_email.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: assignments.length,
    open: assignments.filter((a) => a.complaint.status === "open").length,
    in_progress: assignments.filter((a) => a.complaint.status === "in_progress").length,
    resolved: assignments.filter((a) => a.complaint.status === "resolved").length,
  };

  if (!user?.employeeId) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">My assignments</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">No agent profile</CardTitle>
            <CardDescription className="text-amber-800">
              This view needs an <code className="text-xs">employeeId</code> on your session
              (usually from an invite). Admins: use{" "}
              <Link href="/dashboard/employees" className="underline font-medium">
                Employees → Invite
              </Link>
              . If you already joined via invite, try logging out and back in.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My assignments</h1>
        <p className="text-muted-foreground">
          Tickets where you are the assignee (from API routing or manual assign).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {(
          [
            ["Total", statusCounts.all, AlertCircle, "text-[#c9a382]"],
            ["Open", statusCounts.open, AlertCircle, "text-blue-500"],
            ["In progress", statusCounts.in_progress, Clock, "text-purple-500"],
            ["Resolved", statusCounts.resolved, CheckCircle, "text-green-500"],
          ] as const
        ).map(([label, n, Icon, color]) => (
          <Card key={label} className="bg-white border-[#EED9C4]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{n}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white border-[#EED9C4]">
        <CardHeader>
          <CardTitle>Queue</CardTitle>
          <CardDescription>Update status as you work each case.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-white w-full sm:w-[300px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({statusCounts.all})</SelectItem>
                <SelectItem value="open">Open ({statusCounts.open})</SelectItem>
                <SelectItem value="in_progress">
                  In progress ({statusCounts.in_progress})
                </SelectItem>
                <SelectItem value="resolved">Resolved ({statusCounts.resolved})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No assignments match.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-mono text-xs">
                        {String(assignment.complaint.id).slice(0, 8)}…
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{assignment.complaint.customer_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {assignment.complaint.customer_email}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <div className="font-medium truncate">{assignment.complaint.title}</div>
                        {assignment.complaint.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {assignment.complaint.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(assignment.complaint.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {formatDate(assignment.assigned_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedComplaint(assignment)}
                            >
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-[#faf6f2] max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Complaint</DialogTitle>
                              <DialogDescription>Review and change status.</DialogDescription>
                            </DialogHeader>
                            {selectedComplaint && (
                              <div className="space-y-4 mt-4 text-sm">
                                <div>
                                  <span className="font-medium text-muted-foreground">ID</span>
                                  <p className="font-mono text-xs mt-1">
                                    {selectedComplaint.complaint.id}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-muted-foreground">
                                    Title
                                  </span>
                                  <p className="mt-1">{selectedComplaint.complaint.title}</p>
                                </div>
                                {selectedComplaint.complaint.description && (
                                  <div>
                                    <span className="font-medium text-muted-foreground">
                                      Description
                                    </span>
                                    <p className="mt-1 whitespace-pre-wrap">
                                      {selectedComplaint.complaint.description}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium text-muted-foreground">
                                    Customer
                                  </span>
                                  <p className="mt-1">
                                    {selectedComplaint.complaint.customer_name} ·{" "}
                                    {selectedComplaint.complaint.customer_email}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2">
                                  {selectedComplaint.complaint.status !== "open" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          selectedComplaint.complaint.id,
                                          "open"
                                        )
                                      }
                                    >
                                      Open
                                    </Button>
                                  )}
                                  {selectedComplaint.complaint.status !== "in_progress" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          selectedComplaint.complaint.id,
                                          "in_progress"
                                        )
                                      }
                                    >
                                      In progress
                                    </Button>
                                  )}
                                  {selectedComplaint.complaint.status !== "resolved" && (
                                    <Button
                                      className="bg-[#c9a382] hover:bg-[#b08e70]"
                                      size="sm"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          selectedComplaint.complaint.id,
                                          "resolved"
                                        )
                                      }
                                    >
                                      Resolved
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
