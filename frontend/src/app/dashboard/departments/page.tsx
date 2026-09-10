"use client";

import { Plus, Trash2 } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { useDepartments, useCreateDepartment } from "@/hooks/use-departments";
import { RbacGuard } from "@/components/rbac-guard";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { AlertTriangle, Settings } from "lucide-react";

export default function DepartmentsPage() {
  const { user } = useAuth();
  const isEmployeeMode = user?.routingMode === "EMPLOYEE";
  const { data: departments = [], isLoading, refetch } = useDepartments();
  const createDepartmentMutation = useCreateDepartment();

  const [formData, setFormData] = useState({
    name: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmployeeMode) {
      toast.error("Department creation is disabled because your tenant strategy is EMPLOYEE mode.");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Department name is required");
      return;
    }
    try {
      await createDepartmentMutation.mutateAsync({ name: formData.name.trim() });
      setFormData({ name: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to create department");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.patch("/api/departments/delete", { departmentId: id });
      toast.success("Department deleted successfully");
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete department");
    }
  };

  return (
    <RbacGuard allowedRoles={["ADMIN"]}>
      <div className="flex-1 overflow-auto space-y-5">
        {isEmployeeMode && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-900 dark:text-amber-100 text-sm">Department Routing is Inactive</h3>
                <p className="text-amber-800 dark:text-amber-300 mt-1">
                  Your tenant strategy is currently set to <strong>EMPLOYEE (Direct Employee Title Routing)</strong>. Complaints are routed directly based on employee titles.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs">
              <Link href="/dashboard/settings">
                <Settings className="h-3.5 w-3.5 mr-1.5" /> Change in Settings
              </Link>
            </Button>
          </div>
        )}

        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Department Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure active departments used by AI for complaint classification and routing.
            </p>
          </div>
          <div>
            {!isEmployeeMode && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium">
                    <Plus className="mr-1.5 h-4 w-4" /> Add Department
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-background p-4">
                  <SheetHeader>
                    <SheetTitle>Create New Department</SheetTitle>
                    <SheetDescription>
                      Add a department name to enable AI department-based routing.
                    </SheetDescription>
                  </SheetHeader>
                  <form onSubmit={handleCreate} className="space-y-4 mt-6">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Department Name <span className="text-destructive">*</span>
                      </label>
                      <Input
                        placeholder="e.g. Billing & Refunds"
                        value={formData.name}
                        onChange={(e) => setFormData({ name: e.target.value })}
                        required
                        className="bg-background text-xs"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium"
                      disabled={createDepartmentMutation.isPending}
                    >
                      {createDepartmentMutation.isPending ? "Creating..." : "Save Department"}
                    </Button>
                  </form>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Active Departments</CardTitle>
            <CardDescription>
              Departments available for AI complaint routing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-xs text-muted-foreground">Loading departments...</div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-left">Department Name</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-8 text-xs text-muted-foreground">
                          No active departments found. Create your first department above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      departments.map((dept) => (
                        <TableRow key={dept.id} className="hover:bg-muted/50">
                          <TableCell className="font-semibold text-xs text-foreground">
                            {dept.name}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 text-xs"
                              onClick={() => handleDelete(dept.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RbacGuard>
  );
}
