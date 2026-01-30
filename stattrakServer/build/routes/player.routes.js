"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const player_controller_1 = require("../controllers/player.controller");
const router = (0, express_1.Router)();
// GET /api/players/:steamId - Player profile with aggregate stats
router.get("/:steamId", (req, res, next) => player_controller_1.playerController.getPlayer(req, res, next));
// GET /api/players/:steamId/matches - Match history (paginated)
router.get("/:steamId/matches", (req, res, next) => player_controller_1.playerController.getPlayerMatches(req, res, next));
// GET /api/players/:steamId/weapons - Weapon breakdown
router.get("/:steamId/weapons", (req, res, next) => player_controller_1.playerController.getPlayerWeapons(req, res, next));
// GET /api/players/:steamId/maps - Performance by map
router.get("/:steamId/maps", (req, res, next) => player_controller_1.playerController.getPlayerMaps(req, res, next));
exports.default = router;
