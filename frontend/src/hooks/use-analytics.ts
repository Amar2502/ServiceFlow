import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface AnalyticsSummary {
  totalComplaints: number;
  openComplaints: number;
  resolvedComplaints: number;
  breachedComplaints: number;
  overallMttrHours: number;
  slaComplianceRate: number;
  aiAccuracyRate: number;
}

export interface MttrPriorityBreakdown {
  priority: string;
  avgHours: number;
  count: number;
}

export interface MttrDepartmentBreakdown {
  department: string;
  avgHours: number;
  count: number;
}

export interface AnalyticsOverviewResponse {
  summary: AnalyticsSummary;
  mttrByPriority: MttrPriorityBreakdown[];
  mttrByDepartment: MttrDepartmentBreakdown[];
}

export function useAnalyticsOverview() {
  return useQuery<AnalyticsOverviewResponse>({
    queryKey: ["analytics", "overview"],
    queryFn: () => api.get<AnalyticsOverviewResponse>("/api/analytics/overview"),
  });
}

export function useSubmitAiFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      complaintId: string;
      isCorrectlyClassified: boolean;
      correctedDepartmentId?: string;
    }) => api.post<{ message: string }>("/api/analytics/ai-feedback", variables),

    onSuccess: () => {
      toast.success("Thank you! Agent AI classification feedback recorded.");
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },

    onError: (err: any) => {
      toast.error(err.message || "Failed to submit AI feedback");
    },
  });
}
