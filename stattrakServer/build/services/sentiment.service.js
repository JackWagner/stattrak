"use strict";
/**
 * Sentiment Service
 * =================
 * Provides chat messages and voice file data for sentiment analysis.
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
exports.sentimentService = exports.SentimentService = void 0;
const file_store_1 = require("../database/file-store");
const errors_1 = require("../utils/errors");
class SentimentService {
    /**
     * Get all sentiment data for a match (chat + voice files)
     */
    getMatchSentimentData(matchId) {
        return __awaiter(this, void 0, void 0, function* () {
            const match = file_store_1.fileStore.getMatchById(matchId);
            if (!match) {
                throw new errors_1.NotFoundError("Match");
            }
            const chatRecords = file_store_1.fileStore.getChatMessagesByMatchId(matchId);
            const voiceRecords = file_store_1.fileStore.getVoiceFilesByMatchId(matchId);
            const chatMessages = chatRecords.map((r) => ({
                matchId: r.match_id,
                tick: r.tick,
                steamId: r.steam_id,
                playerName: r.player_name,
                message: r.message,
            }));
            const voiceFiles = voiceRecords.map((r) => ({
                matchId: r.match_id,
                steamId: r.steam_id,
                filename: r.filename,
                filePath: r.file_path,
                sizeBytes: r.size_bytes,
                createdAt: r.created_at,
            }));
            return {
                matchId: match.match_id,
                map: match.map,
                playedAt: match.played_at || match.created_at,
                chatMessages,
                voiceFiles,
                chatMessageCount: chatMessages.length,
                voiceFileCount: voiceFiles.length,
            };
        });
    }
    /**
     * Get chat messages for a match
     */
    getChatMessages(matchId) {
        return __awaiter(this, void 0, void 0, function* () {
            const match = file_store_1.fileStore.getMatchById(matchId);
            if (!match) {
                throw new errors_1.NotFoundError("Match");
            }
            const records = file_store_1.fileStore.getChatMessagesByMatchId(matchId);
            return records.map((r) => ({
                matchId: r.match_id,
                tick: r.tick,
                steamId: r.steam_id,
                playerName: r.player_name,
                message: r.message,
            }));
        });
    }
    /**
     * Get voice file metadata for a match
     */
    getVoiceFiles(matchId) {
        return __awaiter(this, void 0, void 0, function* () {
            const match = file_store_1.fileStore.getMatchById(matchId);
            if (!match) {
                throw new errors_1.NotFoundError("Match");
            }
            const records = file_store_1.fileStore.getVoiceFilesByMatchId(matchId);
            return records.map((r) => ({
                matchId: r.match_id,
                steamId: r.steam_id,
                filename: r.filename,
                filePath: r.file_path,
                sizeBytes: r.size_bytes,
                createdAt: r.created_at,
            }));
        });
    }
}
exports.SentimentService = SentimentService;
exports.sentimentService = new SentimentService();
