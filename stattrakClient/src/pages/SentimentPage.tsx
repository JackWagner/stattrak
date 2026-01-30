/**
 * Sentiment Analysis Page
 * =======================
 * Displays chat logs and voice file metadata for sentiment analysis.
 * Shows data from the example demo match.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMatchSentimentData, getMatches } from '../services/api';
import type { MatchSentimentData, ChatMessage, VoiceFileMetadata } from '../types';
import { Layout, Loading, ErrorMessage } from '../components';

export default function SentimentPage() {
  const [sentimentData, setSentimentData] = useState<MatchSentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Get the first match to display sentiment data
        const matchesResult = await getMatches(1, 1);
        if (matchesResult.data.length === 0) {
          setError('No matches found');
          return;
        }
        const matchId = matchesResult.data[0].matchId;
        const data = await getMatchSentimentData(matchId);
        setSentimentData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sentiment data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <Loading message="Loading sentiment data..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <ErrorMessage message={error} />
      </Layout>
    );
  }

  if (!sentimentData) {
    return (
      <Layout>
        <ErrorMessage message="No sentiment data available" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="sentiment-page">
        <h1>Sentiment Analysis</h1>
        <p className="page-subtitle">
          Chat logs and voice data for analysis. Currently showing data from match on{' '}
          <strong>{sentimentData.map}</strong>.
        </p>

        {/* Match Info Card */}
        <div className="sentiment-match-info">
          <div className="info-item">
            <span className="label">Match ID</span>
            <span className="value">{sentimentData.matchId}</span>
          </div>
          <div className="info-item">
            <span className="label">Map</span>
            <span className="value">{sentimentData.map}</span>
          </div>
          <div className="info-item">
            <span className="label">Played</span>
            <span className="value">{new Date(sentimentData.playedAt).toLocaleString()}</span>
          </div>
          <div className="info-item">
            <span className="label">Chat Messages</span>
            <span className="value">{sentimentData.chatMessageCount}</span>
          </div>
          <div className="info-item">
            <span className="label">Voice Files</span>
            <span className="value">{sentimentData.voiceFileCount}</span>
          </div>
        </div>

        {/* Chat Log Section */}
        <section className="sentiment-section">
          <h2>Chat Log</h2>
          <p className="section-description">
            In-game text chat messages for sentiment analysis.
          </p>

          {sentimentData.chatMessages.length > 0 ? (
            <div className="chat-log">
              <div className="chat-header">
                <span className="col-tick">Tick</span>
                <span className="col-player">Player</span>
                <span className="col-message">Message</span>
              </div>
              {sentimentData.chatMessages.map((msg, idx) => (
                <ChatMessageRow key={idx} message={msg} />
              ))}
            </div>
          ) : (
            <p className="no-data">No chat messages in this match.</p>
          )}
        </section>

        {/* Voice Files Section */}
        <section className="sentiment-section">
          <h2>Voice Files</h2>
          <p className="section-description">
            Extracted voice communications for speech-to-text and sentiment analysis.
          </p>

          {sentimentData.voiceFiles.length > 0 ? (
            <div className="voice-files">
              {sentimentData.voiceFiles.map((file, idx) => (
                <VoiceFileCard key={idx} file={file} />
              ))}
            </div>
          ) : (
            <div className="no-voice-data">
              <p>No voice files available for this match.</p>
              <p className="note">
                <strong>Why?</strong> This is a Valve Matchmaking demo. Valve intentionally
                strips voice data from MM demos for privacy reasons.
              </p>
              <p className="note">
                <strong>What demos have voice?</strong> Demos recorded on community servers
                (FACEIT, ESEA, self-hosted) or POV demos recorded by players can include
                voice comms, depending on server settings.
              </p>
              <p className="note">
                <strong>Setup:</strong> To extract voice from compatible demos, install{' '}
                <a href="https://github.com/akiver/csgo-voice-extractor" target="_blank" rel="noopener noreferrer">
                  csgo-voice-extractor
                </a>
                {' '}and re-process the demo.
              </p>
            </div>
          )}
        </section>

        {/* Data Schema Section */}
        <section className="sentiment-section">
          <h2>Data Schema</h2>
          <p className="section-description">
            Structure of the data available for sentiment analysis pipelines.
          </p>

          <div className="schema-cards">
            <div className="schema-card">
              <h3>Chat Message</h3>
              <pre>{`{
  matchId: string,
  tick: number,
  steamId: string,
  playerName: string,
  message: string
}`}</pre>
            </div>

            <div className="schema-card">
              <h3>Voice File Metadata</h3>
              <pre>{`{
  matchId: string,
  steamId: string,
  filename: string,
  filePath: string,
  sizeBytes: number,
  createdAt: string
}`}</pre>
            </div>
          </div>
        </section>

        <style>{`
          .sentiment-page {
            max-width: 1000px;
            margin: 0 auto;
          }

          .page-subtitle {
            color: #888;
            margin-bottom: 2rem;
          }

          .sentiment-match-info {
            display: flex;
            flex-wrap: wrap;
            gap: 1.5rem;
            background: #1a1a25;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 2rem;
          }

          .info-item {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .info-item .label {
            font-size: 0.75rem;
            color: #666;
            text-transform: uppercase;
          }

          .info-item .value {
            font-size: 1rem;
            color: #fff;
            font-family: monospace;
          }

          .sentiment-section {
            margin-bottom: 3rem;
          }

          .sentiment-section h2 {
            margin-bottom: 0.5rem;
            color: var(--color-accent);
          }

          .section-description {
            color: #888;
            margin-bottom: 1rem;
            font-size: 0.9rem;
          }

          /* Chat Log Styles */
          .chat-log {
            background: #12121a;
            border-radius: 8px;
            overflow: hidden;
          }

          .chat-header {
            display: grid;
            grid-template-columns: 80px 150px 1fr;
            gap: 1rem;
            padding: 0.75rem 1rem;
            background: #1a1a25;
            font-size: 0.75rem;
            color: #666;
            text-transform: uppercase;
            font-weight: 600;
          }

          .chat-row {
            display: grid;
            grid-template-columns: 80px 150px 1fr;
            gap: 1rem;
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #1a1a25;
            font-size: 0.9rem;
          }

          .chat-row:hover {
            background: #1a1a25;
          }

          .chat-row .tick {
            color: #666;
            font-family: monospace;
            font-size: 0.8rem;
          }

          .chat-row .player {
            color: var(--color-accent);
          }

          .chat-row .message {
            color: #ccc;
            word-break: break-word;
          }

          /* Voice Files Styles */
          .voice-files {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1rem;
          }

          .voice-file-card {
            background: #1a1a25;
            border-radius: 8px;
            padding: 1rem;
          }

          .voice-file-card h4 {
            margin: 0 0 0.5rem 0;
            color: var(--color-accent);
            font-size: 0.9rem;
          }

          .voice-file-card .meta {
            font-size: 0.8rem;
            color: #888;
          }

          .voice-file-card .meta span {
            display: block;
            margin-bottom: 0.25rem;
          }

          .voice-file-card audio {
            width: 100%;
            margin-top: 0.75rem;
          }

          .no-voice-data {
            background: #1a1a25;
            padding: 2rem;
            border-radius: 8px;
            text-align: center;
          }

          .no-voice-data .note {
            font-size: 0.85rem;
            color: #666;
            margin-top: 0.5rem;
          }

          .no-voice-data a {
            color: var(--color-accent);
          }

          /* Schema Styles */
          .schema-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1rem;
          }

          .schema-card {
            background: #1a1a25;
            border-radius: 8px;
            padding: 1rem;
          }

          .schema-card h3 {
            margin: 0 0 0.75rem 0;
            font-size: 0.9rem;
            color: var(--color-accent);
          }

          .schema-card pre {
            margin: 0;
            font-size: 0.8rem;
            color: #aaa;
            background: #12121a;
            padding: 0.75rem;
            border-radius: 4px;
            overflow-x: auto;
          }

          .no-data {
            color: #666;
            text-align: center;
            padding: 2rem;
          }
        `}</style>
      </div>
    </Layout>
  );
}

// Sub-component for chat message row
function ChatMessageRow({ message }: { message: ChatMessage }) {
  return (
    <div className="chat-row">
      <span className="tick">{message.tick}</span>
      <Link to={`/players/${message.steamId}`} className="player">
        {message.playerName}
      </Link>
      <span className="message">{message.message}</span>
    </div>
  );
}

// Sub-component for voice file card
function VoiceFileCard({ file }: { file: VoiceFileMetadata }) {
  const fileSizeKB = (file.sizeBytes / 1024).toFixed(1);

  return (
    <div className="voice-file-card">
      <h4>{file.filename}</h4>
      <div className="meta">
        <span>Steam ID: {file.steamId}</span>
        <span>Size: {fileSizeKB} KB</span>
        <span>Created: {new Date(file.createdAt).toLocaleString()}</span>
      </div>
      {/* Audio player - works if file is served statically */}
      {/* <audio controls src={`/voice/${file.matchId}/${file.filename}`} /> */}
    </div>
  );
}
