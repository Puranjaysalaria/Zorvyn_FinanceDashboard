import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found" });
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  if (err instanceof ZodError) {
    const formattedErrors: Record<string, string[]> = {};
    err.issues.forEach((issue) => {
      const part = issue.path[0] as string;
      if (!formattedErrors[part]) {
        formattedErrors[part] = [];
      }
      const fieldPath = issue.path.slice(1).join('.');
      formattedErrors[part].push(fieldPath ? `${fieldPath}: ${issue.message}` : issue.message);
    });

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: formattedErrors
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return res.status(409).json({ success: false, message: "Duplicate value conflict" });
  }

  console.error(err);
  return res.status(500).json({ success: false, message: "Internal server error" });
};
