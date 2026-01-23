"use client";

import { Download, Search, MoreHorizontal, Trash2, RotateCcw } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ComplaintsTable } from "./complaints-table";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import { Key } from "lucide-react";

interface Complaint {
  id: string;
  title: string;
  customer_name: string;
  customer_email: string;
  description?: string;
  status: string;
  external_reference_id?: string;
  created_at: string;
  deleted_at?: string | null;
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/api/complaints/all", {
        withCredentials: true,
      });
      setComplaints(response.data);
    } catch (error: any) {
      toast.error("Failed to fetch complaints");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleStatusUpdate = async (complaintId: string, newStatus: string) => {
    try {
      await axios.patch(
        "http://localhost:5000/api/complaints/update-status",
        { complaintId, status: newStatus },
        { withCredentials: true }
      );
      toast.success("Status updated successfully");
      fetchComplaints();
      setShowStatusDialog(false);
      setSelectedComplaint(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!selectedComplaint) return;
    try {
      await axios.patch(
        "http://localhost:5000/api/complaints/delete",
        { complaintId: selectedComplaint.id },
        { withCredentials: true }
      );
      toast.success("Complaint deleted successfully");
      fetchComplaints();
      setShowDeleteDialog(false);
      setSelectedComplaint(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete complaint");
    }
  };

  const handleRestore = async () => {
    if (!selectedComplaint) return;
    try {
      await axios.patch(
        "http://localhost:5000/api/complaints/restore",
        { complaintId: selectedComplaint.id },
        { withCredentials: true }
      );
      toast.success("Complaint restored successfully");
      fetchComplaints();
      setShowRestoreDialog(false);
      setSelectedComplaint(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to restore complaint");
    }
  };

  const filteredComplaints = complaints.filter((complaint) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "deleted" && complaint.deleted_at) ||
      (statusFilter !== "deleted" && complaint.status === statusFilter && !complaint.deleted_at);
    const matchesSearch =
      searchQuery === "" ||
      complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (complaint.external_reference_id &&
        complaint.external_reference_id.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const activeComplaints = complaints.filter((c) => !c.deleted_at);
  const deletedComplaints = complaints.filter((c) => c.deleted_at);

  return (
    <div className="flex-1 overflow-auto space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Complaint Management
          </h1>
          <p className="text-muted-foreground">
            View and manage all customer complaints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/apikeys">
            <Button variant="outline" className="bg-white">
              <Key className="h-4 w-4 mr-2" />
              API Keys
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Complaints are created via API. Use your{" "}
          <Link href="/dashboard/apikeys" className="underline font-semibold">
            API key
          </Link>{" "}
          to submit complaints programmatically. View{" "}
          <Link href="/dashboard/api-docs" className="underline font-semibold">
            API documentation
          </Link>{" "}
          for integration details.
        </p>
      </div>

      <Card className="bg-white border-[#EED9C4]">
        <CardHeader>
          <CardTitle>All Complaints</CardTitle>
          <CardDescription>
            Manage and track customer complaints through their lifecycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
            <div className="flex items-center space-x-2">
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
            </div>

            <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All ({activeComplaints.length})
                  </SelectItem>
                  <SelectItem value="open">
                    Open ({activeComplaints.filter((c) => c.status === "open").length})
                  </SelectItem>
                  <SelectItem value="in_progress">
                    In Progress (
                    {activeComplaints.filter((c) => c.status === "in_progress").length})
                  </SelectItem>
                  <SelectItem value="resolved">
                    Resolved (
                    {activeComplaints.filter((c) => c.status === "resolved").length})
                  </SelectItem>
                  <SelectItem value="deleted">
                    Deleted ({deletedComplaints.length})
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" className="bg-white">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <ComplaintsTable
              complaints={filteredComplaints}
              onStatusUpdate={(complaint) => {
                setSelectedComplaint(complaint);
                setShowStatusDialog(true);
              }}
              onDelete={(complaint) => {
                setSelectedComplaint(complaint);
                setShowDeleteDialog(true);
              }}
              onRestore={(complaint) => {
                setSelectedComplaint(complaint);
                setShowRestoreDialog(true);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="bg-[#faf6f2]">
          <DialogHeader>
            <DialogTitle className="text-[#5a3e2b]">Update Complaint Status</DialogTitle>
            <DialogDescription>
              Select the new status for this complaint
            </DialogDescription>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-3 mt-4">
              <Button
                variant={selectedComplaint.status === "open" ? "default" : "outline"}
                className="w-full"
                onClick={() => handleStatusUpdate(selectedComplaint.id, "open")}
                disabled={selectedComplaint.status === "open"}
              >
                Open
              </Button>
              <Button
                variant={selectedComplaint.status === "in_progress" ? "default" : "outline"}
                className="w-full"
                onClick={() => handleStatusUpdate(selectedComplaint.id, "in_progress")}
                disabled={selectedComplaint.status === "in_progress"}
              >
                In Progress
              </Button>
              <Button
                variant={selectedComplaint.status === "resolved" ? "default" : "outline"}
                className="w-full bg-[#c9a382] hover:bg-[#b08e70]"
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
            <DialogTitle className="text-[#5a3e2b]">Delete Complaint</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this complaint? This action can be undone by
              restoring it later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="bg-[#faf6f2]">
          <DialogHeader>
            <DialogTitle className="text-[#5a3e2b]">Restore Complaint</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore this complaint?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#c9a382] hover:bg-[#b08e70]"
              onClick={handleRestore}
            >
              Restore
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
