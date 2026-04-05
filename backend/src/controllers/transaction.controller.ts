import { NextFunction, Request, Response } from "express";
import { transactionService } from "../services/transaction.service";

export const transactionController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await transactionService.createTransaction({
        ...req.body,
        createdById: req.user!.id
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await transactionService.listTransactions(req.query as any);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await transactionService.getTransactionById(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await transactionService.updateTransaction(req.params.id, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await transactionService.deleteTransaction(req.params.id);
      res.status(200).json({ success: true, message: "Transaction deleted" });
    } catch (error) {
      next(error);
    }
  }
};
