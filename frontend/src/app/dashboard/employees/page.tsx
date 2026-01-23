"use client";

import { Plus, Filter, Download, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EmployeesTable } from "./employees-table";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  title?: string;
  keywords?: string[];
  department_id?: string;
  user_id: string;
  email?: string;
  role?: "ADMIN" | "AGENT";
  created_at: string;
  deleted_at?: string | null;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deletedEmployees, setDeletedEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "AGENT">("AGENT");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<{
    token: string;
    invite_url: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const [activeRes, deletedRes] = await Promise.all([
        axios.get("http://localhost:5000/api/employees/active", {
          withCredentials: true,
        }),
        axios.get("http://localhost:5000/api/employees/deleted", {
          withCredentials: true,
        }),
      ]);
      setEmployees(activeRes.data);
      setDeletedEmployees(deletedRes.data);
    } catch (error: any) {
      toast.error("Failed to fetch employees");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/invite/create",
        { role: inviteRole },
        { withCredentials: true }
      );
      setGeneratedInvite({
        token: response.data.token,
        invite_url: response.data.invite_url,
      });
      toast.success("Invite link generated successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create invite");
    } finally {
      setInviteLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Invite link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredEmployees = (showDeleted ? deletedEmployees : employees).filter(
    (employee) => {
      const matchesSearch =
        searchQuery === "" ||
        employee.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.title?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }
  );

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Employee Management
          </h1>
          <p className="text-muted-foreground">
            Manage support staff and track performance metrics.
          </p>
        </div>
        <div>
          <Sheet>
            <SheetTrigger className="bg-[#eac4a3] hover:bg-[#b08e70] p-2 flex items-center rounded-md">
              <Plus className="mr-2 h-4 w-4" /> Invite Employee
            </SheetTrigger>
            <SheetContent className="bg-[#faf6f2] p-4">
              <SheetHeader>
                <SheetTitle>Invite New Employee</SheetTitle>
                <SheetDescription>
                  Create an invite link for a new employee. They will complete their
                  registration using the invite token.
                </SheetDescription>
              </SheetHeader>

              {generatedInvite ? (
                <div className="mt-6 space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-sm font-medium text-yellow-800 mb-2">
                      ⚠️ Share this invite link with the employee. It expires in 24 hours.
                    </p>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={generatedInvite.invite_url}
                        readOnly
                        className="bg-white font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedInvite.invite_url)}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-[#c9a382] hover:bg-[#b08e70]"
                    onClick={() => {
                      setGeneratedInvite(null);
                      setInviteRole("AGENT");
                    }}
                  >
                    Generate Another Invite
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCreateInvite} className="space-y-4 mt-6">
                  <div>
                    <Label htmlFor="role">
                      Role <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(value: "ADMIN" | "AGENT") =>
                        setInviteRole(value)
                      }
                    >
                      <SelectTrigger className="w-full bg-white mt-2">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="AGENT">Agent</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      The invite will be valid for 24 hours
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#c9a382] hover:bg-[#b08e70]"
                    disabled={inviteLoading}
                  >
                    {inviteLoading ? "Generating..." : "Generate Invite Link"}
                  </Button>
                </form>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Card className="bg-white border-[#EED9C4]">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Support Team</CardTitle>
              <CardDescription>
                Manage employees and track their complaint resolution performance
              </CardDescription>
            </div>
            <Select value={showDeleted ? "deleted" : "active"} onValueChange={(v) => setShowDeleted(v === "deleted")}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active ({employees.length})</SelectItem>
                <SelectItem value="deleted">Deleted ({deletedEmployees.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-white w-[300px]"
              />
            </div>

            <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
              <Button variant="outline" className="bg-white">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <EmployeesTable
              employees={filteredEmployees}
              onRefresh={fetchEmployees}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
