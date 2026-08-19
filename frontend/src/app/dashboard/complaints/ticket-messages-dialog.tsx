"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ComplaintItem } from "@/hooks/use-complaints";
import { useTicketMessages, useCreateTicketMessage, useImageKitAuth } from "@/hooks/use-ticket-messages";
import { useSubmitAiFeedback } from "@/hooks/use-analytics";
import { Lock, Send, Paperclip, User, ShieldAlert, Sparkles, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";

interface TicketMessagesDialogProps {
  complaint: ComplaintItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketMessagesDialog({ complaint, open, onOpenChange }: TicketMessagesDialogProps) {
  const complaintId = complaint?.id || "";
  const { data: messages = [], isLoading } = useTicketMessages(complaintId);
  const createMessageMutation = useCreateTicketMessage();
  const submitFeedbackMutation = useSubmitAiFeedback();
  const { data: ikAuth } = useImageKitAuth();

  const [messageBody, setMessageBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string; fileType: string }[]>([]);

  if (!complaint) return null;

  const handleSendMessage = async () => {
    if (!messageBody.trim()) {
      toast.error("Please enter a message body");
      return;
    }

    try {
      await createMessageMutation.mutateAsync({
        complaintId,
        body: messageBody,
        isInternal,
        senderType: "AGENT",
        attachments,
      });

      setMessageBody("");
      setAttachments([]);
      toast.success(isInternal ? "Private internal note saved" : "Public reply sent");
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

      const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setAttachments((prev) => [...prev, { name: file.name, url: data.url, fileType: file.type }]);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#faf6f2] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-2 border-b border-[#dfc7ae]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <DialogTitle className="text-[#5a3e2b] text-xl flex items-center gap-2">
                Ticket #{complaint.id.substring(0, 7)} — {complaint.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                Customer: {complaint.customer_name} ({complaint.customer_email || "No email"})
              </DialogDescription>
            </div>
            <Badge className="bg-[#3d2a1c] text-[#faf6f2]">{complaint.priority} PRIORITY</Badge>
          </div>
        </DialogHeader>

        {/* AI Insight Box & Agent Feedback Loop */}
        {complaint.summary && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-900 space-y-2 my-2">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-amber-900">Groq AI Triage Summary:</strong> {complaint.summary}
                {complaint.ai_reasoning && (
                  <p className="text-amber-800/90 mt-1">
                    <strong>Reasoning:</strong> {complaint.ai_reasoning}
                  </p>
                )}
              </div>
            </div>

            {/* Human-in-the-Loop Feedback Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-amber-200/80 text-[11px]">
              <span className="font-semibold text-amber-900">AI Classification Accuracy Feedback:</span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] bg-white border-amber-300 hover:bg-emerald-50 text-slate-700"
                  onClick={() => submitFeedbackMutation.mutate({ complaintId, isCorrectlyClassified: true })}
                  disabled={submitFeedbackMutation.isPending}
                >
                  <ThumbsUp className="h-3 w-3 mr-1 text-emerald-600" /> Accurate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] bg-white border-amber-300 hover:bg-red-50 text-slate-700"
                  onClick={() => submitFeedbackMutation.mutate({ complaintId, isCorrectlyClassified: false })}
                  disabled={submitFeedbackMutation.isPending}
                >
                  <ThumbsDown className="h-3 w-3 mr-1 text-red-600" /> Incorrect AI Category
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Conversation Thread */}
        <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-white rounded-md border border-[#EED9C4] min-h-[250px] max-h-[350px]">
          {isLoading ? (
            <div className="text-center py-10 text-xs text-slate-400">Loading conversation thread...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No message thread history yet. Type a response or internal note below.
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg border text-xs text-slate-800 space-y-1 ${
                  msg.is_internal
                    ? "bg-amber-50/90 border-amber-200"
                    : msg.sender_type === "CUSTOMER"
                    ? "bg-blue-50/90 border-blue-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-1.5">
                    {msg.is_internal ? (
                      <Badge className="bg-amber-200 text-amber-900 hover:bg-amber-200 text-[10px] py-0">
                        <Lock className="h-2.5 w-2.5 mr-1" /> INTERNAL NOTE
                      </Badge>
                    ) : (
                      <span className="text-slate-900">{msg.sender_name || msg.sender_type}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(msg.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-slate-700">{msg.body}</p>

                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60 mt-2">
                    {msg.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-[10px] bg-white border px-2 py-1 rounded text-blue-600 hover:underline gap-1"
                      >
                        <Paperclip className="h-3 w-3" />
                        {att.name || `Attachment ${idx + 1}`}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Message Input Box */}
        <div className="space-y-2 pt-2 border-t border-[#dfc7ae]">
          <Tabs defaultValue="public" onValueChange={(val) => setIsInternal(val === "internal")}>
            <div className="flex items-center justify-between">
              <TabsList className="bg-[#e2d5c5]">
                <TabsTrigger value="public" className="text-xs">
                  Public Customer Reply
                </TabsTrigger>
                <TabsTrigger value="internal" className="text-xs flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Private Internal Note
                </TabsTrigger>
              </TabsList>

              <label className="cursor-pointer inline-flex items-center text-xs text-[#5a3e2b] hover:underline font-medium gap-1">
                <Paperclip className="h-3.5 w-3.5" />
                {uploading ? "Uploading..." : "Attach File (ImageKit)"}
                <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
              </label>
            </div>

            <TabsContent value="public" className="pt-2">
              <Textarea
                placeholder="Type response to customer..."
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="bg-white border-[#dfc7ae] min-h-[70px] text-xs"
              />
            </TabsContent>

            <TabsContent value="internal" className="pt-2">
              <div className="bg-amber-100/50 p-1.5 rounded text-[11px] text-amber-900 mb-1.5 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                Private internal notes are visible only to logged-in support agents and admins.
              </div>
              <Textarea
                placeholder="Type private staff investigation note..."
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="bg-amber-50/60 border-amber-300 min-h-[70px] text-xs"
              />
            </TabsContent>
          </Tabs>

          {/* Pending Uploaded File Chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              {attachments.map((att, i) => (
                <span key={i} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> {att.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs h-8">
              Close
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={createMessageMutation.isPending || !messageBody.trim()}
              className="bg-[#3d2a1c] hover:bg-[#2a1d14] text-[#faf6f2] text-xs h-8"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              {isInternal ? "Save Internal Note" : "Post Reply"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
