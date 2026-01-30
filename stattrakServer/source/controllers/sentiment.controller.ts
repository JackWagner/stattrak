/**
 * Sentiment Controller
 * ====================
 * Request handlers for sentiment analysis endpoints.
 */

import type { Request, Response, NextFunction } from "express";
import { sentimentService } from "../services/sentiment.service";
import { ApiResponse } from "../types/api.types";

export const sentimentController = {
  /**
   * GET /api/sentiment/:matchId
   * Get all sentiment data for a match
   */
  async getMatchSentimentData(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId } = req.params;
      const data = await sentimentService.getMatchSentimentData(matchId);

      const response: ApiResponse<typeof data> = {
        success: true,
        data,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/sentiment/:matchId/chat
   * Get chat messages for a match
   */
  async getChatMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId } = req.params;
      const messages = await sentimentService.getChatMessages(matchId);

      const response: ApiResponse<typeof messages> = {
        success: true,
        data: messages,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/sentiment/:matchId/voice
   * Get voice file metadata for a match
   */
  async getVoiceFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId } = req.params;
      const files = await sentimentService.getVoiceFiles(matchId);

      const response: ApiResponse<typeof files> = {
        success: true,
        data: files,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  },
};
