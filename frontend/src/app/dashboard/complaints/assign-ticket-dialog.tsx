"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComplaintItem, useAssignToDepartment, useAssignToEmployee } from "@/hooks/use-complaints";
import { useDepartments } from "@/hooks/use-departments";
import { useActiveEmployees } from "@/hooks/use-employees";
import { useAuth } from "@/components/auth-provider";
import { Building2, User, Sparkles, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface AssignTicketDialogProps {
  complaint: ComplaintItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignTicketDialog({ complaint, open, onOpenChange }: AssignTicketDialogProps) {
  const { user } = useAuth();
  const { data: departments = [] } = useDepartments();
  const { data: employees = [] } = useActiveEmployees(complaint?.tenant_id);

  const assignDeptMutation = useAssignToDepartment();
  const assignEmpMutation = useAssignToEmployee();

  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState("");

  if (!complaint) return null;

  const isAdmin = user?.role === "ADMIN";

  const handleAssignDept = async () => {
    if (!isAdmin) {
      toast.error("Only Administrators are authorized to assign or reassign tickets.");
      return;
    }

    if (!selectedDeptId) {
      toast.error("Please select a department");
      return;
    }

    try {
      await assignDeptMutation.mutateAsync({
        complaintId: complaint.id,
        departmentId: selectedDeptId,
      });
      onOpenChange(false);
      toast.success("Ticket reassigned to department successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to assign to department");
    }
  };

  const handleAssignEmp = async () => {
    if (!isAdmin) {
      toast.error("Only Administrators are authorized to assign or reassign tickets.");
      return;
    }

    if (!selectedEmpId) {
      toast.error("Please select an employee");
      return;
    }

    try {
      await assignEmpMutation.mutateAsync({
        complaintId: complaint.id,
        employeeId: selectedEmpId,
      });
      onOpenChange(false);
      toast.success("Ticket assigned to staff member successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to assign to employee");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#faf6f2]">
        <DialogHeader>
          <DialogTitle className="text-[#5a3e2b] flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-amber-800" />
            Assign Ticket #{complaint.id.substring(0, 6)}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {complaint.title}
          </DialogDescription>
        </DialogHeader>

        {!isAdmin ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-xs text-red-900 space-y-2">
            <p className="font-bold text-red-800 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-red-600" /> Access Restricted (Admin Only)
            </p>
            <p className="text-red-700">
              Your account role is <strong>{user?.role || "AGENT"}</strong>. Ticket assignment and workload re-routing can only be performed by workspace Administrators.
            </p>
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-[#3d2a1c] hover:bg-[#2a1d14] text-white text-xs mt-2"
            >
              Close Window
            </Button>
          </div>
        ) : (
          <>
            {!complaint.assignment && (
              <div className="bg-amber-100/60 border border-amber-300 rounded-md p-3 text-xs text-amber-900 flex items-start gap-2 my-1">
                <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-amber-900">Needs Manual Assignment:</strong>
                  <p className="text-amber-800 mt-0.5">
                    Groq AI did not find a high-confidence matching department. Select a department or staff member below.
                  </p>
                </div>
              </div>
            )}

            <Tabs defaultValue={user?.routingMode === "EMPLOYEE" ? "employee" : "department"} className="mt-2">
              <TabsList className="w-full bg-[#e2d5c5]">
                <TabsTrigger value="department" className="w-1/2 text-xs flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Department {user?.routingMode === "DEPARTMENT" ? "(Active Strategy)" : ""}
                </TabsTrigger>
                <TabsTrigger value="employee" className="w-1/2 text-xs flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Staff Member {user?.routingMode === "EMPLOYEE" ? "(Active Strategy)" : ""}
                </TabsTrigger>
              </TabsList>

              {/* Department Assignment Tab */}
              <TabsContent value="department" className="space-y-3 pt-3">
                <div className="bg-slate-100 border border-slate-200 rounded p-2.5 text-[11px] text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  Assigning to a department automatically routes the complaint to the staff member with the minimum active workload.
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Select Department:</label>
                  <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                    <SelectTrigger className="bg-white text-xs">
                      <SelectValue placeholder="Choose target department..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id} className="text-xs">
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs h-8">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssignDept}
                    disabled={assignDeptMutation.isPending || !selectedDeptId}
                    className="bg-[#3d2a1c] hover:bg-[#2a1d14] text-white text-xs h-8"
                  >
                    Route via Minimum Workload
                  </Button>
                </div>
              </TabsContent>

              {/* Direct Employee Assignment Tab */}
              <TabsContent value="employee" className="space-y-3 pt-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Select Staff Member:</label>
                  <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                    <SelectTrigger className="bg-white text-xs">
                      <SelectValue placeholder="Choose staff member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => {
                        const name = emp.user?.name || emp.name || "N/A";
                        return (
                          <SelectItem key={emp.id} value={emp.id} className="text-xs">
                            {name} ({emp.load || 0} active tickets)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs h-8">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssignEmp}
                    disabled={assignEmpMutation.isPending || !selectedEmpId}
                    className="bg-[#3d2a1c] hover:bg-[#2a1d14] text-white text-xs h-8"
                  >
                    Assign Directly
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
