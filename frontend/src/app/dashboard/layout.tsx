"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PieChart,
  MessageSquare,
  Users,
  LogOut,
  Building2,
  Key,
  Settings,
  ClipboardList,
  BookOpen,
  Menu,
  Terminal,
  BarChart2,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { useEffect, useMemo, useState } from "react";
import { OnboardingModal } from "@/components/onboarding-modal";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSocketNotifications } from "@/hooks/useSocketNotifications";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  {
    title: "Dashboard Overview",
    href: "/dashboard",
    icon: <PieChart className="h-5 w-5 shrink-0" />,
  },
  {
    title: "Operations & AI Analytics",
    href: "/dashboard/analytics",
    icon: <BarChart2 className="h-5 w-5 shrink-0" />,
  },
  {
    title: "My Assignments",
    href: "/dashboard/my-assignments",
    icon: <ClipboardList className="h-5 w-5 shrink-0" />,
  },
  {
    title: "Complaints Queue",
    href: "/dashboard/complaints",
    icon: <MessageSquare className="h-5 w-5 shrink-0" />,
  },
  {
    title: "Staff Workload",
    href: "/dashboard/employees",
    icon: <Users className="h-5 w-5 shrink-0" />,
    adminOnly: true,
  },
  {
    title: "Department Routing",
    href: "/dashboard/departments",
    icon: <Building2 className="h-5 w-5 shrink-0" />,
    adminOnly: true,
  },
  {
    title: "API Credentials",
    href: "/dashboard/apikeys",
    icon: <Key className="h-5 w-5 shrink-0" />,
    adminOnly: true,
  },
  {
    title: "API Reference",
    href: "/dashboard/api-docs",
    icon: <BookOpen className="h-5 w-5 shrink-0" />,
  },
  {
    title: "Tenant Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-5 w-5 shrink-0" />,
    adminOnly: true,
  },
];

function NavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  const items = useMemo(() => {
    if (!user) return [];
    let list = user.role === "ADMIN" ? navItems : navItems.filter((i) => !i.adminOnly);
    // If routing strategy is EMPLOYEE, don't show Department Routing navigation
    if (user.routingMode === "EMPLOYEE") {
      list = list.filter((item) => item.href !== "/dashboard/departments");
    }
    return list;
  }, [user]);

  return (
    <ul className={cn("space-y-1 px-2", className)}>
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center rounded-lg px-3 py-2.5 w-full text-left transition-colors text-xs font-medium",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
              )}
            >
              {item.icon}
              <span className="ml-3">{item.title}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Initialize Socket.io real-time notifications for active / inactive users
  useSocketNotifications();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-xs text-muted-foreground">
        Authenticating session...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <OnboardingModal forceOpen={showGuide} onClose={() => setShowGuide(false)} />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex bg-sidebar text-sidebar-foreground w-64 shrink-0 flex-col border-r border-sidebar-border min-h-screen">
        <div className="flex items-center gap-2.5 p-4 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <Link href="/dashboard" className="font-bold text-base leading-tight block">
              ServiceFlow
            </Link>
            <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
              Enterprise SaaS
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <NavLinks />
        </nav>

        <div className="border-t border-sidebar-border p-4 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs font-semibold border-sidebar-foreground/20 bg-sidebar-foreground/5 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground text-sidebar-foreground transition-all"
            onClick={() => setShowGuide(true)}
          >
            <HelpCircle className="h-4 w-4 mr-2 text-amber-600" />
            Interactive Guide
          </Button>

          <div className="rounded-lg bg-sidebar-accent/50 px-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{user.role}</span>
              <span className="text-[10px] bg-sidebar-primary text-sidebar-primary-foreground px-1.5 py-0.5 rounded font-mono">
                {user.role === "ADMIN" ? "Admin" : "Agent"}
              </span>
            </div>
            <p className="text-muted-foreground truncate text-[11px] font-mono mt-0.5">
              ID: {user.userId.slice(0, 8)}…
            </p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:bg-destructive hover:text-white text-xs font-medium"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="flex md:hidden items-center justify-between gap-2 border-b border-sidebar-border bg-sidebar px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
            <Terminal className="h-4 w-4" />
          </div>
          <span className="font-bold truncate text-sm">ServiceFlow</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="bg-card border-border">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-sidebar border-sidebar-border w-72">
              <SheetHeader>
                <SheetTitle className="text-left text-sm">Navigation Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-4">
                <NavLinks onNavigate={() => setMobileOpen(false)} />
              </nav>
              <Button
                variant="ghost"
                className="mt-8 w-full justify-start hover:bg-destructive hover:text-white text-xs"
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="hidden md:flex items-center justify-between border-b border-border bg-muted/40 px-8 py-2.5">
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
            <span>
              Workspace Tenant ID: <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">{user.tenantId}</span>
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary text-primary-foreground gap-1">
              Strategy: {user.routingMode === "EMPLOYEE" ? "EMPLOYEE (Direct Agent)" : "DEPARTMENT (Workload)"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
