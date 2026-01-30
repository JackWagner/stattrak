"use strict";
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
exports.playerController = exports.PlayerController = void 0;
const player_service_1 = require("../services/player.service");
const errors_1 = require("../utils/errors");
class PlayerController {
    // GET /api/players/:steamId
    getPlayer(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { steamId } = req.params;
                const player = yield player_service_1.playerService.getPlayerStats(steamId);
                const response = {
                    success: true,
                    data: player,
                };
                res.json(response);
            }
            catch (error) {
                next(error);
            }
        });
    }
    // GET /api/players/:steamId/matches
    getPlayerMatches(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { steamId } = req.params;
                const page = parseInt(req.query.page) || 1;
                const limit = Math.min(parseInt(req.query.limit) || 20, 100);
                if (page < 1) {
                    throw new errors_1.BadRequestError("Page must be at least 1");
                }
                const result = yield player_service_1.playerService.getPlayerMatches(steamId, {
                    page,
                    limit,
                });
                const response = {
                    success: true,
                    data: result.items,
                    meta: {
                        page: result.page,
                        limit: result.limit,
                        total: result.total,
                        totalPages: result.totalPages,
                    },
                };
                res.json(response);
            }
            catch (error) {
                next(error);
            }
        });
    }
    // GET /api/players/:steamId/weapons
    getPlayerWeapons(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { steamId } = req.params;
                const weapons = yield player_service_1.playerService.getPlayerWeapons(steamId);
                const response = {
                    success: true,
                    data: weapons,
                };
                res.json(response);
            }
            catch (error) {
                next(error);
            }
        });
    }
    // GET /api/players/:steamId/maps
    getPlayerMaps(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { steamId } = req.params;
                const mapStats = yield player_service_1.playerService.getPlayerMapStats(steamId);
                const response = {
                    success: true,
                    data: mapStats,
                };
                res.json(response);
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.PlayerController = PlayerController;
exports.playerController = new PlayerController();
