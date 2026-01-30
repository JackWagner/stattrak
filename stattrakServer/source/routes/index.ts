import { Router } from "express";
import playerRoutes from "./player.routes";
import matchRoutes from "./match.routes";
import flashRoutes from "./flash.routes";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
router.use("/api/players", playerRoutes);
router.use("/api/matches", matchRoutes);
router.use("/api/flashes", flashRoutes);

export default router;
