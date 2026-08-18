import { z } from "zod";

export const GenerateApiKeySchema = z.object({
  name: z.string().min(2, "API Key name must be at least 2 characters"),
});

export const DeleteApiKeySchema = z.object({
  apiKeyId: z.string().uuid("Invalid API key ID format"),
});
