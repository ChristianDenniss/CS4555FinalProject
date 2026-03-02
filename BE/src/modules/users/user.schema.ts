import { z } from "zod";

export const createUserSchema = z
  .object({
    email: z.string().min(1, { message: "Email is required" }).email("Invalid email").trim(),
    password: z.string().min(8, { message: "Password must be at least 8 characters" }),
    name: z.string().trim().optional().nullable(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    email: z.string().email("Invalid email").trim().optional(),
    password: z.string().min(8, { message: "Password must be at least 8 characters" }).optional(),
    name: z.string().trim().optional().nullable(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().min(1, { message: "Email is required" }).email("Invalid email").trim(),
    password: z.string().min(1, { message: "Password is required" }),
  })
  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
