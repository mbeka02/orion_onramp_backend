import Express, { Router } from "express";
import { checkTokenAssociation } from "../controllers/tokenAssociation";
import { authenticationMiddleware } from "../middleware/authenticationMiddleware";

const router: Router = Express.Router();

router.get(
  "/check/:walletAddress",
  authenticationMiddleware,
  checkTokenAssociation,
);

export default router;
