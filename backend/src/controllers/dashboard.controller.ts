import { NextFunction, Request, Response } from "express";
import { dashboardService } from "../services/dashboard.service";

export const dashboardController = {
  summary: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await dashboardService.getSummary();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  categoryTotals: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await dashboardService.getCategoryTotals();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  trends: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { months, granularity } = req.query as unknown as {
        months: number;
        granularity: "month" | "week";
      };

      const result = await dashboardService.getTrends({ months, granularity });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
};
