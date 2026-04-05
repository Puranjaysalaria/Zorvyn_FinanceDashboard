import { Role } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/jwt";

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized", 401));
  }

  const token = header.slice(7);

  try {
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true }
    });

    if (!user) {
      return next(new AppError("Unauthorized", 401));
    }

    req.user = {
      id: user.id,
      role: user.role as Role,
      status: user.status
    };

    if (req.user.status !== "ACTIVE") {
      return next(new AppError("User is inactive", 403));
    }

    return next();
  } catch (_error) {
    return next(new AppError("Invalid or expired token", 401));
  }
};
