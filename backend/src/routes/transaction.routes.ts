import { Role } from "@prisma/client";
import { Router } from "express";
import { transactionController } from "../controllers/transaction.controller";
import { authenticate } from "../middleware/auth";
import { allowRoles } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
  createTransactionSchema,
  transactionIdParamSchema,
  transactionQuerySchema,
  updateTransactionSchema
} from "../validation/transaction.schema";

const router = Router();

router.use(authenticate);
router.get("/", allowRoles(Role.ADMIN, Role.ANALYST), validate(transactionQuerySchema), transactionController.list);
router.get("/:id", allowRoles(Role.ADMIN, Role.ANALYST), validate(transactionIdParamSchema), transactionController.getById);
router.post("/", allowRoles(Role.ADMIN), validate(createTransactionSchema), transactionController.create);
router.patch("/:id", allowRoles(Role.ADMIN), validate(updateTransactionSchema), transactionController.update);
router.delete("/:id", allowRoles(Role.ADMIN), validate(transactionIdParamSchema), transactionController.remove);

export { router as transactionRoutes };
