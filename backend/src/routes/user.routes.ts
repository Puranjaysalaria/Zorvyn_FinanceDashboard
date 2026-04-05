import { Role } from "@prisma/client";
import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth";
import { allowRoles } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { createUserSchema, updateUserSchema, userIdParamSchema } from "../validation/user.schema";

const router = Router();

router.use(authenticate, allowRoles(Role.ADMIN));
router.post("/", validate(createUserSchema), userController.create);
router.get("/", userController.list);
router.get("/:id", validate(userIdParamSchema), userController.getById);
router.patch("/:id", validate(updateUserSchema), userController.update);
router.patch("/:id/deactivate", validate(userIdParamSchema), userController.deactivate);

export { router as userRoutes };
