import { z } from "zod";

export const dashboardTrendsQuerySchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({
    months: z.coerce.number().int().min(1).max(24).default(6),
    granularity: z.enum(["month", "week"]).default("month")
  }),
  params: z.object({}).optional().default({})
});
