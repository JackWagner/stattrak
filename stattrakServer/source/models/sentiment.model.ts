/**
 * Sentiment Models
 * ================
 * TypeScript interfaces for chat and voice sentiment analysis data.
 */

export interface ChatMessage {
  matchId: string;
  tick: number;
  steamId: string;
  playerName: string;
  message: string;
}

export interface VoiceFileMetadata {
  matchId: string;
  steamId: string;
  filename: string;
  filePath: string;
  sizeBytes: number;
  createdAt: string;
}

export interface MatchSentimentData {
  matchId: string;
  map: string;
  playedAt: string;
  chatMessages: ChatMessage[];
  voiceFiles: VoiceFileMetadata[];
  chatMessageCount: number;
  voiceFileCount: number;
}
