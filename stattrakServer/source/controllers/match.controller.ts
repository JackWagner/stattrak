import { Request, Response, NextFunction } from "express";
import { matchService } from "../services/match.service";
import { BadRequestError } from "../utils/errors";
import { ApiResponse } from "../types/api.types";

export class MatchController {
  // GET /api/matches
  async getMatches(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      if (page < 1) {
        throw new BadRequestError("Page must be at least 1");
      }

      const result = await matchService.getMatches({ page, limit });

      const response: ApiResponse<typeof result.items> = {
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
    } catch (error) {
      next(error);
    }
  }

  // GET /api/matches/:matchId
  async getMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId } = req.params;
      const match = await matchService.getMatchById(matchId);

      const response: ApiResponse<typeof match> = {
        success: true,
        data: match,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/matches/:matchId/rounds
  async getMatchRounds(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId } = req.params;
      const rounds = await matchService.getMatchRounds(matchId);

      const response: ApiResponse<typeof rounds> = {
        success: true,
        data: rounds,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/matches/:matchId/kills
  async getMatchKills(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId } = req.params;
      const kills = await matchService.getMatchKills(matchId);

      const response: ApiResponse<typeof kills> = {
        success: true,
        data: kills,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const matchController = new MatchController();
