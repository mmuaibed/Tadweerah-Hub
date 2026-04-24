import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import companiesRouter from "./companies";
import membersRouter from "./members";
import listingsRouter from "./listings";
import offersRouter from "./offers";
import dealsRouter from "./deals";
import lookupRouter from "./lookup";
import notificationsRouter from "./notifications";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(companiesRouter);
router.use(membersRouter);
router.use(listingsRouter);
router.use(offersRouter);
router.use(dealsRouter);
router.use(lookupRouter);
router.use(notificationsRouter);
router.use(statsRouter);

export default router;
