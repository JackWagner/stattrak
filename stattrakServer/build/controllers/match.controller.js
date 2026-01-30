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
exports.matchController = exports.MatchController = void 0;
const match_service_1 = require("../services/match.service");
const errors_1 = require("../utils/errors");
class MatchController {
    // GET /api/matches
    getMatches(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = Math.min(parseInt(req.query.limit) || 20, 100);
                if (page < 1) {
                    throw new errors_1.BadRequestError("Page must be at least 1");
                }
                const result = yield match_service_1.matchService.getMatches({ page, limit });
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
    // GET /api/matches/:matchId
    getMatch(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { matchId } = req.params;
                const match = yield match_service_1.matchService.getMatchById(matchId);
                const response = {
                    success: true,
                    data: match,
                };
                res.json(response);
            }
            catch (error) {
                next(error);
            }
        });
    }
    // GET /api/matches/:matchId/rounds
    getMatchRounds(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { matchId } = req.params;
                const rounds = yield match_service_1.matchService.getMatchRounds(matchId);
                const response = {
                    success: true,
                    data: rounds,
                };
                res.json(response);
            }
            catch (error) {
                next(error);
            }
        });
    }
    // GET /api/matches/:matchId/kills
    getMatchKills(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { matchId } = req.params;
                const kills = yield match_service_1.matchService.getMatchKills(matchId);
                const response = {
                    success: true,
                    data: kills,
                };
                res.json(response);
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.MatchController = MatchController;
exports.matchController = new MatchController();
