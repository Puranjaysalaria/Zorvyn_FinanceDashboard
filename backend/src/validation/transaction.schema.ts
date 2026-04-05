import { TransactionType } from "@prisma/client";
import { z } from "zod";

export const createTransactionSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
    type: z.nativeEnum(TransactionType),
    category: z.string().min(1),
    date: z.string().datetime(),
    note: z.string().max(300).optional()
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({})
});

export const updateTransactionSchema = z.object({
  body: z
    .object({
      amount: z.number().positive().optional(),
      type: z.nativeEnum(TransactionType).optional(),
      category: z.string().min(1).optional(),
      date: z.string().datetime().optional(),
      note: z.string().max(300).optional()
    })
    .refine((data) => Object.keys(data).length > 0, "At least one field is required"),
  query: z.object({}).optional().default({}),
  params: z.object({ id: z.string().min(1) })
});

export const transactionQuerySchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({
    type: z.nativeEnum(TransactionType).optional(),
    category: z.string().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10)
  }),
  params: z.object({}).optional().default({})
});

export const transactionIdParamSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: z.object({ id: z.string().min(1) })
});
