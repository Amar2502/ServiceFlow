import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { getSocket, joinTicketRoom } from "@/lib/socket";
import { toast } from "sonner";

export interface TicketAttachment {
  fileId?: string;
  name?: string;
  url: string;
  fileType?: string;
}

export interface TicketMessageItem {
  id: string;
  complaint_id: string;
  sender_id?: string | null;
  sender_name?: string | null;
  sender_type: "CUSTOMER" | "AGENT" | "ADMIN" | "SYSTEM";
  is_internal: boolean;
  body: string;
  attachments?: TicketAttachment[] | null;
  created_at: string;
}

export interface ImageKitAuthParams {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
}

export function useTicketMessages(complaintId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<TicketMessageItem[]>({
    queryKey: ["ticket-messages", complaintId],
    queryFn: () => api.get<TicketMessageItem[]>(`/api/ticket-messages/${complaintId}`),
    enabled: Boolean(complaintId),
  });

  useEffect(() => {
    if (!complaintId) return;

    joinTicketRoom(complaintId);
    const socket = getSocket();

    const handleMessageReceived = (newMsg: TicketMessageItem) => {
      if (newMsg.complaint_id === complaintId) {
        queryClient.setQueryData<TicketMessageItem[]>(
          ["ticket-messages", complaintId],
          (oldMessages) => {
            if (!oldMessages) return [newMsg];
            if (oldMessages.some((m) => m.id === newMsg.id)) return oldMessages;
            return [...oldMessages, newMsg];
          }
        );
      }
    };

    socket.on("ticket:message_received", handleMessageReceived);

    return () => {
      socket.off("ticket:message_received", handleMessageReceived);
    };
  }, [complaintId, queryClient]);

  return query;
}

export function useCreateTicketMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      complaintId: string;
      body: string;
      isInternal?: boolean;
      senderType?: "CUSTOMER" | "AGENT" | "ADMIN" | "SYSTEM";
      attachments?: TicketAttachment[];
    }) => api.post<{ message: string; ticket_message: TicketMessageItem }>("/api/ticket-messages/create", variables),

    onMutate: async (newMsg) => {
      await queryClient.cancelQueries({ queryKey: ["ticket-messages", newMsg.complaintId] });

      const previousMessages = queryClient.getQueryData<TicketMessageItem[]>([
        "ticket-messages",
        newMsg.complaintId,
      ]);

      const optimisticMsg: TicketMessageItem = {
        id: `temp-${Date.now()}`,
        complaint_id: newMsg.complaintId,
        sender_type: newMsg.senderType || "AGENT",
        is_internal: Boolean(newMsg.isInternal),
        body: newMsg.body,
        attachments: newMsg.attachments || [],
        created_at: new Date().toISOString(),
      };

      if (previousMessages) {
        queryClient.setQueryData<TicketMessageItem[]>(
          ["ticket-messages", newMsg.complaintId],
          [...previousMessages, optimisticMsg]
        );
      }

      return { previousMessages };
    },

    onError: (err: any, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(["ticket-messages", variables.complaintId], context.previousMessages);
      }
      toast.error(err.message || "Failed to post message");
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", variables.complaintId] });
    },
  });
}

export function useImageKitAuth() {
  return useQuery<ImageKitAuthParams>({
    queryKey: ["imagekit-auth"],
    queryFn: () => api.get<ImageKitAuthParams>("/api/ticket-messages/imagekit-auth"),
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}
