"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ComplaintItem, useSendResolutionEmail } from "@/hooks/use-complaints";
import { Sparkles, MailCheck } from "lucide-react";
import { toast } from "sonner";

interface ResolutionEmailDialogProps {
  complaint: ComplaintItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResolutionEmailDialog({ complaint, open, onOpenChange }: ResolutionEmailDialogProps) {
  const sendEmailMutation = useSendResolutionEmail();
  const [resolutionMessage, setResolutionMessage] = useState("");

  useEffect(() => {
    if (complaint) {
      setResolutionMessage(
        complaint.suggested_reply ||
          `Dear ${complaint.customer_name || "Valued Customer"},\n\nWe have investigated your issue regarding "${complaint.title}" and confirmed that it has been resolved by our support team.\n\nThank you for choosing ServiceFlow.`
      );
    }
  }, [complaint]);

  if (!complaint) return null;

  const handleSendEmail = async () => {
    if (!complaint.customer_email) {
      toast.error("Complaint does not have a customer email address associated");
      return;
    }

    try {
      await sendEmailMutation.mutateAsync({
        complaintId: complaint.id,
        resolutionMessage,
      });

      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send resolution email");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#faf6f2]">
        <DialogHeader>
          <DialogTitle className="text-[#5a3e2b] flex items-center gap-2">
            <MailCheck className="h-5 w-5 text-emerald-600" />
            Send Official Resolution Email
          </DialogTitle>
          <DialogDescription>
            Approve and dispatch official resolution email to <strong>{complaint.customer_email}</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* AI Suggested Response Banner */}
        {complaint.suggested_reply && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-xs text-emerald-900 flex items-start gap-2 my-2">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-emerald-900">Groq AI Pre-Drafted Response:</strong>
              <p className="text-emerald-800 mt-0.5">Pre-populated into the response editor below. You may edit or send as-is.</p>
            </div>
          </div>
        )}

        <div className="space-y-3 mt-2">
          <label className="text-xs font-semibold text-slate-700">Official Resolution Message to Customer:</label>
          <Textarea
            value={resolutionMessage}
            onChange={(e) => setResolutionMessage(e.target.value)}
            className="bg-white border-[#dfc7ae] min-h-[140px] text-xs leading-relaxed"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sendEmailMutation.isPending || !resolutionMessage.trim()}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              Approve & Send Resolution Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
