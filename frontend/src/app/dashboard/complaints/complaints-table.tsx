"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, RotateCcw, MailCheck, MessageSquareText, AlertTriangle, Building2, UserCheck, ShieldAlert, ExternalLink } from "lucide-react";
import { ComplaintItem } from "@/hooks/use-complaints";
import Link from "next/link";

interface ComplaintsTableProps {
  complaints: ComplaintItem[];
  onStatusUpdate?: (complaint: ComplaintItem) => void;
  onSendResolutionEmail?: (complaint: ComplaintItem) => void;
  onOpenMessageThread?: (complaint: ComplaintItem) => void;
  onAssignTicket?: (complaint: ComplaintItem) => void;
  onDelete?: (complaint: ComplaintItem) => void;
  onRestore?: (complaint: ComplaintItem) => void;
}

export function ComplaintsTable({
  complaints,
  onStatusUpdate,
  onSendResolutionEmail,
  onOpenMessageThread,
  onAssignTicket,
  onDelete,
  onRestore,
}: ComplaintsTableProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      open: { label: "Open", className: "bg-blue-100 text-blue-800 border-blue-200" },
      in_progress: { label: "In Progress", className: "bg-purple-100 text-purple-800 border-purple-200" },
      resolved: { label: "Resolved", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
      deleted: { label: "Deleted", className: "bg-gray-100 text-gray-600 border-gray-200" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800 border-gray-200" };

    return (
      <Badge className={`${config.className} font-medium`} variant="outline">
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      URGENT: { label: "URGENT", className: "bg-red-100 text-red-800 border-red-200 font-bold" },
      HIGH: { label: "HIGH", className: "bg-amber-100 text-amber-800 border-amber-200 font-semibold" },
      MEDIUM: { label: "MEDIUM", className: "bg-blue-100 text-blue-800 border-blue-200" },
      LOW: { label: "LOW", className: "bg-gray-100 text-gray-700 border-gray-200" },
    };

    const config = priorityConfig[priority] || { label: priority || "MEDIUM", className: "bg-gray-100 text-gray-700 border-gray-200" };

    return (
      <Badge className={`${config.className}`} variant="outline">
        {config.label}
      </Badge>
    );
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case "HAPPY":
        return <span title="Sentiment: Happy">😊</span>;
      case "FRUSTRATED":
        return <span title="Sentiment: Frustrated">😣</span>;
      case "ANGRY":
        return <span title="Sentiment: Angry">😡</span>;
      default:
        return <span title="Sentiment: Neutral">😐</span>;
    }
  };

  const renderAssigneeBadge = (complaint: ComplaintItem) => {
    const assignment = complaint.assignment;

    if (!assignment) {
      return (
        <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-semibold flex items-center gap-1 text-[11px]">
          <ShieldAlert className="h-3 w-3 text-amber-700 animate-pulse" />
          Unassigned
        </Badge>
      );
    }

    if (assignment.employee_name) {
      return (
        <span className="text-xs text-slate-800 font-medium inline-flex items-center gap-1">
          <UserCheck className="h-3 w-3 text-blue-600" />
          {assignment.employee_name}
        </span>
      );
    }

    if (assignment.department_name) {
      return (
        <span className="text-xs text-slate-800 font-medium inline-flex items-center gap-1">
          <Building2 className="h-3 w-3 text-purple-600" />
          {assignment.department_name}
        </span>
      );
    }

    return <span className="text-xs text-slate-400">-</span>;
  };

  const renderSlaBadge = (complaint: ComplaintItem) => {
    if (complaint.status === "resolved") {
      return <span className="text-xs text-gray-500 font-medium">Resolved</span>;
    }

    if (complaint.is_sla_breached) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300 font-bold flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-red-600 animate-pulse" />
          SLA BREACHED
        </Badge>
      );
    }

    if (!complaint.sla_due_at) {
      return <span className="text-xs text-gray-400">-</span>;
    }

    const due = new Date(complaint.sla_due_at).getTime();
    const now = new Date().getTime();
    const diffHours = Math.round((due - now) / (1000 * 60 * 60));

    if (diffHours < 0) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300 font-bold">
          SLA BREACHED
        </Badge>
      );
    }

    return (
      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
        In {diffHours}h
      </span>
    );
  };

  return (
    <div className="rounded-md border border-[#EED9C4] bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-[#faf6f2]">
          <TableRow>
            <TableHead className="text-left w-[8ch]">ID</TableHead>
            <TableHead className="text-left">Customer</TableHead>
            <TableHead className="hidden md:table-cell text-left w-[220px]">Issue & AI Summary</TableHead>
            <TableHead className="text-left">Assignee</TableHead>
            <TableHead className="text-left">Priority</TableHead>
            <TableHead className="text-left">Status</TableHead>
            <TableHead className="hidden lg:table-cell text-left">SLA Target</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {complaints.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                No complaints found. Try adjusting your search query or filters.
              </TableCell>
            </TableRow>
          ) : (
            complaints.map((complaint) => {
              const isDeleted = complaint.status === "deleted";
              return (
                <TableRow key={complaint.id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold">
                    <Link
                      href={`/dashboard/complaints/${complaint.id}`}
                      className="text-slate-500 hover:text-indigo-600 hover:underline transition-colors"
                      title="View full complaint details"
                    >
                      #{complaint.id.substring(0, 6)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getSentimentEmoji(complaint.sentiment)}
                      <div>
                        <Link
                          href={`/dashboard/complaints/${complaint.id}`}
                          className="font-medium text-slate-900 hover:text-indigo-600 hover:underline transition-colors"
                        >
                          {complaint.customer_name || "Anonymous Customer"}
                        </Link>
                        <div className="text-xs text-slate-500">{complaint.customer_email || "No email"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-[220px]">
                    <div className="flex flex-col space-y-1">
                      <Link
                        href={`/dashboard/complaints/${complaint.id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-indigo-600 hover:underline truncate transition-colors"
                      >
                        {complaint.title}
                      </Link>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {complaint.summary || complaint.description || "No details provided"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{renderAssigneeBadge(complaint)}</TableCell>
                  <TableCell>{getPriorityBadge(complaint.priority)}</TableCell>
                  <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                  <TableCell className="hidden lg:table-cell">{renderSlaBadge(complaint)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/complaints/${complaint.id}`} className="flex items-center">
                            <ExternalLink className="h-4 w-4 mr-2 text-indigo-600" />
                            Open Ticket Details Page
                          </Link>
                        </DropdownMenuItem>
                        {onOpenMessageThread && (
                          <DropdownMenuItem onClick={() => onOpenMessageThread(complaint)}>
                            <MessageSquareText className="h-4 w-4 mr-2 text-blue-600" />
                            View Conversation & Notes
                          </DropdownMenuItem>
                        )}
                        {onAssignTicket && !isDeleted && (
                          <DropdownMenuItem onClick={() => onAssignTicket(complaint)}>
                            <Building2 className="h-4 w-4 mr-2 text-amber-700" />
                            {complaint.assignment ? "Reassign Ticket" : "Assign Ticket (Admin)"}
                          </DropdownMenuItem>
                        )}
                        {onSendResolutionEmail && complaint.status !== "resolved" && !isDeleted && (
                          <DropdownMenuItem onClick={() => onSendResolutionEmail(complaint)}>
                            <MailCheck className="h-4 w-4 mr-2 text-emerald-600" />
                            Approve & Resolution Email
                          </DropdownMenuItem>
                        )}
                        {onStatusUpdate && !isDeleted && (
                          <DropdownMenuItem onClick={() => onStatusUpdate(complaint)}>
                            <Edit className="h-4 w-4 mr-2 text-slate-600" />
                            Update Status
                          </DropdownMenuItem>
                        )}
                        {onDelete && !isDeleted && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(complaint)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Complaint
                            </DropdownMenuItem>
                          </>
                        )}
                        {onRestore && isDeleted && (
                          <DropdownMenuItem className="text-emerald-600" onClick={() => onRestore(complaint)}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restore Complaint
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}