import { Request, Response, NextFunction } from "express";
import { playerService } from "../services/player.service";
import { BadRequestError } from "../utils/errors";
import { ApiResponse } from "../types/api.types";

export class PlayerController {
  // GET /api/players/:steamId
  async getPlayer(req: Request, res: Response, next: NextFunction) {
    try {
      const { steamId } = req.params;
      const player = await playerService.getPlayerStats(steamId);

      const response: ApiResponse<typeof player> = {
        success: true,
        data: player,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/players/:steamId/matches
  async getPlayerMatches(req: Request, res: Response, next: NextFunction) {
    try {
      const { steamId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      if (page < 1) {
        throw new BadRequestError("Page must be at least 1");
      }

      const result = await playerService.getPlayerMatches(steamId, {
        page,
        limit,
      });

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

  // GET /api/players/:steamId/weapons
  async getPlayerWeapons(req: Request, res: Response, next: NextFunction) {
    try {
      const { steamId } = req.params;
      const weapons = await playerService.getPlayerWeapons(steamId);

      const response: ApiResponse<typeof weapons> = {
        success: true,
        data: weapons,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/players/:steamId/maps
  async getPlayerMaps(req: Request, res: Response, next: NextFunction) {
    try {
      const { steamId } = req.params;
      const mapStats = await playerService.getPlayerMapStats(steamId);

      const response: ApiResponse<typeof mapStats> = {
        success: true,
        data: mapStats,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const playerController = new PlayerController();
