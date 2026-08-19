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
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function DepartmentsPage() {
  const { data: departments = [], isLoading, refetch } = useDepartments();
  const createDepartmentMutation = useCreateDepartment();

  const [formData, setFormData] = useState({
    name: "",
    keywords: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="flex-1 overflow-auto space-y-5">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3d2a1c]">
            Department Routing Directory
          </h1>
          <p className="text-sm text-slate-500">
            Define tenant departments and keywords evaluated by Groq AI zero-shot routing.
          </p>
        </div>
        <div>
          <Sheet>
            <SheetTrigger asChild>
              <Button className="bg-[#3d2a1c] hover:bg-[#2a1d14] text-[#faf6f2] text-xs font-medium">
                <Plus className="mr-1.5 h-4 w-4" /> New Department
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-[#faf6f2] p-4">
              <SheetHeader>
                <SheetTitle>Create Department</SheetTitle>
                <SheetDescription>
                  Keywords are passed to Groq GenAI for zero-shot natural language matching.
                </SheetDescription>
              </SheetHeader>

              <form onSubmit={handleCreate} className="space-y-4 mt-6">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700">
                    Department Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Billing & Payments, Technical Support"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700">
                    Routing Keywords / Description <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="billing, payments, refunds, duplicate charge"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    required
                    className="bg-white text-xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Separate keywords with commas</p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#3d2a1c] hover:bg-[#2a1d14] text-white text-xs font-medium"
                  disabled={createDepartmentMutation.isPending}
                >
                  {createDepartmentMutation.isPending ? "Creating..." : "Create Department"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Card className="bg-white border-[#EED9C4] shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#5a3e2b]">Active Tenant Departments</CardTitle>
          <CardDescription>
            Groq AI evaluates ticket descriptions against these department keywords in real time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10 text-xs text-slate-400">Loading department routing directory...</div>
          ) : (
            <div className="rounded-md border border-[#EED9C4] overflow-hidden">
              <Table>
                <TableHeader className="bg-[#faf6f2]">
                  <TableRow>
                    <TableHead className="text-left">Name</TableHead>
                    <TableHead className="text-left">Routing Keywords</TableHead>
                    <TableHead className="text-left">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-xs text-slate-400">
                        No departments found. Create your first department above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    departments.map((dept) => (
                      <TableRow key={dept.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-semibold text-slate-900">{dept.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {dept.keywords?.slice(0, 4).map((kw, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[11px] bg-slate-100 text-slate-700">
                                {kw}
                              </Badge>
                            ))}
                            {dept.keywords && dept.keywords.length > 4 && (
                              <Badge variant="secondary" className="text-[11px] bg-slate-200 text-slate-800">
                                +{dept.keywords.length - 4}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {new Date(dept.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(dept.id)}
                            className="text-red-600 hover:text-red-700 text-xs"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
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
  );
}
