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
import { Badge } from "@/components/ui/badge";
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
import { Building2, User, Sparkles, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface AssignTicketDialogProps {
  complaint: ComplaintItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignTicketDialog({ complaint, open, onOpenChange }: AssignTicketDialogProps) {
  const { data: departments = [] } = useDepartments();
  const { data: employees = [] } = useActiveEmployees(complaint?.tenant_id);

  const assignDeptMutation = useAssignToDepartment();
  const assignEmpMutation = useAssignToEmployee();

  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState("");

  if (!complaint) return null;

  const handleAssignDept = async () => {
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
    } catch (err: any) {
      toast.error(err.message || "Failed to assign to department");
    }
  };

  const handleAssignEmp = async () => {
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

        <Tabs defaultValue="department" className="mt-2">
          <TabsList className="w-full bg-[#e2d5c5]">
            <TabsTrigger value="department" className="w-1/2 text-xs flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Route to Department
            </TabsTrigger>
            <TabsTrigger value="employee" className="w-1/2 text-xs flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Assign to Staff Member
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
      </DialogContent>
    </Dialog>
  );
}
