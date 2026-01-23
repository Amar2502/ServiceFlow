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
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";

interface Assignment {
  id: string;
  complaint_id: string;
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
  assigned_at: string;
}

export default function MyAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Assignment | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      // Note: This endpoint would need to be created in backend
      // GET /api/complaints/my-assignments
      const response = await axios.get(
        "http://localhost:5000/api/complaints/my-assignments",
        { withCredentials: true }
      );
      setAssignments(response.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error("Failed to fetch assignments");
      }
      // If endpoint doesn't exist yet, use empty array
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleStatusUpdate = async (complaintId: string, newStatus: string) => {
    try {
      await axios.patch(
        "http://localhost:5000/api/complaints/update-status",
        { complaintId, status: newStatus },
        { withCredentials: true }
      );
      toast.success("Status updated successfully");
      fetchAssignments();
      setSelectedComplaint(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      open: {
        label: "Open",
        className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
        icon: <AlertCircle className="h-3 w-3 mr-1" />,
      },
      in_progress: {
        label: "In Progress",
        className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
        icon: <Clock className="h-3 w-3 mr-1" />,
      },
      resolved: {
        label: "Resolved",
        className: "bg-green-100 text-green-800 hover:bg-green-100",
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
      },
    };

    const config = statusConfig[status] || statusConfig.open;

    return (
      <Badge className={`${config.className} font-normal flex items-center gap-1`} variant="outline">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesStatus = statusFilter === "all" || assignment.complaint.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      assignment.complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.complaint.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.complaint.customer_email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: assignments.length,
    open: assignments.filter((a) => a.complaint.status === "open").length,
    in_progress: assignments.filter((a) => a.complaint.status === "in_progress").length,
    resolved: assignments.filter((a) => a.complaint.status === "resolved").length,
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Assignments</h1>
        <p className="text-muted-foreground">
          View and manage complaints assigned to you.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <AlertCircle className="h-4 w-4 text-[#c9a382]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.all}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.open}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.in_progress}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EED9C4]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.resolved}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-[#EED9C4]">
        <CardHeader>
          <CardTitle>Assigned Complaints</CardTitle>
          <CardDescription>
            Complaints that have been assigned to you for resolution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search complaints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-white w-[300px]"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status ({statusCounts.all})</SelectItem>
                <SelectItem value="open">Open ({statusCounts.open})</SelectItem>
                <SelectItem value="in_progress">In Progress ({statusCounts.in_progress})</SelectItem>
                <SelectItem value="resolved">Resolved ({statusCounts.resolved})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
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
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {assignments.length === 0
                        ? "No assignments found. You'll see complaints here once they're assigned to you."
                        : "No complaints match your filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium truncate">
                        {String(assignment.complaint.id).substring(0, 7)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assignment.complaint.customer_name}</div>
                          <div className="text-xs text-gray-500">
                            {assignment.complaint.customer_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px]">
                          <div className="font-medium truncate">{assignment.complaint.title}</div>
                          {assignment.complaint.description && (
                            <div className="text-xs text-gray-500 line-clamp-1">
                              {assignment.complaint.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(assignment.complaint.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
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
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-[#faf6f2] max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-[#5a3e2b]">
                                Complaint Details
                              </DialogTitle>
                              <DialogDescription>
                                Review and update the complaint status
                              </DialogDescription>
                            </DialogHeader>
                            {selectedComplaint && (
                              <div className="space-y-4 mt-4">
                                <div>
                                  <label className="text-sm font-medium text-[#5a3e2b]">
                                    Complaint ID
                                  </label>
                                  <p className="text-sm mt-1">{selectedComplaint.complaint.id}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-[#5a3e2b]">Title</label>
                                  <p className="text-sm mt-1">{selectedComplaint.complaint.title}</p>
                                </div>
                                {selectedComplaint.complaint.description && (
                                  <div>
                                    <label className="text-sm font-medium text-[#5a3e2b]">
                                      Description
                                    </label>
                                    <p className="text-sm mt-1 whitespace-pre-wrap">
                                      {selectedComplaint.complaint.description}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <label className="text-sm font-medium text-[#5a3e2b]">Customer</label>
                                  <p className="text-sm mt-1">
                                    {selectedComplaint.complaint.customer_name} (
                                    {selectedComplaint.complaint.customer_email})
                                  </p>
                                </div>
                                {selectedComplaint.complaint.external_reference_id && (
                                  <div>
                                    <label className="text-sm font-medium text-[#5a3e2b]">
                                      External Reference
                                    </label>
                                    <p className="text-sm mt-1">
                                      {selectedComplaint.complaint.external_reference_id}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <label className="text-sm font-medium text-[#5a3e2b]">
                                    Current Status
                                  </label>
                                  <div className="mt-2">
                                    {getStatusBadge(selectedComplaint.complaint.status)}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-[#5a3e2b] mb-2 block">
                                    Update Status
                                  </label>
                                  <div className="flex gap-2">
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
                                        Mark as Open
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
                                        Mark as In Progress
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
                                        Mark as Resolved
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <div className="pt-4 border-t">
                                  <p className="text-xs text-muted-foreground">
                                    Assigned: {formatDate(selectedComplaint.assigned_at)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Created: {formatDate(selectedComplaint.complaint.created_at)}
                                  </p>
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

