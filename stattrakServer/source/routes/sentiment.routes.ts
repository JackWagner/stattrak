/**
 * Sentiment Routes
 * ================
 * API routes for sentiment analysis data.
 */

import { Router } from "express";
import { sentimentController } from "../controllers/sentiment.controller";

const router = Router();

// GET /api/sentiment/:matchId - Get all sentiment data for a match
router.get("/:matchId", sentimentController.getMatchSentimentData);

// GET /api/sentiment/:matchId/chat - Get chat messages
router.get("/:matchId/chat", sentimentController.getChatMessages);

// GET /api/sentiment/:matchId/voice - Get voice file metadata
router.get("/:matchId/voice", sentimentController.getVoiceFiles);

export default router;
