// File: app/dashboard/employees-table.tsx
"use client";

import {
  MoreHorizontal,
  ArrowUpDown,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  RotateCcw,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";

// Define type for employee data matching backend schema
type Employee = {
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
};

type EmployeesTableProps = {
  employees: Employee[];
  onRefresh?: () => void;
};

export function EmployeesTable({ employees, onRefresh }: EmployeesTableProps) {
  const [showEditName, setShowEditName] = useState(false);
  const [showEditKeywords, setShowEditKeywords] = useState(false);
  const [showMapDepartment, setShowMapDepartment] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    keywords: "",
    departmentId: "",
  });
  const [loading, setLoading] = useState(false);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/departments/all", {
        withCredentials: true,
      });
      setDepartments(response.data);
    } catch (error) {
      console.error("Failed to fetch departments");
    }
  };

  const handleEditName = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({ ...formData, name: employee.name || "" });
    setShowEditName(true);
  };

  const handleEditKeywords = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      ...formData,
      keywords: employee.keywords?.join(", ") || "",
    });
    setShowEditKeywords(true);
  };

  const handleMapDepartment = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({ ...formData, departmentId: employee.department_id || "" });
    fetchDepartments();
    setShowMapDepartment(true);
  };

  const handleDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDelete(true);
  };

  const handleRestore = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowRestore(true);
  };

  const submitEditName = async () => {
    if (!selectedEmployee || !formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setLoading(true);
    try {
      await axios.patch(
        "http://localhost:5000/api/employees/update-name",
        { employeeId: selectedEmployee.id, name: formData.name.trim() },
        { withCredentials: true }
      );
      toast.success("Employee name updated successfully");
      setShowEditName(false);
      setSelectedEmployee(null);
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update name");
    } finally {
      setLoading(false);
    }
  };

  const submitEditKeywords = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    try {
      // Note: This endpoint needs to be added to backend routes
      // PATCH /api/employees/update-keywords
      await axios.patch(
        "http://localhost:5000/api/employees/update-keywords",
        {
          employeeId: selectedEmployee.id,
          keywords: formData.keywords,
        },
        { withCredentials: true }
      );
      toast.success("Keywords updated successfully");
      setShowEditKeywords(false);
      setSelectedEmployee(null);
      onRefresh?.();
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("Endpoint not found. Please add PATCH /api/employees/update-keywords to backend routes.");
      } else {
        toast.error(error.response?.data?.message || "Failed to update keywords");
      }
    } finally {
      setLoading(false);
    }
  };

  const submitMapDepartment = async () => {
    if (!selectedEmployee || !formData.departmentId) {
      toast.error("Please select a department");
      return;
    }
    setLoading(true);
    try {
      await axios.patch(
        "http://localhost:5000/api/employees/map-to-department",
        {
          employeeId: selectedEmployee.id,
          departmentId: formData.departmentId,
        },
        { withCredentials: true }
      );
      toast.success("Employee mapped to department successfully");
      setShowMapDepartment(false);
      setSelectedEmployee(null);
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to map employee");
    } finally {
      setLoading(false);
    }
  };

  const submitDelete = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    try {
      await axios.patch(
        "http://localhost:5000/api/employees/delete",
        { employeeId: selectedEmployee.id },
        { withCredentials: true }
      );
      toast.success("Employee deleted successfully");
      setShowDelete(false);
      setSelectedEmployee(null);
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete employee");
    } finally {
      setLoading(false);
    }
  };

  const submitRestore = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    try {
      await axios.patch(
        "http://localhost:5000/api/employees/restore",
        { employeeId: selectedEmployee.id },
        { withCredentials: true }
      );
      toast.success("Employee restored successfully");
      setShowRestore(false);
      setSelectedEmployee(null);
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to restore employee");
    } finally {
      setLoading(false);
    }
  };

  // Function to get initials from name
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getStatusBadge = (deletedAt: string | null | undefined) => {
    if (deletedAt) {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-200 flex items-center gap-1">
          <AlertCircle className="mr-1 h-3 w-3" /> Deleted
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 flex items-center gap-1">
        <CheckCircle className="mr-1 h-3 w-3" /> Active
      </Badge>
    );
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead className="w-[250px]">
                <Button variant="ghost" className="p-0 hover:bg-transparent">
                  <span>Employee</span>
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Keywords</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium truncate w-[7ch]">
                    {String(employee.id).substring(0, 7)}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback className="bg-[#c9a382] text-white">
                          {getInitials(employee.name || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{employee.name || "N/A"}</div>
                        {employee.email && (
                          <div className="text-sm text-gray-500">{employee.email}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{employee.title || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{employee.role || "AGENT"}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(employee.deleted_at)}</TableCell>
                  <TableCell>
                    {employee.keywords && employee.keywords.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {employee.keywords.slice(0, 2).map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {employee.keywords.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{employee.keywords.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!employee.deleted_at && (
                          <>
                            <DropdownMenuItem onClick={() => handleEditName(employee)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Name
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditKeywords(employee)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Keywords
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMapDepartment(employee)}>
                              <Building2 className="h-4 w-4 mr-2" />
                              Map to Department
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(employee)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                        {employee.deleted_at && (
                          <DropdownMenuItem
                            className="text-green-600"
                            onClick={() => handleRestore(employee)}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restore
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Name Dialog */}
      <Dialog open={showEditName} onOpenChange={setShowEditName}>
        <DialogContent className="bg-[#faf6f2]">
          <DialogHeader>
            <DialogTitle className="text-[#5a3e2b]">Edit Employee Name</DialogTitle>
            <DialogDescription>Update the employee's name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white mt-2"
                placeholder="Enter employee name"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEditName(false)}>
                Cancel
              </Button>
              <Button
                className="bg-[#c9a382] hover:bg-[#b08e70]"
                onClick={submitEditName}
                disabled={loading}
              >
                {loading ? "Updating..." : "Update"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Keywords Dialog */}
      <Dialog open={showEditKeywords} onOpenChange={setShowEditKeywords}>
        <DialogContent className="bg-[#faf6f2]">
          <DialogHeader>
            <DialogTitle className="text-[#5a3e2b]">Edit Keywords</DialogTitle>
            <DialogDescription>
              Update keywords for intelligent complaint routing (comma-separated)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="keywords">Keywords</Label>
              <Input
                id="keywords"
                value={formData.keywords}
                onChange={(e) =>
                  setFormData({ ...formData, keywords: e.target.value })
                }
                className="bg-white mt-2"
                placeholder="billing, payments, refunds"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate keywords with commas
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEditKeywords(false)}>
                Cancel
              </Button>
              <Button
                className="bg-[#c9a382] hover:bg-[#b08e70]"
                onClick={submitEditKeywords}
                disabled={loading}
              >
                {loading ? "Updating..." : "Update"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Map to Department Dialog */}
      <Dialog open={showMapDepartment} onOpenChange={setShowMapDepartment}>
        <DialogContent className="bg-[#faf6f2]">
          <DialogHeader>
            <DialogTitle className="text-[#5a3e2b]">Map to Department</DialogTitle>
            <DialogDescription>
              Assign this employee to a department
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) =>
                  setFormData({ ...formData, departmentId: value })
                }
              >
                <SelectTrigger className="bg-white mt-2">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowMapDepartment(false)}>
                Cancel
              </Button>
              <Button
                className="bg-[#c9a382] hover:bg-[#b08e70]"
                onClick={submitMapDepartment}
                disabled={loading}
              >
                {loading ? "Mapping..." : "Map"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="bg-[#faf6f2]">
          <DialogHeader>
            <DialogTitle className="text-[#5a3e2b]">Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this employee? This action can be undone by
              restoring later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={submitDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={showRestore} onOpenChange={setShowRestore}>
        <DialogContent className="bg-[#faf6f2]">
          <DialogHeader>
            <DialogTitle className="text-[#5a3e2b]">Restore Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore this employee?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowRestore(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#c9a382] hover:bg-[#b08e70]"
              onClick={submitRestore}
              disabled={loading}
            >
              {loading ? "Restoring..." : "Restore"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
