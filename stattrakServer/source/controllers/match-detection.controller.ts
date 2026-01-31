/**
 * Match Detection Controller
 * ===========================
 * Request handlers for unified match detection endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { matchDetectionService } from '../services/match-detection.service';
import { PollRequest, DownloadRequest } from '../models/match-detection.model';

export class MatchDetectionController {
  /**
   * GET /api/match-detection/sources
   * Get status of all match detection sources
   */
  async getSourceSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await matchDetectionService.getSourceSummary();

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/match-detection/poll
   * Poll all sources for new matches
   */
  async pollSources(req: Request, res: Response, next: NextFunction) {
    try {
      const pollRequest: PollRequest = {
        faceit_players: req.body.faceit_players || [],
        esea_players: req.body.esea_players || [],
      };

      const result = await matchDetectionService.pollAllSources(pollRequest);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/match-detection/download
   * Download a demo for a detected match
   */
  async downloadMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const downloadRequest: DownloadRequest = {
        match: req.body.match,
        output_dir: req.body.output_dir,
      };

      const result = await matchDetectionService.downloadMatch(downloadRequest);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const matchDetectionController = new MatchDetectionController();
