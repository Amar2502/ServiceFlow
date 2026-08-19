import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
}

export interface GeneratedApiKeyResponse {
  message: string;
  apiKey: string; // Plaintext key returned only once
  name: string;
  prefix: string;
}

export function useApiKeys() {
  return useQuery<ApiKeyItem[]>({
    queryKey: ["apikeys"],
    queryFn: () => api.get<ApiKeyItem[]>("/api/apikey/all"),
  });
}

export function useGenerateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { name: string }) =>
      api.post<GeneratedApiKeyResponse>("/api/apikey/generate", variables),

    onSuccess: () => {
      toast.success("API key generated successfully!");
      queryClient.invalidateQueries({ queryKey: ["apikeys"] });
    },

    onError: (err: any) => {
      toast.error(err.message || "Failed to generate API key");
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { apiKeyId: string }) =>
      api.patch<{ message: string }>("/api/apikey/delete", variables),

    onSuccess: () => {
      toast.success("API key revoked successfully!");
      queryClient.invalidateQueries({ queryKey: ["apikeys"] });
    },

    onError: (err: any) => {
      toast.error(err.message || "Failed to delete API key");
    },
  });
}
