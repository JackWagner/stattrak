"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const flash_controller_1 = require("../controllers/flash.controller");
const router = (0, express_1.Router)();
// Match flash stats
router.get("/match/:matchId", (req, res, next) => flash_controller_1.flashController.getMatchFlashStats(req, res, next));
// Player flash stats
router.get("/player/:steamId", (req, res, next) => flash_controller_1.flashController.getPlayerFlashStats(req, res, next));
// Leaderboards
router.get("/leaderboard/team", (req, res, next) => flash_controller_1.flashController.getTeamFlashLeaderboard(req, res, next));
router.get("/leaderboard/enemy", (req, res, next) => flash_controller_1.flashController.getEnemyFlashLeaderboard(req, res, next));
exports.default = router;
