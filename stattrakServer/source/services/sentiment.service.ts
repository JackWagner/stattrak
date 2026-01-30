/**
 * Sentiment Service
 * =================
 * Provides chat messages and voice file data for sentiment analysis.
 */

import { fileStore } from "../database/file-store";
import { NotFoundError } from "../utils/errors";
import type {
  ChatMessage,
  VoiceFileMetadata,
  MatchSentimentData,
} from "../models/sentiment.model";

export class SentimentService {
  /**
   * Get all sentiment data for a match (chat + voice files)
   */
  async getMatchSentimentData(matchId: string): Promise<MatchSentimentData> {
    const match = fileStore.getMatchById(matchId);

    if (!match) {
      throw new NotFoundError("Match");
    }

    const chatRecords = fileStore.getChatMessagesByMatchId(matchId);
    const voiceRecords = fileStore.getVoiceFilesByMatchId(matchId);

    const chatMessages: ChatMessage[] = chatRecords.map((r) => ({
      matchId: r.match_id,
      tick: r.tick,
      steamId: r.steam_id,
      playerName: r.player_name,
      message: r.message,
    }));

    const voiceFiles: VoiceFileMetadata[] = voiceRecords.map((r) => ({
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
  }

  /**
   * Get chat messages for a match
   */
  async getChatMessages(matchId: string): Promise<ChatMessage[]> {
    const match = fileStore.getMatchById(matchId);

    if (!match) {
      throw new NotFoundError("Match");
    }

    const records = fileStore.getChatMessagesByMatchId(matchId);

    return records.map((r) => ({
      matchId: r.match_id,
      tick: r.tick,
      steamId: r.steam_id,
      playerName: r.player_name,
      message: r.message,
    }));
  }

  /**
   * Get voice file metadata for a match
   */
  async getVoiceFiles(matchId: string): Promise<VoiceFileMetadata[]> {
    const match = fileStore.getMatchById(matchId);

    if (!match) {
      throw new NotFoundError("Match");
    }

    const records = fileStore.getVoiceFilesByMatchId(matchId);

    return records.map((r) => ({
      matchId: r.match_id,
      steamId: r.steam_id,
      filename: r.filename,
      filePath: r.file_path,
      sizeBytes: r.size_bytes,
      createdAt: r.created_at,
    }));
  }
}

export const sentimentService = new SentimentService();
