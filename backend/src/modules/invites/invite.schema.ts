import { z } from "zod";

export const CreateInviteSchema = z.object({
  role: z.enum(["ADMIN", "AGENT"], {
    message: "Role must be 'ADMIN' or 'AGENT'",
  }),
});

export const LoginWithInviteSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  token: z.string().uuid("Invalid invite token format"),
  title: z.string().min(2, "Title must be at least 2 characters"),
});
