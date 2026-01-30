import { Router } from "express";
import { matchController } from "../controllers/match.controller";

const router = Router();

// GET /api/matches - List matches (paginated)
router.get("/", (req, res, next) => matchController.getMatches(req, res, next));

// GET /api/matches/:matchId - Full match details
router.get("/:matchId", (req, res, next) =>
  matchController.getMatch(req, res, next),
);

// GET /api/matches/:matchId/rounds - Round-by-round breakdown
router.get("/:matchId/rounds", (req, res, next) =>
  matchController.getMatchRounds(req, res, next),
);

// GET /api/matches/:matchId/kills - All kills in match
router.get("/:matchId/kills", (req, res, next) =>
  matchController.getMatchKills(req, res, next),
);

export default router;
