import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import companiesRouter from "./companies";
import listingsRouter from "./listings";
import offersRouter from "./offers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(companiesRouter);
router.use(listingsRouter);
router.use(offersRouter);

export default router;
