"use client";

import { Bell, CheckCheck, Trash2, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotificationStore } from "@/store/useNotificationStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationBell() {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const router = useRouter();

  const handleNotificationClick = (complaintId: string, notifId: string) => {
    markAsRead(notifId);
    if (complaintId) {
      router.push(`/dashboard/complaints/${complaintId}`);
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case "URGENT":
        return <Badge className="bg-red-100 text-red-800 text-[9px] py-0">URGENT</Badge>;
      case "HIGH":
        return <Badge className="bg-amber-100 text-amber-800 text-[9px] py-0">HIGH</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800 text-[9px] py-0">ASSIGNED</Badge>;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative bg-white border-[#dfc7ae] hover:bg-[#faf6f2] text-[#3d2a1c]"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 bg-[#faf6f2] border-[#dfc7ae] shadow-lg p-0">
        <div className="flex items-center justify-between p-3 border-b border-[#dfc7ae] bg-[#EED9C4]">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#3d2a1c]" />
            <h3 className="font-bold text-xs text-[#3d2a1c]">Assigned Ticket Notifications</h3>
            {unreadCount > 0 && (
              <Badge className="bg-red-600 text-white text-[10px] py-0 font-bold">
                {unreadCount} Unread
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] text-[#5a3e2b] hover:bg-[#dfc7ae] px-1.5"
                onClick={() => markAllAsRead()}
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1 text-emerald-700" /> Read All
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] text-red-700 hover:bg-red-100 px-1.5"
                onClick={() => clearAll()}
                title="Clear all notifications"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-[#dfc7ae]/60">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">No Notifications</p>
              <p className="text-[11px] text-slate-400">
                Newly assigned complaints and live socket alerts will appear here.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => handleNotificationClick(n.complaintId, n.id)}
                className={`p-3 cursor-pointer flex flex-col items-start gap-1 transition-colors ${
                  n.read ? "bg-white/60 opacity-80" : "bg-white font-medium border-l-4 border-l-amber-600"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    {!n.read && <span className="h-2 w-2 rounded-full bg-amber-600 shrink-0" />}
                    <span className="font-mono text-[11px] font-bold text-slate-700">
                      #{n.complaintId.substring(0, 7)}
                    </span>
                    {getPriorityBadge(n.priority)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-900 line-clamp-1">{n.title}</p>
                <p className="text-[11px] text-slate-600 line-clamp-2">{n.message}</p>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
