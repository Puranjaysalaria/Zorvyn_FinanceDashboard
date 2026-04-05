import { Role, UserStatus } from "@prisma/client";
import { z } from "zod";

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.nativeEnum(Role).default(Role.VIEWER),
    status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE)
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({})
});

export const updateUserSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).optional(),
      role: z.nativeEnum(Role).optional(),
      status: z.nativeEnum(UserStatus).optional()
    })
    .refine((data) => Object.keys(data).length > 0, "At least one field is required"),
  query: z.object({}).optional().default({}),
  params: z.object({ id: z.string().min(1) })
});

export const userIdParamSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: z.object({ id: z.string().min(1) })
});
