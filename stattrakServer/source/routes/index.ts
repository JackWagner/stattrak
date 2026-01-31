import { Router } from "express";
import playerRoutes from "./player.routes";
import matchRoutes from "./match.routes";
import flashRoutes from "./flash.routes";
import damageRoutes from "./damage.routes";
import sentimentRoutes from "./sentiment.routes";
import matchDetectionRoutes from "./match-detection.routes";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
router.use("/api/players", playerRoutes);
router.use("/api/matches", matchRoutes);
router.use("/api/flashes", flashRoutes);
router.use("/api/damage", damageRoutes);
router.use("/api/sentiment", sentimentRoutes);
router.use("/api/match-detection", matchDetectionRoutes);

export default router;
