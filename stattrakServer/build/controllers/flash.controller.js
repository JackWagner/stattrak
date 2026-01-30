"use strict";
/**
 * Flash Statistics Controller
 * ===========================
 * Request handlers for flash-related endpoints.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.flashController = exports.FlashController = void 0;
const flash_service_1 = require("../services/flash.service");
class FlashController {
    /**
     * GET /api/flashes/match/:matchId
     * Get flash stats for all players in a match
     */
    getMatchFlashStats(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { matchId } = req.params;
                const flashStats = yield flash_service_1.flashService.getMatchFlashStats(matchId);
                res.json({
                    success: true,
                    data: flashStats,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * GET /api/flashes/player/:steamId
     * Get aggregated flash stats for a player
     */
    getPlayerFlashStats(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { steamId } = req.params;
                const flashStats = yield flash_service_1.flashService.getPlayerFlashStats(steamId);
                res.json({
                    success: true,
                    data: flashStats,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * GET /api/flashes/leaderboard/team
     * Get team flash leaderboard (hall of shame)
     */
    getTeamFlashLeaderboard(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = Math.min(parseInt(req.query.limit) || 20, 100);
                const leaderboard = yield flash_service_1.flashService.getTeamFlashLeaderboard({
                    page,
                    limit,
                });
                res.json({
                    success: true,
                    data: leaderboard.items,
                    meta: {
                        page: leaderboard.page,
                        limit: leaderboard.limit,
                        total: leaderboard.total,
                        totalPages: leaderboard.totalPages,
                    },
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * GET /api/flashes/leaderboard/enemy
     * Get enemy flash leaderboard (hall of fame)
     */
    getEnemyFlashLeaderboard(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = Math.min(parseInt(req.query.limit) || 20, 100);
                const leaderboard = yield flash_service_1.flashService.getEnemyFlashLeaderboard({
                    page,
                    limit,
                });
                res.json({
                    success: true,
                    data: leaderboard.items,
                    meta: {
                        page: leaderboard.page,
                        limit: leaderboard.limit,
                        total: leaderboard.total,
                        totalPages: leaderboard.totalPages,
                    },
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.FlashController = FlashController;
exports.flashController = new FlashController();
