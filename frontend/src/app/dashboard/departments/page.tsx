"use client";

import { Plus, Trash2, RotateCcw } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
    keywords: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmployeeMode) {
      toast.error("Department creation is disabled because your tenant strategy is EMPLOYEE mode.");
      return;
    }
    try {
      await createDepartmentMutation.mutateAsync(formData);
      setFormData({ name: "", keywords: "" });
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
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-xs text-amber-900 flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-900 text-sm">Department Routing is Inactive</h3>
                <p className="text-amber-800 mt-1">
                  Your tenant strategy is currently set to <strong>EMPLOYEE (Direct Agent Vector Matching)</strong>. Incoming API complaints bypass department keyword vectors and target staff directly.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100 text-xs">
              <Link href="/dashboard/settings">
                <Settings className="h-3.5 w-3.5 mr-1.5" /> Change in Settings
              </Link>
            </Button>
          </div>
        )}

        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#3d2a1c]">
              Department Routing & Classifier Seed
            </h1>
            <p className="text-sm text-slate-500">
              Configure department keyword vectors used by Groq GenAI for sub-200ms zero-shot routing.
            </p>
          </div>
          <div>
            {!isEmployeeMode && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button className="bg-[#3d2a1c] hover:bg-[#2a1d14] text-[#faf6f2] text-xs font-medium">
                    <Plus className="mr-1.5 h-4 w-4" /> Add Department
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-[#faf6f2] p-4">
                  <SheetHeader>
                    <SheetTitle>Create New Department</SheetTitle>
                    <SheetDescription>
                      Seed keywords for TF-IDF similarity and LLM extraction routing.
                    </SheetDescription>
                  </SheetHeader>
                  <form onSubmit={handleCreate} className="space-y-4 mt-6">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Department Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="e.g. Billing & Refunds"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        required
                        className="bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Keywords (Comma-separated)
                      </label>
                      <Input
                        placeholder="e.g. refund, payment, invoice, charge"
                        value={formData.keywords}
                        onChange={(e) => setFormData((prev) => ({ ...prev, keywords: e.target.value }))}
                        className="bg-white text-xs"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#3d2a1c] hover:bg-[#2a1d14] text-white text-xs font-medium"
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

        <Card className="bg-white border-[#EED9C4] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#5a3e2b]">Active Departments</CardTitle>
            <CardDescription>
              Configured department profiles and vector seeds
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-xs text-slate-400">Loading departments...</div>
            ) : (
              <div className="rounded-md border border-[#EED9C4] overflow-hidden">
                <Table>
                  <TableHeader className="bg-[#faf6f2]">
                    <TableRow>
                      <TableHead className="text-left">Department</TableHead>
                      <TableHead className="text-left">Routing Keywords</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-xs text-slate-400">
                          No active departments found. Create your first department above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      departments.map((dept) => (
                        <TableRow key={dept.id} className="hover:bg-slate-50">
                          <TableCell className="font-semibold text-xs text-slate-900">
                            {dept.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {dept.keywords && dept.keywords.length > 0 ? (
                                dept.keywords.map((kw, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] bg-amber-50 text-amber-900 border-amber-200">
                                    {kw}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400">No seed keywords</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 text-xs"
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
