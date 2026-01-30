"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const match_controller_1 = require("../controllers/match.controller");
const router = (0, express_1.Router)();
// GET /api/matches - List matches (paginated)
router.get("/", (req, res, next) => match_controller_1.matchController.getMatches(req, res, next));
// GET /api/matches/:matchId - Full match details
router.get("/:matchId", (req, res, next) => match_controller_1.matchController.getMatch(req, res, next));
// GET /api/matches/:matchId/rounds - Round-by-round breakdown
router.get("/:matchId/rounds", (req, res, next) => match_controller_1.matchController.getMatchRounds(req, res, next));
// GET /api/matches/:matchId/kills - All kills in match
router.get("/:matchId/kills", (req, res, next) => match_controller_1.matchController.getMatchKills(req, res, next));
exports.default = router;
