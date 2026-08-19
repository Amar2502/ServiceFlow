import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { getSocket, joinTenantRoom } from "@/lib/socket";

export interface EmployeeUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface EmployeeItem {
  id: string;
  tenant_id: string;
  name?: string | null;
  load: number;
  user?: EmployeeUser | null;
  department_id?: string | null;
  created_at: string;
}

export function useActiveEmployees(tenantId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery<EmployeeItem[]>({
    queryKey: ["employees", "active"],
    queryFn: () => api.get<EmployeeItem[]>("/api/employees/all-active"),
  });

  useEffect(() => {
    if (!tenantId) return;

    joinTenantRoom(tenantId);
    const socket = getSocket();

    const handleLoadUpdated = (data: { employeeId: string; load: number }) => {
      queryClient.setQueryData<EmployeeItem[]>(["employees", "active"], (old) => {
        if (!old) return old;
        return old.map((emp) => (emp.id === data.employeeId ? { ...emp, load: data.load } : emp));
      });
    };

    socket.on("load:updated", handleLoadUpdated);

    return () => {
      socket.off("load:updated", handleLoadUpdated);
    };
  }, [tenantId, queryClient]);

  return query;
}
