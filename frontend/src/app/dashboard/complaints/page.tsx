"use client";

import { useState } from "react";
import { Download, Search, Key } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ComplaintsTable } from "./complaints-table";
import { TicketMessagesDialog } from "./ticket-messages-dialog";
import { ResolutionEmailDialog } from "./resolution-email-dialog";
import { AssignTicketDialog } from "./assign-ticket-dialog";
import { useComplaints, useUpdateComplaintStatus, ComplaintItem } from "@/hooks/use-complaints";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ComplaintsPage() {
  const { user } = useAuth();
  const { data: complaints = [], isLoading, refetch } = useComplaints(user?.tenantId);
  const updateStatusMutation = useUpdateComplaintStatus();

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintItem | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  const handleStatusUpdate = async (complaintId: string, newStatus: "open" | "in_progress" | "resolved") => {
    try {
      await updateStatusMutation.mutateAsync({ complaintId, status: newStatus });
      setShowStatusDialog(false);
      setSelectedComplaint(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!selectedComplaint) return;
    try {
      await api.patch("/api/complaints/delete", { complaintId: selectedComplaint.id });
      toast.success("Complaint soft-deleted successfully");
      refetch();
      setShowDeleteDialog(false);
      setSelectedComplaint(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete complaint");
    }
  };

  const handleRestore = async () => {
    if (!selectedComplaint) return;
    try {
      await api.patch("/api/complaints/restore", { complaintId: selectedComplaint.id });
      toast.success("Complaint restored successfully");
      refetch();
      setShowRestoreDialog(false);
      setSelectedComplaint(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to restore complaint");
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "deleted" && Boolean(c.status === "deleted")) ||
      (statusFilter === "unassigned" && !c.assignment) ||
      (statusFilter !== "deleted" && statusFilter !== "unassigned" && c.status === statusFilter);

    const matchesPriority = priorityFilter === "all" || c.priority === priorityFilter;

    const matchesSearch =
      searchQuery === "" ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.customer_name && c.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.customer_email && c.customer_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.external_reference_id && c.external_reference_id.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesPriority && matchesSearch;
  });

  const activeComplaints = complaints.filter((c) => c.status !== "deleted");
  const unassignedComplaints = activeComplaints.filter((c) => !c.assignment);
  const deletedComplaints = complaints.filter((c) => c.status === "deleted");

  return (
    <div className="flex-1 overflow-auto space-y-5">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3d2a1c]">
            Complaint Triage & Resolution Center
          </h1>
          <p className="text-sm text-slate-500">
            Real-time multi-tenant complaint management, SLA enforcement, and Groq GenAI triage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/apikeys">
            <Button variant="outline" className="bg-white border-[#dfc7ae] text-xs font-medium">
              <Key className="h-4 w-4 mr-1.5 text-amber-800" />
              API Key Credentials
            </Button>
          </Link>
        </div>
      </div>

      <Card className="bg-white border-[#EED9C4] shadow-sm">
        <CardHeader className="pb-3 border-b border-[#faf6f2]">
          <CardTitle className="text-lg font-semibold text-[#5a3e2b]">All Ingested Complaints</CardTitle>
          <CardDescription>
            Track tickets through their automated SLA resolution lifecycle
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4 gap-3 flex-wrap">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search title, customer, ref ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-white w-[280px] text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Priority Filter */}
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px] bg-white text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="URGENT">🔴 URGENT</SelectItem>
                  <SelectItem value="HIGH">🟠 HIGH</SelectItem>
                  <SelectItem value="MEDIUM">🔵 MEDIUM</SelectItem>
                  <SelectItem value="LOW">⚪ LOW</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[170px] bg-white text-xs">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({activeComplaints.length})</SelectItem>
                  <SelectItem value="unassigned">
                    ⚠️ Unassigned ({unassignedComplaints.length})
                  </SelectItem>
                  <SelectItem value="open">Open ({activeComplaints.filter((c) => c.status === "open").length})</SelectItem>
                  <SelectItem value="in_progress">
                    In Progress ({activeComplaints.filter((c) => c.status === "in_progress").length})
                  </SelectItem>
                  <SelectItem value="resolved">
                    Resolved ({activeComplaints.filter((c) => c.status === "resolved").length})
                  </SelectItem>
                  <SelectItem value="deleted">Deleted ({deletedComplaints.length})</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" className="bg-white text-xs">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-xs text-slate-400">Loading complaints with TanStack Query...</div>
          ) : (
            <ComplaintsTable
              complaints={filteredComplaints}
              onStatusUpdate={(complaint) => {
                setSelectedComplaint(complaint);
                setShowStatusDialog(true);
              }}
              onSendResolutionEmail={(complaint) => {
                setSelectedComplaint(complaint);
                setShowResolutionDialog(true);
              }}
              onOpenMessageThread={(complaint) => {
                setSelectedComplaint(complaint);
                setShowMessageDialog(true);
              }}
              onAssignTicket={
                user?.role === "ADMIN"
                  ? (complaint) => {
                      setSelectedComplaint(complaint);
                      setShowAssignDialog(true);
                    }
                  : undefined
              }
              onDelete={
                user?.role === "ADMIN"
                  ? (complaint) => {
                      setSelectedComplaint(complaint);
                      setShowDeleteDialog(true);
                    }
                  : undefined
              }
              onRestore={
                user?.role === "ADMIN"
                  ? (complaint) => {
                      setSelectedComplaint(complaint);
                      setShowRestoreDialog(true);
                    }
                  : undefined
              }
            />
          )}
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

      {/* Assign / Reassign Ticket Modal */}
      <AssignTicketDialog
        complaint={selectedComplaint}
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
      />

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="bg-[#faf6f2]">
          <DialogHeader>
            <DialogTitle className="text-[#5a3e2b]">Update Complaint Status</DialogTitle>
            <DialogDescription>Select new status for ticket #{selectedComplaint?.id.substring(0, 7)}</DialogDescription>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-2 mt-2">
              <Button
                variant={selectedComplaint.status === "open" ? "default" : "outline"}
                className="w-full text-xs"
                onClick={() => handleStatusUpdate(selectedComplaint.id, "open")}
                disabled={selectedComplaint.status === "open"}
              >
                Open
              </Button>
              <Button
                variant={selectedComplaint.status === "in_progress" ? "default" : "outline"}
                className="w-full text-xs"
                onClick={() => handleStatusUpdate(selectedComplaint.id, "in_progress")}
                disabled={selectedComplaint.status === "in_progress"}
              >
                In Progress
              </Button>
              <Button
                variant={selectedComplaint.status === "resolved" ? "default" : "outline"}
                className="w-full bg-[#c9a382] hover:bg-[#b08e70] text-xs"
                onClick={() => handleStatusUpdate(selectedComplaint.id, "resolved")}
                disabled={selectedComplaint.status === "resolved"}
              >
                Resolved
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[#faf6f2]">
          <DialogHeader>
            <DialogTitle className="text-[#5a3e2b]">Soft Delete Complaint</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this complaint? Load counters will automatically recalibrate.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="text-xs">
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-xs" onClick={handleDelete}>
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="bg-[#faf6f2]">
          <DialogHeader>
            <DialogTitle className="text-[#5a3e2b]">Restore Complaint</DialogTitle>
            <DialogDescription>Restore complaint #{selectedComplaint?.id.substring(0, 7)} back to active queue?</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)} className="text-xs">
              Cancel
            </Button>
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-xs" onClick={handleRestore}>
              Restore Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
