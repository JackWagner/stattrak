"use strict";
/**
 * Sentiment Routes
 * ================
 * API routes for sentiment analysis data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sentiment_controller_1 = require("../controllers/sentiment.controller");
const router = (0, express_1.Router)();
// GET /api/sentiment/:matchId - Get all sentiment data for a match
router.get("/:matchId", sentiment_controller_1.sentimentController.getMatchSentimentData);
// GET /api/sentiment/:matchId/chat - Get chat messages
router.get("/:matchId/chat", sentiment_controller_1.sentimentController.getChatMessages);
// GET /api/sentiment/:matchId/voice - Get voice file metadata
router.get("/:matchId/voice", sentiment_controller_1.sentimentController.getVoiceFiles);
exports.default = router;
