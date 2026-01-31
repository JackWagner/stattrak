/**
 * Match Detection Service
 * =======================
 * Service for unified match detection across platforms.
 */

import { spawn } from 'child_process';
import path from 'path';
import {
  DetectedMatch,
  MatchDetectionSummary,
  PollRequest,
  PollResponse,
  DownloadRequest,
  DownloadResponse,
} from '../models/match-detection.model';

export class MatchDetectionService {
  private pythonScriptPath: string;

  constructor() {
    // Path to the Python unified match detection script
    this.pythonScriptPath = path.join(
      process.cwd(),
      '..',
      'demoETL',
      'unified_match_detection.py'
    );
  }

  /**
   * Execute Python script and return parsed JSON result
   */
  private async executePythonScript(
    args: string[]
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const python = spawn('python', [this.pythonScriptPath, ...args]);

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script failed: ${stderr}`));
        } else {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse Python output: ${stdout}`));
          }
        }
      });
    });
  }

  /**
   * Get status summary of all match detection sources
   */
  async getSourceSummary(): Promise<MatchDetectionSummary> {
    try {
      const result = await this.executePythonScript(['--summary']);
      return result as MatchDetectionSummary;
    } catch (error) {
      throw new Error(`Failed to get source summary: ${error}`);
    }
  }

  /**
   * Poll all configured sources for new matches
   */
  async pollAllSources(request: PollRequest): Promise<PollResponse> {
    try {
      const args = ['--poll'];

      if (request.faceit_players && request.faceit_players.length > 0) {
        args.push('--faceit-players', request.faceit_players.join(','));
      }

      if (request.esea_players && request.esea_players.length > 0) {
        args.push('--esea-players', request.esea_players.join(','));
      }

      const matches = await this.executePythonScript(args);

      return {
        success: true,
        matches: matches as DetectedMatch[],
        sources_polled: this.getSourcesPolled(request),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to poll sources: ${error}`);
    }
  }

  /**
   * Download a demo for a detected match
   */
  async downloadMatch(request: DownloadRequest): Promise<DownloadResponse> {
    try {
      const args = [
        '--download',
        '--source', request.match.source,
        '--match-id', request.match.match_id,
      ];

      if (request.output_dir) {
        args.push('--output-dir', request.output_dir);
      }

      const result = await this.executePythonScript(args);

      return {
        success: true,
        demo_path: result.demo_path,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to download match: ${error}`,
      };
    }
  }

  /**
   * Helper to determine which sources were polled
   */
  private getSourcesPolled(request: PollRequest): string[] {
    const sources = ['steam']; // Steam is always polled

    if (request.faceit_players && request.faceit_players.length > 0) {
      sources.push('faceit');
    }

    if (request.esea_players && request.esea_players.length > 0) {
      sources.push('esea');
    }

    return sources;
  }
}

export const matchDetectionService = new MatchDetectionService();
