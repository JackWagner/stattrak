/**
 * Flash Statistics Controller
 * ===========================
 * Request handlers for flash-related endpoints.
 */

import { Request, Response, NextFunction } from "express";
import { flashService } from "../services/flash.service";

export class FlashController {
  /**
   * GET /api/flashes/match/:matchId
   * Get flash stats for all players in a match
   */
  async getMatchFlashStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId } = req.params;
      const flashStats = await flashService.getMatchFlashStats(matchId);

      res.json({
        success: true,
        data: flashStats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/flashes/player/:steamId
   * Get aggregated flash stats for a player
   */
  async getPlayerFlashStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { steamId } = req.params;
      const flashStats = await flashService.getPlayerFlashStats(steamId);

      res.json({
        success: true,
        data: flashStats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/flashes/leaderboard/team
   * Get team flash leaderboard (hall of shame)
   */
  async getTeamFlashLeaderboard(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const leaderboard = await flashService.getTeamFlashLeaderboard({
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/flashes/leaderboard/enemy
   * Get enemy flash leaderboard (hall of fame)
   */
  async getEnemyFlashLeaderboard(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const leaderboard = await flashService.getEnemyFlashLeaderboard({
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
    } catch (error) {
      next(error);
    }
  }
}

export const flashController = new FlashController();
