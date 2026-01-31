/**
 * Damage Statistics Controller
 * =============================
 * Request handlers for team damage-related endpoints.
 */

import { Request, Response, NextFunction } from "express";
import { damageService } from "../services/damage.service";

export class DamageController {
  /**
   * GET /api/damage/match/:matchId
   * Get damage stats for all players in a match
   */
  async getMatchDamageStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId } = req.params;
      const damageStats = await damageService.getMatchDamageStats(matchId);

      res.json({
        success: true,
        data: damageStats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/damage/player/:steamId
   * Get aggregated damage stats for a player
   */
  async getPlayerDamageStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { steamId } = req.params;
      const damageStats = await damageService.getPlayerDamageStats(steamId);

      res.json({
        success: true,
        data: damageStats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/damage/leaderboard/team
   * Get team damage leaderboard (hall of shame)
   */
  async getTeamDamageLeaderboard(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const leaderboard = await damageService.getTeamDamageLeaderboard({
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

export const damageController = new DamageController();
