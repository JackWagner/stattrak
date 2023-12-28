import express from "express";
import controller from "../controllers/example";

const router = express.Router();

router.post("/killsPerRound", controller.killsPerRound);
export = router;
