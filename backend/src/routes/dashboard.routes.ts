import { Role } from "@prisma/client";
import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller";
import { authenticate } from "../middleware/auth";
import { allowRoles } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { dashboardTrendsQuerySchema } from "../validation/dashboard.schema";

const router = Router();

router.use(authenticate, allowRoles(Role.ADMIN, Role.ANALYST, Role.VIEWER));
router.get("/summary", dashboardController.summary);
router.get("/categories", dashboardController.categoryTotals);
router.get("/trends", validate(dashboardTrendsQuerySchema), dashboardController.trends);
router.get("/monthly-trends", validate(dashboardTrendsQuerySchema), dashboardController.trends);

export { router as dashboardRoutes };
