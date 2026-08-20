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
import { api } from "@/lib/api";
import { toast } from "sonner";
import { EmployeeItem } from "@/hooks/use-employees";

type EmployeesTableProps = {
  employees: EmployeeItem[];
  onRefresh?: () => void;
};

export function EmployeesTable({ employees, onRefresh }: EmployeesTableProps) {
  const [showEditName, setShowEditName] = useState(false);
  const [showMapDepartment, setShowMapDepartment] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    departmentId: "",
  });
  const [loading, setLoading] = useState(false);

  const fetchDepartments = async () => {
    try {
      const data = await api.get<{ id: string; name: string }[]>("/api/departments/all");
      setDepartments(data);
    } catch (error) {
      console.error("Failed to fetch departments");
    }
  };

  const handleEditName = (employee: EmployeeItem) => {
    setSelectedEmployee(employee);
    setFormData({ ...formData, name: employee.user?.name || employee.name || "" });
    setShowEditName(true);
  };

  const handleMapDepartment = (employee: EmployeeItem) => {
    setSelectedEmployee(employee);
    setFormData({ ...formData, departmentId: employee.department_id || "" });
    fetchDepartments();
    setShowMapDepartment(true);
  };

  const handleDelete = (employee: EmployeeItem) => {
    setSelectedEmployee(employee);
    setShowDelete(true);
  };

  const handleRestore = (employee: EmployeeItem) => {
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
      await api.patch("/api/employees/update-name", {
        employeeId: selectedEmployee.id,
        name: formData.name.trim(),
      });
      toast.success("Employee name updated successfully");
      setShowEditName(false);
      setSelectedEmployee(null);
      onRefresh?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update name");
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
      await api.patch("/api/employees/map-department", {
        employeeId: selectedEmployee.id,
        departmentId: formData.departmentId,
      });
      toast.success("Employee mapped to department successfully");
      setShowMapDepartment(false);
      setSelectedEmployee(null);
      onRefresh?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to map employee");
    } finally {
      setLoading(false);
    }
  };

  const submitDelete = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    try {
      await api.patch("/api/employees/delete", { employeeId: selectedEmployee.id });
      toast.success("Employee deleted successfully");
      setShowDelete(false);
      setSelectedEmployee(null);
      onRefresh?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete employee");
    } finally {
      setLoading(false);
    }
  };

  const submitRestore = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    try {
      await api.patch("/api/employees/restore", { employeeId: selectedEmployee.id });
      toast.success("Employee restored successfully");
      setShowRestore(false);
      setSelectedEmployee(null);
      onRefresh?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to restore employee");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <>
      <div className="rounded-md border border-[#EED9C4] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#faf6f2]">
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead className="w-[240px]">Employee</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Live Active Load</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-xs text-slate-400">
                  No active employees found.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => {
                const name = employee.user?.name || employee.name || "N/A";
                const email = employee.user?.email || "No email";
                return (
                  <TableRow key={employee.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-mono text-xs text-slate-500 font-semibold">
                      #{employee.id.substring(0, 6)}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-[#c9a382] text-white text-xs">
                            {getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{name}</div>
                          <div className="text-xs text-slate-500">{email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs bg-slate-50">
                        {employee.user?.role || "AGENT"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-blue-100 text-blue-900 border-blue-200 font-bold">
                        {employee.load || 0} active ticket(s)
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditName(employee)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Name
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMapDepartment(employee)}>
                            <Building2 className="h-4 w-4 mr-2" />
                            Map to Department
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(employee)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Employee
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Name Dialog */}
      <Dialog open={showEditName} onOpenChange={setShowEditName}>
        <DialogContent className="bg-[#faf6f2]">
          <DialogHeader>
            <DialogTitle className="text-[#5a3e2b]">Edit Employee Name</DialogTitle>
            <DialogDescription>Update staff member name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="name" className="text-xs">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white mt-2 text-xs"
                placeholder="Enter employee name"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEditName(false)} className="text-xs">
                Cancel
              </Button>
              <Button className="bg-[#3d2a1c] hover:bg-[#2a1d14] text-white text-xs" onClick={submitEditName} disabled={loading}>
                {loading ? "Updating..." : "Update Name"}
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
            <DialogDescription>Assign this employee to a department queue</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="department" className="text-xs">Department</Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
              >
                <SelectTrigger className="bg-white mt-2 text-xs">
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
              <Button variant="outline" onClick={() => setShowMapDepartment(false)} className="text-xs">
                Cancel
              </Button>
              <Button className="bg-[#3d2a1c] hover:bg-[#2a1d14] text-white text-xs" onClick={submitMapDepartment} disabled={loading}>
                {loading ? "Mapping..." : "Map Department"}
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
            <DialogDescription>Soft-delete this staff member?</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDelete(false)} className="text-xs">
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-xs" onClick={submitDelete} disabled={loading}>
              {loading ? "Deleting..." : "Confirm Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
