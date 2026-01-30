import { Router } from "express";
import { playerController } from "../controllers/player.controller";

const router = Router();

// GET /api/players/:steamId - Player profile with aggregate stats
router.get("/:steamId", (req, res, next) =>
  playerController.getPlayer(req, res, next),
);

// GET /api/players/:steamId/matches - Match history (paginated)
router.get("/:steamId/matches", (req, res, next) =>
  playerController.getPlayerMatches(req, res, next),
);

// GET /api/players/:steamId/weapons - Weapon breakdown
router.get("/:steamId/weapons", (req, res, next) =>
  playerController.getPlayerWeapons(req, res, next),
);

// GET /api/players/:steamId/maps - Performance by map
router.get("/:steamId/maps", (req, res, next) =>
  playerController.getPlayerMaps(req, res, next),
);

export default router;
