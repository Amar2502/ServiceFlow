"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSocket, joinUserRoom, joinTenantRoom, joinAdminRoom } from "@/lib/socket";
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

    if (user.role === "ADMIN") {
      joinAdminRoom(user.tenantId);
    }

    const handleTicketAssigned = (data: {
      complaintId: string;
      title: string;
      message: string;
      priority?: string;
      customerName?: string;
      timestamp?: string;
    }) => {
      const timestamp = data.timestamp || new Date().toISOString();

      addNotification({
        complaintId: data.complaintId,
        title: data.title || "Complaint Assigned",
        message: data.message || `Ticket #${data.complaintId.substring(0, 6)} assigned to you`,
        priority: data.priority,
        customerName: data.customerName,
        timestamp,
      });

      toast.info("🎟️ Complaint Assigned to You", {
        description: data.message || data.title,
        duration: 7000,
        action: {
          label: "View Ticket",
          onClick: () => router.push(`/dashboard/complaints/${data.complaintId}`),
        },
      });
    };

    const handleAdminNotification = (data: {
      complaintId: string;
      title: string;
      message: string;
      priority?: string;
      type?: string;
      confidence?: number;
      customerName?: string;
      timestamp?: string;
    }) => {
      const timestamp = data.timestamp || new Date().toISOString();

      addNotification({
        complaintId: data.complaintId,
        title: data.title || "Admin Notification",
        message: data.message,
        priority: data.priority,
        customerName: data.customerName,
        timestamp,
      });

      if (data.type === "low_confidence") {
        toast.warning("⚠️ Low AI Routing Confidence", {
          description: data.message,
          duration: 9000,
          action: {
            label: "Review Ticket",
            onClick: () => router.push(`/dashboard/complaints/${data.complaintId}`),
          },
        });
      } else {
        toast.info("📋 Complaint Ingested & Routed", {
          description: data.message,
          duration: 7000,
          action: {
            label: "View Ticket",
            onClick: () => router.push(`/dashboard/complaints/${data.complaintId}`),
          },
        });
      }
    };

    socket.on("ticket:assigned", handleTicketAssigned);
    socket.on("admin:notification", handleAdminNotification);

    return () => {
      socket.off("ticket:assigned", handleTicketAssigned);
      socket.off("admin:notification", handleAdminNotification);
    };
  }, [user, initializeForUser, addNotification, router]);
}
