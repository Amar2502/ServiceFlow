"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export type RecentComplaint = {
  id: string;
  customer_name: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
};

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function formatRelative(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 24) return h <= 0 ? "Just now" : `${h}h ago`;
  return d.toLocaleDateString();
}

export function RecentComplaints({ items }: { items: RecentComplaint[] }) {
  if (items.length === 0) {
    return (
      <Card className="bg-white border-[#EED9C4]">
        <CardHeader>
          <CardTitle>Recent complaints</CardTitle>
          <CardDescription>Nothing yet — submit via the complaint API.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-[#EED9C4]">
      <CardHeader>
        <CardTitle>Recent complaints</CardTitle>
        <CardDescription>Newest tickets in your tenant.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/complaints/${c.id}`}
              className="flex items-start gap-4 p-3 rounded-lg hover:bg-[#f5eadf] transition-colors group block"
            >
              <Avatar className="h-10 w-10 bg-[#c9a382] text-white">
                <AvatarFallback>{initials(c.customer_name || "?")}</AvatarFallback>
              </Avatar>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate group-hover:text-indigo-600 transition-colors">
                    {c.customer_name}
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatRelative(c.created_at)}
                  </span>
                </div>
                <p className="text-sm font-medium text-[#8a6e53] truncate">{c.title}</p>
                {c.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                )}
                <Badge variant="outline" className="font-normal mt-1">
                  {c.status.replace("_", " ")}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
