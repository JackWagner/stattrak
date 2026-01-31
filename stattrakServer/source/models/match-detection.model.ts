/**
 * Match Detection Models
 * ======================
 * TypeScript interfaces for unified match detection across platforms.
 */

export interface DetectedMatch {
  source: 'steam' | 'faceit' | 'esea';
  match_id: string;
  demo_url?: string;
  detected_at: string;
  status?: 'pending' | 'downloading' | 'processing' | 'completed' | 'failed';
  players?: string[];
}

export interface SourceStatus {
  enabled: boolean;
  description: string;
  api_required?: boolean;
  note?: string;
}

export interface MatchDetectionSummary {
  steam: SourceStatus;
  faceit: SourceStatus;
  esea: SourceStatus;
}

export interface PollRequest {
  faceit_players?: string[];
  esea_players?: string[];
}

export interface PollResponse {
  success: boolean;
  matches: DetectedMatch[];
  sources_polled: string[];
  timestamp: string;
}

export interface DownloadRequest {
  match: DetectedMatch;
  output_dir?: string;
}

export interface DownloadResponse {
  success: boolean;
  demo_path?: string;
  error?: string;
}
