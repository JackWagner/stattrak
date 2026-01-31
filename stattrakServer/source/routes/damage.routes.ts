/**
 * Damage Statistics Routes
 * =========================
 * API routes for team damage endpoints.
 */

import { Router } from "express";
import { damageController } from "../controllers/damage.controller";

const router = Router();

// GET /api/damage/match/:matchId - Get damage stats for a match
router.get(
  "/match/:matchId",
  damageController.getMatchDamageStats.bind(damageController),
);

// GET /api/damage/player/:steamId - Get aggregated damage stats for a player
router.get(
  "/player/:steamId",
  damageController.getPlayerDamageStats.bind(damageController),
);

// GET /api/damage/leaderboard/team - Team damage leaderboard (hall of shame)
router.get(
  "/leaderboard/team",
  damageController.getTeamDamageLeaderboard.bind(damageController),
);

export default router;
