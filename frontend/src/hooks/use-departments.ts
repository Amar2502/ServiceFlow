import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface DepartmentItem {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
}

export function useDepartments() {
  return useQuery<DepartmentItem[]>({
    queryKey: ["departments"],
    queryFn: () => api.get<DepartmentItem[]>("/api/departments/all"),
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { name: string }) =>
      api.post<{ message: string; department: DepartmentItem }>("/api/departments/create", variables),

    onSuccess: () => {
      toast.success("Department created successfully!");
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },

    onError: (err: any) => {
      toast.error(err.message || "Failed to create department");
    },
  });
}
