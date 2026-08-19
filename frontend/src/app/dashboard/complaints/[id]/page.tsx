"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  UserCheck,
  ShieldAlert,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Lock,
  Send,
  Paperclip,
  MailCheck,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Edit,
  User,
  Mail,
  FileText,
  Tag,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useComplaintDetails,
  useUpdateComplaintStatus,
  ComplaintItem,
} from "@/hooks/use-complaints";
import {
  useTicketMessages,
  useCreateTicketMessage,
  useImageKitAuth,
} from "@/hooks/use-ticket-messages";
import { useSubmitAiFeedback } from "@/hooks/use-analytics";
import { useAuth } from "@/components/auth-provider";
import { AssignTicketDialog } from "../assign-ticket-dialog";
import { ResolutionEmailDialog } from "../resolution-email-dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const complaintId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();

  const {
    data: complaint,
    isLoading: isComplaintLoading,
    error: complaintError,
    refetch: refetchComplaint,
  } = useComplaintDetails(complaintId);

  const {
    data: messages = [],
    isLoading: isMessagesLoading,
    refetch: refetchMessages,
  } = useTicketMessages(complaintId);

  const updateStatusMutation = useUpdateComplaintStatus();
  const createMessageMutation = useCreateTicketMessage();
  const submitFeedbackMutation = useSubmitAiFeedback();
  const { data: ikAuth } = useImageKitAuth();

  // Local UI State
  const [copiedId, setCopiedId] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<
    { name: string; url: string; fileType: string }[]
  >([]);

  // Action Dialog States
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  const copyComplaintId = () => {
    if (!complaint) return;
    navigator.clipboard.writeText(complaint.id);
    setCopiedId(true);
    toast.success("Complaint ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleStatusUpdate = async (
    newStatus: "open" | "in_progress" | "resolved"
  ) => {
    try {
      await updateStatusMutation.mutateAsync({
        complaintId,
        status: newStatus,
      });
      setShowStatusDialog(false);
      refetchComplaint();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleDelete = async () => {
    try {
      await api.patch("/api/complaints/delete", { complaintId });
      toast.success("Complaint soft-deleted successfully");
      setShowDeleteDialog(false);
      refetchComplaint();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete complaint");
    }
  };

  const handleRestore = async () => {
    try {
      await api.patch("/api/complaints/restore", { complaintId });
      toast.success("Complaint restored successfully");
      setShowRestoreDialog(false);
      refetchComplaint();
    } catch (err: any) {
      toast.error(err.message || "Failed to restore complaint");
    }
  };

  const handleSendMessage = async () => {
    if (!messageBody.trim()) {
      toast.error("Please enter a message or note before sending.");
      return;
    }

    try {
      await createMessageMutation.mutateAsync({
        complaintId,
        body: messageBody,
        isInternal: isInternalNote,
        senderType: "AGENT",
        attachments,
      });

      setMessageBody("");
      setAttachments([]);
      toast.success(
        isInternalNote
          ? "Private staff internal note posted"
          : "Public reply posted to thread"
      );
      refetchMessages();
    } catch (err: any) {
      toast.error(err.message || "Failed to post message");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ikAuth) {
      toast.error("ImageKit authentication parameters not ready");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);
      formData.append("publicKey", ikAuth.publicKey);
      formData.append("signature", ikAuth.signature);
      formData.append("expire", String(ikAuth.expire));
      formData.append("token", ikAuth.token);

      const res = await fetch(
        "https://upload.imagekit.io/api/v1/files/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      if (res.ok && data.url) {
        setAttachments((prev) => [
          ...prev,
          { name: file.name, url: data.url, fileType: file.type },
        ]);
        toast.success(`Uploaded ${file.name} to ImageKit successfully!`);
      } else {
        throw new Error(data.message || "ImageKit upload failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed uploading file to ImageKit");
    } finally {
      setUploading(false);
    }
  };

  const insertSuggestedReply = () => {
    if (complaint?.suggested_reply) {
      setMessageBody(complaint.suggested_reply);
      toast.success("Inserted Groq AI suggested reply into text box");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      open: {
        label: "Open",
        className: "bg-blue-100 text-blue-800 border-blue-300",
      },
      in_progress: {
        label: "In Progress",
        className: "bg-purple-100 text-purple-800 border-purple-300",
      },
      resolved: {
        label: "Resolved",
        className: "bg-emerald-100 text-emerald-800 border-emerald-300",
      },
      deleted: {
        label: "Deleted",
        className: "bg-gray-100 text-gray-600 border-gray-300",
      },
    };
    const config = statusConfig[status] || {
      label: status,
      className: "bg-gray-100 text-gray-800 border-gray-300",
    };

    return (
      <Badge
        className={`${config.className} font-semibold px-2.5 py-0.5 text-xs`}
        variant="outline"
      >
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<
      string,
      { label: string; className: string }
    > = {
      URGENT: {
        label: "🔴 URGENT",
        className: "bg-red-100 text-red-800 border-red-300 font-bold",
      },
      HIGH: {
        label: "🟠 HIGH",
        className: "bg-amber-100 text-amber-800 border-amber-300 font-semibold",
      },
      MEDIUM: {
        label: "🔵 MEDIUM",
        className: "bg-blue-100 text-blue-800 border-blue-300",
      },
      LOW: {
        label: "⚪ LOW",
        className: "bg-gray-100 text-gray-700 border-gray-300",
      },
    };
    const config = priorityConfig[priority] || {
      label: priority || "MEDIUM",
      className: "bg-gray-100 text-gray-700 border-gray-300",
    };

    return (
      <Badge className={`${config.className} text-xs px-2.5 py-0.5`} variant="outline">
        {config.label}
      </Badge>
    );
  };

  const getSentimentEmoji = (sentiment?: string) => {
    switch (sentiment) {
      case "HAPPY":
        return <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">😊 Happy</span>;
      case "FRUSTRATED":
        return <span className="inline-flex items-center gap-1 text-amber-700 font-medium">😣 Frustrated</span>;
      case "ANGRY":
        return <span className="inline-flex items-center gap-1 text-red-700 font-medium">😡 Angry</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-slate-600 font-medium">😐 Neutral</span>;
    }
  };

  const renderSlaBadge = (complaintItem: ComplaintItem) => {
    if (complaintItem.status === "resolved") {
      return (
        <span className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Resolved on Time
        </span>
      );
    }

    if (complaintItem.is_sla_breached) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300 font-bold flex items-center gap-1 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 text-red-600 animate-pulse" />
          SLA BREACHED
        </Badge>
      );
    }

    if (!complaintItem.sla_due_at) {
      return <span className="text-xs text-slate-400">No SLA set</span>;
    }

    const due = new Date(complaintItem.sla_due_at).getTime();
    const now = new Date().getTime();
    const diffHours = Math.round((due - now) / (1000 * 60 * 60));

    if (diffHours < 0) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300 font-bold flex items-center gap-1 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 text-red-600 animate-pulse" />
          SLA BREACHED
        </Badge>
      );
    }

    return (
      <span className="text-xs font-semibold text-slate-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5 text-amber-600" />
        Due in ~{diffHours} hour{diffHours === 1 ? "" : "s"}
      </span>
    );
  };

  if (isComplaintLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4 text-slate-500">
        <RefreshCw className="h-8 w-8 animate-spin text-[#c9a382]" />
        <p className="text-sm font-medium">Loading complaint #{complaintId.substring(0, 7)} details...</p>
      </div>
    );
  }

  if (complaintError || !complaint) {
    return (
      <div className="flex-1 space-y-6">
        <Link
          href="/dashboard/complaints"
          className="inline-flex items-center text-xs text-slate-600 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Complaints List
        </Link>
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800">Complaint Not Found</CardTitle>
            <CardDescription className="text-red-700 text-xs">
              The requested complaint ticket ID does not exist or has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/dashboard/complaints")}
              variant="outline"
              className="bg-white border-red-300 text-red-900 text-xs"
            >
              Return to All Complaints
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDeleted = complaint.status === "deleted";

  return (
    <div className="flex-1 overflow-auto space-y-6 pb-12">
      {/* Top Breadcrumbs & Nav */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/dashboard/complaints"
          className="inline-flex items-center text-xs font-semibold text-[#8a6e53] hover:text-[#5a3e2b] transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Complaints Queue
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white border-[#dfc7ae] text-xs"
            onClick={() => {
              refetchComplaint();
              refetchMessages();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-slate-600" />
            Refresh Details
          </Button>
        </div>
      </div>

      {/* Main Ticket Header Banner */}
      <Card className="bg-white border-[#EED9C4] shadow-sm overflow-hidden">
        <div className="bg-[#faf6f2] p-5 border-b border-[#EED9C4]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center flex-wrap gap-2">
                <span className="font-mono text-xs font-bold text-slate-500 bg-white border border-[#dfc7ae] px-2 py-0.5 rounded">
                  #{complaint.id.substring(0, 8)}
                </span>
                <button
                  onClick={copyComplaintId}
                  className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                  title="Copy full UUID"
                >
                  {copiedId ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                {getStatusBadge(complaint.status)}
                {getPriorityBadge(complaint.priority)}
                <span className="text-xs bg-white border border-[#dfc7ae] px-2 py-0.5 rounded font-medium">
                  {getSentimentEmoji(complaint.sentiment)}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#3d2a1c]">
                {complaint.title}
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                <span>Submitted: {new Date(complaint.created_at).toLocaleString()}</span>
                <span>•</span>
                <span>Last Activity: {new Date(complaint.updated_at).toLocaleString()}</span>
              </p>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!isDeleted && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white border-[#dfc7ae] text-xs text-slate-800"
                    onClick={() => setShowStatusDialog(true)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1.5 text-slate-600" />
                    Status
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white border-[#dfc7ae] text-xs text-slate-800"
                    onClick={() => setShowAssignDialog(true)}
                  >
                    <Building2 className="h-3.5 w-3.5 mr-1.5 text-amber-700" />
                    {complaint.assignment ? "Reassign" : "Assign Ticket"}
                  </Button>
                  {complaint.status !== "resolved" && (
                    <Button
                      size="sm"
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
                      onClick={() => setShowResolutionDialog(true)}
                    >
                      <MailCheck className="h-3.5 w-3.5 mr-1.5" />
                      Resolution Email
                    </Button>
                  )}
                </>
              )}

              {user?.role === "ADMIN" && (
                !isDeleted ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200 text-xs"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-semibold"
                    onClick={() => setShowRestoreDialog(true)}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Restore Ticket
                  </Button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Highlight Metadata Grid */}
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white">
          {/* Customer info */}
          <div className="p-3 rounded-lg bg-[#faf6f2] border border-[#f0e3d5] space-y-1">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-amber-800" /> Customer
            </span>
            <p className="text-sm font-semibold text-slate-900 truncate">
              {complaint.customer_name || "Anonymous Customer"}
            </p>
            <p className="text-xs text-slate-600 truncate flex items-center gap-1">
              <Mail className="h-3 w-3 text-slate-400 shrink-0" />
              {complaint.customer_email || "No email provided"}
            </p>
          </div>

          {/* Assignee Info */}
          <div className="p-3 rounded-lg bg-[#faf6f2] border border-[#f0e3d5] space-y-1">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-blue-700" /> Current Assignee
            </span>
            {complaint.assignment ? (
              <div>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {complaint.assignment.employee_name || complaint.assignment.department_name || "Assigned"}
                </p>
                <p className="text-xs text-slate-600 capitalize">
                  {complaint.assignment.assignee_type.toLowerCase()}{" "}
                  {complaint.assignment.department_name ? `(${complaint.assignment.department_name})` : ""}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-amber-800 font-bold flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600 animate-pulse" /> Unassigned
                </p>
                <p className="text-[11px] text-slate-500">Requires Admin routing</p>
              </div>
            )}
          </div>

          {/* SLA Target */}
          <div className="p-3 rounded-lg bg-[#faf6f2] border border-[#f0e3d5] space-y-1">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-purple-700" /> SLA Target
            </span>
            <div>{renderSlaBadge(complaint)}</div>
            {complaint.sla_due_at && (
              <p className="text-[11px] text-slate-500">
                Deadline: {new Date(complaint.sla_due_at).toLocaleString()}
              </p>
            )}
          </div>

          {/* AI Confidence / Status */}
          <div className="p-3 rounded-lg bg-[#faf6f2] border border-[#f0e3d5] space-y-1">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" /> Groq AI Triage
            </span>
            <p className="text-sm font-semibold text-slate-900">
              {complaint.ai_confidence
                ? `${Math.round(complaint.ai_confidence * 100)}% Confidence`
                : "AI Processed"}
            </p>
            <p className="text-[11px] text-slate-500">
              {complaint.is_correctly_classified ? "Zero-Shot Vector Route" : "Flagged for manual check"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Grid Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width): Ticket Content, Groq AI Details & Embedded Communication Thread */}
        <div className="lg:col-span-2 space-y-6">
          {/* Issue Details Card */}
          <Card className="bg-white border-[#EED9C4] shadow-sm">
            <CardHeader className="pb-3 border-b border-[#faf6f2]">
              <CardTitle className="text-base font-semibold text-[#5a3e2b] flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-800" />
                Original Complaint Description
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="bg-[#faf6f2] p-4 rounded-md border border-[#f0e3d5] text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {complaint.description || complaint.title || "No extended description provided by customer."}
              </div>
              {complaint.external_reference_id && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-slate-400" />
                  External Ref ID:{" "}
                  <span className="font-mono font-semibold text-slate-700">{complaint.external_reference_id}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Groq GenAI Summary & AI Draft Card */}
          {complaint.summary && (
            <Card className="bg-amber-50/70 border-amber-200 shadow-sm">
              <CardHeader className="pb-2 border-b border-amber-200/80">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    Groq GenAI Intelligence Summary
                  </CardTitle>
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                    Sub-200ms LLM Extraction
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-3 space-y-3 text-xs text-amber-950">
                <div>
                  <h4 className="font-bold text-amber-900">Executive Summary:</h4>
                  <p className="mt-0.5 text-amber-900/90 leading-normal">{complaint.summary}</p>
                </div>

                {complaint.ai_reasoning && (
                  <div>
                    <h4 className="font-bold text-amber-900">AI Routing & Priority Reasoning:</h4>
                    <p className="mt-0.5 text-amber-900/90 leading-normal">{complaint.ai_reasoning}</p>
                  </div>
                )}

                {complaint.suggested_reply && (
                  <div className="bg-white p-3 rounded border border-amber-300/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-amber-700" /> AI Suggested Resolution Reply:
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-amber-900 hover:bg-amber-100"
                        onClick={insertSuggestedReply}
                      >
                        <Copy className="h-3 w-3 mr-1" /> Use in Response Box
                      </Button>
                    </div>
                    <p className="text-xs text-slate-700 italic bg-amber-50/50 p-2 rounded border border-amber-200">
                      "{complaint.suggested_reply}"
                    </p>
                  </div>
                )}

                {/* AI Accuracy Feedback */}
                <div className="pt-2 border-t border-amber-200 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                  <span className="font-semibold text-amber-900">Human-in-the-Loop AI Feedback:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] bg-white border-amber-300 hover:bg-emerald-50 text-slate-700"
                      onClick={() =>
                        submitFeedbackMutation.mutate({
                          complaintId: complaint.id,
                          isCorrectlyClassified: true,
                        })
                      }
                      disabled={submitFeedbackMutation.isPending}
                    >
                      <ThumbsUp className="h-3 w-3 mr-1 text-emerald-600" /> Accurate Triage
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] bg-white border-amber-300 hover:bg-red-50 text-slate-700"
                      onClick={() =>
                        submitFeedbackMutation.mutate({
                          complaintId: complaint.id,
                          isCorrectlyClassified: false,
                        })
                      }
                      disabled={submitFeedbackMutation.isPending}
                    >
                      <ThumbsDown className="h-3 w-3 mr-1 text-red-600" /> Incorrect Triage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Embedded Full Timeline & Message Thread */}
          <Card className="bg-white border-[#EED9C4] shadow-sm">
            <CardHeader className="pb-3 border-b border-[#faf6f2]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base font-semibold text-[#5a3e2b]">
                    Live Conversation Thread & Internal Notes
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Collaborate with staff using private notes or communicate directly with the customer.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-[#faf6f2] text-xs">
                  {messages.length} Message{messages.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Message List */}
              <div className="space-y-3 min-h-[220px] max-h-[450px] overflow-y-auto pr-1">
                {isMessagesLoading ? (
                  <div className="text-center py-12 text-xs text-slate-400">
                    Loading conversation messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 bg-[#faf6f2] rounded-md border border-dashed border-[#dfc7ae]">
                    No messages or notes posted yet. Start the conversation below.
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-lg border text-xs text-slate-800 space-y-1.5 transition-all ${
                        msg.is_internal
                          ? "bg-amber-50/90 border-amber-300"
                          : msg.sender_type === "CUSTOMER"
                          ? "bg-blue-50/90 border-blue-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <div className="flex items-center gap-2">
                          {msg.is_internal ? (
                            <Badge className="bg-amber-200 text-amber-900 hover:bg-amber-200 text-[10px] py-0 px-2 font-bold">
                              <Lock className="h-2.5 w-2.5 mr-1" /> INTERNAL NOTE
                            </Badge>
                          ) : (
                            <span className="text-slate-900 font-bold flex items-center gap-1">
                              <User className="h-3 w-3 text-slate-500" />
                              {msg.sender_name || msg.sender_type}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-slate-700 leading-relaxed text-xs">
                        {msg.body}
                      </p>

                      {/* File Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/70 mt-2">
                          {msg.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-[10px] bg-white border px-2.5 py-1 rounded-md text-blue-600 hover:underline gap-1 shadow-xs"
                            >
                              <Paperclip className="h-3 w-3 text-blue-500" />
                              {att.name || `Attachment ${idx + 1}`}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Live Interactive Composer */}
              <div className="space-y-3 pt-3 border-t border-[#dfc7ae]">
                <Tabs
                  defaultValue="public"
                  onValueChange={(val) => setIsInternalNote(val === "internal")}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <TabsList className="bg-[#e2d5c5]">
                      <TabsTrigger value="public" className="text-xs">
                        Public Customer Reply
                      </TabsTrigger>
                      <TabsTrigger value="internal" className="text-xs flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Private Staff Note
                      </TabsTrigger>
                    </TabsList>

                    <label className="cursor-pointer inline-flex items-center text-xs text-[#5a3e2b] hover:underline font-medium gap-1 bg-[#faf6f2] px-2.5 py-1 rounded border border-[#dfc7ae]">
                      <Paperclip className="h-3.5 w-3.5 text-amber-800" />
                      {uploading ? "Uploading..." : "Attach File (ImageKit)"}
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>

                  <TabsContent value="public" className="pt-2">
                    <Textarea
                      placeholder="Type response to customer..."
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      className="bg-white border-[#dfc7ae] min-h-[90px] text-xs focus:ring-[#c9a382]"
                    />
                  </TabsContent>

                  <TabsContent value="internal" className="pt-2">
                    <div className="bg-amber-100/60 p-2 rounded text-[11px] text-amber-900 mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                      Private internal notes are visible only to logged-in support agents and admins.
                    </div>
                    <Textarea
                      placeholder="Type private staff investigation note..."
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      className="bg-amber-50/60 border-amber-300 min-h-[90px] text-xs focus:ring-amber-400"
                    />
                  </TabsContent>
                </Tabs>

                {/* Uploaded File Chips */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {attachments.map((att, i) => (
                      <span
                        key={i}
                        className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border border-blue-200"
                      >
                        <Paperclip className="h-3 w-3" /> {att.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  {complaint.suggested_reply ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-amber-900 border-amber-300 bg-amber-50 hover:bg-amber-100"
                      onClick={insertSuggestedReply}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-600" />
                      Insert AI Reply
                    </Button>
                  ) : (
                    <div />
                  )}

                  <Button
                    onClick={handleSendMessage}
                    disabled={createMessageMutation.isPending || !messageBody.trim()}
                    className="bg-[#3d2a1c] hover:bg-[#2a1d14] text-[#faf6f2] text-xs h-9 px-4"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {isInternalNote ? "Save Internal Note" : "Post Public Reply"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3 width): Ticket Management & System Details */}
        <div className="space-y-6">
          {/* Quick Status Control Panel */}
          <Card className="bg-white border-[#EED9C4] shadow-sm">
            <CardHeader className="pb-3 border-b border-[#faf6f2]">
              <CardTitle className="text-sm font-bold text-[#5a3e2b]">
                Ticket Lifecycle & Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Change Status:</label>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant={complaint.status === "open" ? "default" : "outline"}
                    size="sm"
                    className="w-full text-xs justify-start"
                    onClick={() => handleStatusUpdate("open")}
                    disabled={complaint.status === "open" || isDeleted}
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-500 mr-2" />
                    Mark as Open
                  </Button>
                  <Button
                    variant={complaint.status === "in_progress" ? "default" : "outline"}
                    size="sm"
                    className="w-full text-xs justify-start"
                    onClick={() => handleStatusUpdate("in_progress")}
                    disabled={complaint.status === "in_progress" || isDeleted}
                  >
                    <span className="h-2 w-2 rounded-full bg-purple-500 mr-2" />
                    Mark as In Progress
                  </Button>
                  <Button
                    variant={complaint.status === "resolved" ? "default" : "outline"}
                    size="sm"
                    className="w-full text-xs justify-start bg-emerald-700 hover:bg-emerald-800 text-white"
                    onClick={() => handleStatusUpdate("resolved")}
                    disabled={complaint.status === "resolved" || isDeleted}
                  >
                    <span className="h-2 w-2 rounded-full bg-white mr-2" />
                    Mark as Resolved
                  </Button>
                </div>
              </div>

              <hr className="border-[#f0e3d5] my-2" />

              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-white border-[#dfc7ae] text-xs justify-start text-slate-800"
                  onClick={() => setShowAssignDialog(true)}
                  disabled={isDeleted}
                >
                  <Building2 className="h-3.5 w-3.5 mr-2 text-amber-700" />
                  {complaint.assignment ? "Reassign Ticket" : "Assign to Staff"}
                </Button>

                {complaint.status !== "resolved" && !isDeleted && (
                  <Button
                    size="sm"
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs justify-start"
                    onClick={() => setShowResolutionDialog(true)}
                  >
                    <MailCheck className="h-3.5 w-3.5 mr-2" />
                    Approve & Send Resolution Email
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SLA Target Breakdown Card */}
          <Card className="bg-white border-[#EED9C4] shadow-sm">
            <CardHeader className="pb-3 border-b border-[#faf6f2]">
              <CardTitle className="text-sm font-bold text-[#5a3e2b] flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-purple-700" />
                SLA Policy Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs space-y-2.5">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="font-semibold text-red-700">URGENT</span>
                <span className="text-slate-600">2 Hours Target</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="font-semibold text-amber-700">HIGH</span>
                <span className="text-slate-600">6 Hours Target</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="font-semibold text-blue-700">MEDIUM</span>
                <span className="text-slate-600">24 Hours Target</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-semibold text-slate-700">LOW</span>
                <span className="text-slate-600">48 Hours Target</span>
              </div>
            </CardContent>
          </Card>

          {/* System Metadata Card */}
          <Card className="bg-white border-[#EED9C4] shadow-sm">
            <CardHeader className="pb-3 border-b border-[#faf6f2]">
              <CardTitle className="text-sm font-bold text-[#5a3e2b]">
                System Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 text-xs space-y-2 text-slate-600 font-mono">
              <div>
                <span className="text-slate-400 font-sans block text-[11px]">Tenant ID:</span>
                <span className="truncate block font-semibold text-slate-800">
                  {complaint.tenant_id}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-sans block text-[11px]">Full Ticket UUID:</span>
                <span className="break-all font-semibold text-slate-800">{complaint.id}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog Modals */}
      <AssignTicketDialog
        complaint={complaint}
        open={showAssignDialog}
        onOpenChange={(open) => {
          setShowAssignDialog(open);
          if (!open) refetchComplaint();
        }}
      />

      <ResolutionEmailDialog
        complaint={complaint}
        open={showResolutionDialog}
        onOpenChange={(open) => {
          setShowResolutionDialog(open);
          if (!open) refetchComplaint();
        }}
      />

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="bg-[#faf6f2]">
          <DialogHeader>
            <DialogTitle className="text-[#5a3e2b]">Update Complaint Status</DialogTitle>
            <DialogDescription>
              Select new status for ticket #{complaint.id.substring(0, 7)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <Button
              variant={complaint.status === "open" ? "default" : "outline"}
              className="w-full text-xs"
              onClick={() => handleStatusUpdate("open")}
              disabled={complaint.status === "open"}
            >
              Open
            </Button>
            <Button
              variant={complaint.status === "in_progress" ? "default" : "outline"}
              className="w-full text-xs"
              onClick={() => handleStatusUpdate("in_progress")}
              disabled={complaint.status === "in_progress"}
            >
              In Progress
            </Button>
            <Button
              variant={complaint.status === "resolved" ? "default" : "outline"}
              className="w-full bg-[#c9a382] hover:bg-[#b08e70] text-xs"
              onClick={() => handleStatusUpdate("resolved")}
              disabled={complaint.status === "resolved"}
            >
              Resolved
            </Button>
          </div>
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
            <Button className="bg-red-600 hover:bg-red-700 text-xs text-white" onClick={handleDelete}>
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
            <DialogDescription>
              Restore complaint #{complaint.id.substring(0, 7)} back to active queue?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)} className="text-xs">
              Cancel
            </Button>
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-xs text-white" onClick={handleRestore}>
              Restore Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
