import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { getSocket, joinTenantRoom } from "@/lib/socket";
import { toast } from "sonner";

export interface ComplaintAssignment {
  assignee_type: "EMPLOYEE" | "DEPARTMENT";
  employee_id?: string | null;
  employee_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
}

export interface ComplaintItem {
  id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  external_reference_id?: string | null;
  status: "open" | "in_progress" | "resolved" | "deleted";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  sentiment: "HAPPY" | "NEUTRAL" | "FRUSTRATED" | "ANGRY";
  summary?: string | null;
  suggested_reply?: string | null;
  ai_reasoning?: string | null;
  ai_confidence?: number | null;
  sla_due_at?: string | null;
  is_sla_breached: boolean;
  is_correctly_classified: boolean;
  created_at: string;
  updated_at: string;
  assignment?: ComplaintAssignment | null;
}

export function useComplaints(tenantId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery<ComplaintItem[]>({
    queryKey: ["complaints"],
    queryFn: () => api.get<ComplaintItem[]>("/api/complaints/all"),
  });

  useEffect(() => {
    if (!tenantId) return;

    joinTenantRoom(tenantId);
    const socket = getSocket();

    const handleCreated = (newTicket: any) => {
      const isUnassigned = !newTicket.assignment;
      toast.info(
        isUnassigned
          ? `⚠️ Unassigned Complaint Received: ${newTicket.title || "Complaint"}`
          : `New Complaint Ingested: ${newTicket.title || "Complaint"}`,
        {
          description: isUnassigned
            ? "Requires Admin manual routing assignment"
            : `Priority: ${newTicket.ai_triage?.priority || "MEDIUM"}`,
        }
      );
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
    };

    const handleStatusChanged = (data: any) => {
      toast.success(`Ticket status updated to ${data.status}`);
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["complaints", data.id] });
    };

    const handleReassigned = () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    };

    const handleSlaBreached = (data: any) => {
      toast.error(`⚠️ SLA BREACH ALERT! ${data.breachedCount} ticket(s) breached SLA deadlines!`, {
        duration: 8000,
      });
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
    };

    socket.on("ticket:created", handleCreated);
    socket.on("ticket:status_changed", handleStatusChanged);
    socket.on("ticket:reassigned", handleReassigned);
    socket.on("sla:breached", handleSlaBreached);

    return () => {
      socket.off("ticket:created", handleCreated);
      socket.off("ticket:status_changed", handleStatusChanged);
      socket.off("ticket:reassigned", handleReassigned);
      socket.off("sla:breached", handleSlaBreached);
    };
  }, [tenantId, queryClient]);

  return query;
}

export function useComplaintDetails(complaintId: string) {
  return useQuery<ComplaintItem>({
    queryKey: ["complaints", complaintId],
    queryFn: () => api.get<ComplaintItem>(`/api/complaints/details/${complaintId}`),
    enabled: Boolean(complaintId),
  });
}

export function useUpdateComplaintStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { complaintId: string; status: "open" | "in_progress" | "resolved" }) =>
      api.patch<{ id: string; status: string; message: string }>("/api/complaints/update-status", variables),

    onMutate: async (newStatusData) => {
      await queryClient.cancelQueries({ queryKey: ["complaints"] });
      await queryClient.cancelQueries({ queryKey: ["complaints", newStatusData.complaintId] });

      const previousComplaints = queryClient.getQueryData<ComplaintItem[]>(["complaints"]);

      if (previousComplaints) {
        queryClient.setQueryData<ComplaintItem[]>(
          ["complaints"],
          previousComplaints.map((item) =>
            item.id === newStatusData.complaintId ? { ...item, status: newStatusData.status } : item
          )
        );
      }

      return { previousComplaints };
    },

    onError: (err: any, _newStatus, context) => {
      if (context?.previousComplaints) {
        queryClient.setQueryData(["complaints"], context.previousComplaints);
      }
      toast.error(err.message || "Failed to update complaint status");
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["complaints", variables.complaintId] });
    },
  });
}

export function useSendResolutionEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { complaintId: string; resolutionMessage?: string }) =>
      api.post<{ message: string; complaintId: string; status: string; email_sent: boolean }>(
        "/api/complaints/send-resolution-email",
        variables
      ),

    onSuccess: (data) => {
      if (data.email_sent) {
        toast.success("Complaint resolved & official email dispatched to customer!");
      } else {
        toast.warning(
          "Complaint marked as resolved, but email notification could not be delivered (RESEND_API_KEY unconfigured).",
          { duration: 6000 }
        );
      }
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["complaints", data.complaintId] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },

    onError: (err: any) => {
      toast.error(err.message || "Failed to send resolution email");
    },
  });
}

export function useAssignToEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { complaintId: string; employeeId: string }) =>
      api.patch<{ message: string }>("/api/complaints/assign-to-employee", variables),

    onSuccess: () => {
      toast.success("Complaint assigned directly to employee!");
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },

    onError: (err: any) => {
      toast.error(err.message || "Failed to assign complaint to employee");
    },
  });
}

export function useAssignToDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { complaintId: string; departmentId: string }) =>
      api.patch<{ message: string }>("/api/complaints/assign-to-department", variables),

    onSuccess: () => {
      toast.success("Complaint assigned to department & routed to minimum-loaded staff member!");
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },

    onError: (err: any) => {
      toast.error(err.message || "Failed to assign complaint to department");
    },
  });
}
