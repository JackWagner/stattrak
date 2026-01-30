"use strict";
/**
 * Sentiment Controller
 * ====================
 * Request handlers for sentiment analysis endpoints.
 */
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
exports.sentimentController = void 0;
const sentiment_service_1 = require("../services/sentiment.service");
exports.sentimentController = {
    /**
     * GET /api/sentiment/:matchId
     * Get all sentiment data for a match
     */
    getMatchSentimentData(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { matchId } = req.params;
                const data = yield sentiment_service_1.sentimentService.getMatchSentimentData(matchId);
                const response = {
                    success: true,
                    data,
                };
                res.json(response);
            }
            catch (error) {
                next(error);
            }
        });
    },
    /**
     * GET /api/sentiment/:matchId/chat
     * Get chat messages for a match
     */
    getChatMessages(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { matchId } = req.params;
                const messages = yield sentiment_service_1.sentimentService.getChatMessages(matchId);
                const response = {
                    success: true,
                    data: messages,
                };
                res.json(response);
            }
            catch (error) {
                next(error);
            }
        });
    },
    /**
     * GET /api/sentiment/:matchId/voice
     * Get voice file metadata for a match
     */
    getVoiceFiles(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { matchId } = req.params;
                const files = yield sentiment_service_1.sentimentService.getVoiceFiles(matchId);
                const response = {
                    success: true,
                    data: files,
                };
                res.json(response);
            }
            catch (error) {
                next(error);
            }
        });
    },
};
