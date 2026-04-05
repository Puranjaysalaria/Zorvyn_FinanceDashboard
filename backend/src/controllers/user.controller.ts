import { NextFunction, Request, Response } from "express";
import { userService } from "../services/user.service";

export const userController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await userService.createUser(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  list: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await userService.listUsers();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await userService.getUserById(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await userService.updateUser(req.params.id, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  deactivate: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await userService.deactivateUser(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
};
