"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSocket, joinUserRoom, joinTenantRoom } from "@/lib/socket";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { toast } from "sonner";

export function useSocketNotifications() {
  const user = useAuthStore((s) => s.user);
  const initializeForUser = useNotificationStore((s) => s.initializeForUser);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const router = useRouter();

  useEffect(() => {
    if (!user || !user.userId) return;

    initializeForUser(user.userId);

    const socket = getSocket();

    joinTenantRoom(user.tenantId);
    joinUserRoom(user.userId);

    const handleTicketAssigned = (data: {
      complaintId: string;
      title: string;
      message: string;
      priority?: string;
      customerName?: string;
      timestamp?: string;
    }) => {
      const timestamp = data.timestamp || new Date().toISOString();

      // 1. Store in notification store (persisted for Bell icon)
      addNotification({
        complaintId: data.complaintId,
        title: data.title || "Complaint Assigned",
        message: data.message || `Ticket #${data.complaintId.substring(0, 6)} assigned to you`,
        priority: data.priority,
        customerName: data.customerName,
        timestamp,
      });

      // 2. Trigger real-time interactive Toast notification on active screen
      toast.info("🎟️ Complaint Assigned to You", {
        description: data.message || data.title,
        duration: 7000,
        action: {
          label: "View Ticket",
          onClick: () => router.push(`/dashboard/complaints/${data.complaintId}`),
        },
      });
    };

    socket.on("ticket:assigned", handleTicketAssigned);

    return () => {
      socket.off("ticket:assigned", handleTicketAssigned);
    };
  }, [user, initializeForUser, addNotification, router]);
}
