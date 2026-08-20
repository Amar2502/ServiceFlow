"use client";

import { useAuth } from "@/components/auth-provider";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface RbacGuardProps {
  children: React.ReactNode;
  allowedRoles?: ("ADMIN" | "AGENT")[];
}

export function RbacGuard({ children, allowedRoles = ["ADMIN"] }: RbacGuardProps) {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Verifying authorization...
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex-1 space-y-5 p-4 md:p-8">
        <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-red-950 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Access Restricted (RBAC Enforcement)</h2>
              <p className="text-xs text-red-800 mt-0.5">
                Your current account role is <span className="font-mono font-bold">{user?.role || "GUEST"}</span>. This section requires <span className="font-mono font-bold">{allowedRoles.join(" or ")}</span> authority.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            Administrative management features including staff workloads, department routing configurations, API credential generation, and tenant settings are strictly restricted to workspace Administrators.
          </p>
          <div>
            <Link href="/dashboard">
              <Button size="sm" className="bg-[#3d2a1c] hover:bg-[#2a1d14] text-white text-xs font-semibold">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Return to Dashboard Overview
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
