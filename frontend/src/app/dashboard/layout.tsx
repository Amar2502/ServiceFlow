"use client";

import Link from "next/link";
import { 
  PieChart, 
  MessageSquare, 
  Users, 
  LogOut,
  Building2,
  Key,
  Settings,
  ClipboardList,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

const navItemsData = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <PieChart className="h-5 w-5" />,
  },
  {
    title: "My Assignments",
    href: "/dashboard/my-assignments",
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    title: "Complaints",
    href: "/dashboard/complaints",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    title: "Employees",
    href: "/dashboard/employees",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Departments",
    href: "/dashboard/departments",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    title: "API Keys",
    href: "/dashboard/apikeys",
    icon: <Key className="h-5 w-5" />,
  },
  {
    title: "API Docs",
    href: "/dashboard/api-docs",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="bg-[#EED9C4] text-gray-800 flex-col h-full w-64 border-r border-[#dfc7ae] hidden md:flex">
        {/* Header with logo */}
        <div className="flex items-center p-4 border-b border-[#dfc7ae]">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="font-semibold text-xl">ServiceFlow</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItemsData.map((item) => (
              <li key={item.title}>
                <Link
                  href={item.href}
                  className="flex items-center rounded-md px-3 py-2 w-full text-left transition-colors hover:bg-[#dfc7ae]"
                >
                  <span className="flex items-center justify-center">
                    {item.icon}
                  </span>
                  <span className="ml-3">{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* User profile section with static info and logout button */}
        <div className="border-t border-[#dfc7ae]">
          <div className="p-4 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-[#c9a382] flex items-center justify-center text-white font-medium">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">Admin User</p>
              <p className="text-xs truncate">admin@serviceflow.com</p>
            </div>
          </div>
          <div className="p-2 mx-2 mb-3">
            <Button 
              variant="ghost" 
              className="flex items-center w-full px-3 py-2 text-left text-sm text-[#554635] cursor-default hover:bg-red-600 hover:text-white rounded-md"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-[#faf6f2] p-6">
        {children}
        <Toaster />
      </main>
    </div>
  );
}