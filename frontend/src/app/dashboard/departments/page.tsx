"use client";

import { Plus, Search, Trash2, RotateCcw } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";

interface Department {
  id: string;
  name: string;
  keywords: string[];
  created_at: string;
  deleted_at?: string | null;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deletedDepartments, setDeletedDepartments] = useState<Department[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    keywords: "",
  });

  const fetchDepartments = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/departments/all", {
        withCredentials: true,
      });
      setDepartments(response.data);
    } catch (error) {
      toast.error("Failed to fetch departments");
    }
  };

  const fetchDeletedDepartments = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/departments/deleted", {
        withCredentials: true,
      });
      setDeletedDepartments(response.data);
    } catch (error) {
      toast.error("Failed to fetch deleted departments");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    console.log("formData", formData);
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(
        "http://localhost:5000/api/departments/create",
        formData,
        { withCredentials: true }
      );
      toast.success("Department created successfully");
      setFormData({ name: "", keywords: "" });
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create department");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.patch(
        "http://localhost:5000/api/departments/delete",
        { departmentId: id },
        { withCredentials: true }
      );
      toast.success("Department deleted successfully");
      fetchDepartments();
      fetchDeletedDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete department");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await axios.patch(
        "http://localhost:5000/api/departments/restore",
        { departmentId: id },
        { withCredentials: true }
      );
      toast.success("Department restored successfully");
      fetchDepartments();
      fetchDeletedDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to restore department");
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchDeletedDepartments();
  }, []);

  const displayDepartments = showDeleted ? deletedDepartments : departments;

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Department Management
          </h1>
          <p className="text-muted-foreground">
            Manage departments and their keywords for intelligent complaint routing.
          </p>
        </div>
        <div>
          <Sheet>
            <SheetTrigger className="bg-[#eac4a3] hover:bg-[#b08e70] p-2 flex items-center rounded-md">
              <Plus className="mr-2 h-4 w-4" /> New Department
            </SheetTrigger>
            <SheetContent className="bg-[#faf6f2] p-4">
              <SheetHeader>
                <SheetTitle>Create New Department</SheetTitle>
                <SheetDescription>
                  Enter department details. Keywords are used for intelligent complaint routing.
                </SheetDescription>
              </SheetHeader>

              <form onSubmit={handleCreate} className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Department Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Billing, Technical Support"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Keywords <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="billing, payments, refunds, invoices"
                    value={formData.keywords}
                    onChange={(e) =>
                      setFormData({ ...formData, keywords: e.target.value })
                    }
                    required
                    className="bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separate keywords with commas
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#c9a382] hover:bg-[#b08e70]"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Department"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Card className="bg-white border-[#EED9C4]">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Departments</CardTitle>
              <CardDescription>
                Manage departments and their routing keywords
              </CardDescription>
            </div>
            <Select value={showDeleted ? "deleted" : "active"} onValueChange={(v) => setShowDeleted(v === "deleted")}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayDepartments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No departments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayDepartments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {dept.keywords?.slice(0, 3).map((kw, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {kw}
                            </Badge>
                          ))}
                          {dept.keywords && dept.keywords.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{dept.keywords.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(dept.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {showDeleted ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(dept.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(dept.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

