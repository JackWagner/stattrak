/**
 * Flash Statistics Routes
 * =======================
 * API endpoints for flashbang statistics.
 *
 * Endpoints:
 *   GET /api/flashes/match/:matchId     - Flash stats for a match
 *   GET /api/flashes/player/:steamId    - Flash stats for a player
 *   GET /api/flashes/leaderboard/team   - Team flash hall of shame
 *   GET /api/flashes/leaderboard/enemy  - Enemy flash hall of fame
 */

import { Router } from "express";
import { flashController } from "../controllers/flash.controller";

const router = Router();

// Match flash stats
router.get("/match/:matchId", (req, res, next) =>
  flashController.getMatchFlashStats(req, res, next),
);

// Player flash stats
router.get("/player/:steamId", (req, res, next) =>
  flashController.getPlayerFlashStats(req, res, next),
);

// Leaderboards
router.get("/leaderboard/team", (req, res, next) =>
  flashController.getTeamFlashLeaderboard(req, res, next),
);

router.get("/leaderboard/enemy", (req, res, next) =>
  flashController.getEnemyFlashLeaderboard(req, res, next),
);

export default router;
