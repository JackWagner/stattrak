"""
Sentiment Analysis Pipeline
===========================
Analyzes voice communications from CS2 demos using AWS services.

Pipeline:
    WAV file → Amazon Transcribe (speech-to-text) → Amazon Comprehend (sentiment)

Requirements:
    pip install boto3

AWS Setup:
    - Configure AWS credentials (aws configure or environment variables)
    - Ensure IAM role has permissions for:
        - transcribe:StartTranscriptionJob
        - transcribe:GetTranscriptionJob
        - comprehend:DetectSentiment
        - comprehend:BatchDetectSentiment
        - s3:PutObject, s3:GetObject (for Transcribe input/output)

Usage:
    from sentiment_analysis import VoiceSentimentAnalyzer

    analyzer = VoiceSentimentAnalyzer(s3_bucket="your-bucket")
    results = analyzer.analyze_match_voice("match_id", "/path/to/voice_output/")
"""

import os
import json
import wave
import struct
import time
import logging
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Any
from pathlib import Path

logger = logging.getLogger(__name__)

# AWS imports - wrapped in try/except for environments without boto3
try:
    import boto3
    from botocore.exceptions import ClientError
    AWS_AVAILABLE = True
except ImportError:
    AWS_AVAILABLE = False
    logger.warning("boto3 not installed. AWS features disabled.")


# =============================================================================
# WAV FILE PARSING
# =============================================================================

@dataclass
class WavMetadata:
    """Metadata extracted from a WAV file."""
    file_path: str
    filename: str
    steam_id: str  # Extracted from filename
    duration_seconds: float
    sample_rate: int
    channels: int
    bits_per_sample: int
    file_size_bytes: int


def parse_wav_metadata(wav_path: str) -> WavMetadata:
    """
    Parse WAV file header to extract metadata.

    WAV Format (RIFF):
        Bytes 0-3:   "RIFF"
        Bytes 4-7:   File size - 8
        Bytes 8-11:  "WAVE"
        Bytes 12-15: "fmt " (format chunk)
        Bytes 16-19: Format chunk size (16 for PCM)
        Bytes 20-21: Audio format (1 = PCM)
        Bytes 22-23: Number of channels
        Bytes 24-27: Sample rate
        Bytes 28-31: Byte rate
        Bytes 32-33: Block align
        Bytes 34-35: Bits per sample
        ... data chunk follows
    """
    filename = os.path.basename(wav_path)
    # csgo-voice-extractor names files as <steam_id>.wav
    steam_id = filename.replace('.wav', '')

    file_size = os.path.getsize(wav_path)

    with wave.open(wav_path, 'rb') as wav_file:
        channels = wav_file.getnchannels()
        sample_rate = wav_file.getframerate()
        bits_per_sample = wav_file.getsampwidth() * 8
        n_frames = wav_file.getnframes()
        duration = n_frames / sample_rate if sample_rate > 0 else 0

    return WavMetadata(
        file_path=wav_path,
        filename=filename,
        steam_id=steam_id,
        duration_seconds=round(duration, 2),
        sample_rate=sample_rate,
        channels=channels,
        bits_per_sample=bits_per_sample,
        file_size_bytes=file_size
    )


def get_wav_files_for_match(voice_dir: str) -> List[WavMetadata]:
    """Get all WAV files in a match's voice output directory."""
    wav_files = []
    voice_path = Path(voice_dir)

    if not voice_path.exists():
        return wav_files

    for wav_file in voice_path.glob("*.wav"):
        try:
            metadata = parse_wav_metadata(str(wav_file))
            wav_files.append(metadata)
        except Exception as e:
            logger.warning(f"Failed to parse {wav_file}: {e}")

    return wav_files


# =============================================================================
# SENTIMENT DATA STRUCTURES
# =============================================================================

@dataclass
class TranscriptSegment:
    """A segment of transcribed speech."""
    text: str
    start_time: float
    end_time: float
    confidence: float


@dataclass
class SentimentScore:
    """Sentiment analysis scores from AWS Comprehend."""
    positive: float
    negative: float
    neutral: float
    mixed: float
    dominant: str  # "POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"


@dataclass
class PlayerVoiceSentiment:
    """Complete sentiment analysis for one player's voice in a match."""
    match_id: str
    steam_id: str
    wav_file: str
    duration_seconds: float
    transcript: str
    segments: List[TranscriptSegment]
    overall_sentiment: SentimentScore
    segment_sentiments: List[Dict[str, Any]]  # Per-segment sentiment
    word_count: int
    analyzed_at: str


@dataclass
class MatchVoiceSentimentSummary:
    """Summary of voice sentiment for an entire match."""
    match_id: str
    player_sentiments: List[PlayerVoiceSentiment]
    total_voice_duration: float
    avg_sentiment: SentimentScore
    most_positive_player: Optional[str]
    most_negative_player: Optional[str]
    analyzed_at: str


# =============================================================================
# AWS TRANSCRIBE INTEGRATION
# =============================================================================

class TranscribeClient:
    """Wrapper for Amazon Transcribe speech-to-text."""

    def __init__(self, s3_bucket: str, region: str = "us-east-1"):
        if not AWS_AVAILABLE:
            raise RuntimeError("boto3 is required for AWS integration")

        self.s3_bucket = s3_bucket
        self.region = region
        self.s3_client = boto3.client('s3', region_name=region)
        self.transcribe_client = boto3.client('transcribe', region_name=region)

    def upload_to_s3(self, local_path: str, s3_key: str) -> str:
        """Upload a file to S3 and return the S3 URI."""
        self.s3_client.upload_file(local_path, self.s3_bucket, s3_key)
        return f"s3://{self.s3_bucket}/{s3_key}"

    def start_transcription(
        self,
        job_name: str,
        s3_uri: str,
        language_code: str = "en-US"
    ) -> str:
        """Start an async transcription job."""
        try:
            self.transcribe_client.start_transcription_job(
                TranscriptionJobName=job_name,
                Media={'MediaFileUri': s3_uri},
                MediaFormat='wav',
                LanguageCode=language_code,
                Settings={
                    'ShowSpeakerLabels': False,
                    'ShowAlternatives': False,
                }
            )
            return job_name
        except ClientError as e:
            logger.error(f"Failed to start transcription: {e}")
            raise

    def wait_for_transcription(
        self,
        job_name: str,
        poll_interval: int = 5,
        timeout: int = 300
    ) -> Dict[str, Any]:
        """Wait for transcription job to complete and return results."""
        start_time = time.time()

        while True:
            if time.time() - start_time > timeout:
                raise TimeoutError(f"Transcription job {job_name} timed out")

            response = self.transcribe_client.get_transcription_job(
                TranscriptionJobName=job_name
            )
            status = response['TranscriptionJob']['TranscriptionJobStatus']

            if status == 'COMPLETED':
                # Fetch the transcript from the result URL
                transcript_uri = response['TranscriptionJob']['Transcript']['TranscriptFileUri']
                # Download and parse the transcript JSON
                import urllib.request
                with urllib.request.urlopen(transcript_uri) as resp:
                    return json.loads(resp.read().decode())

            elif status == 'FAILED':
                reason = response['TranscriptionJob'].get('FailureReason', 'Unknown')
                raise RuntimeError(f"Transcription failed: {reason}")

            time.sleep(poll_interval)

    def transcribe_wav(
        self,
        wav_path: str,
        job_prefix: str = "stattrak"
    ) -> Dict[str, Any]:
        """
        Transcribe a WAV file end-to-end.

        Returns the full Transcribe result including segments with timestamps.
        """
        filename = os.path.basename(wav_path)
        job_name = f"{job_prefix}-{int(time.time())}-{filename.replace('.wav', '')}"
        s3_key = f"voice-input/{job_name}.wav"

        # Upload to S3
        s3_uri = self.upload_to_s3(wav_path, s3_key)

        # Start transcription
        self.start_transcription(job_name, s3_uri)

        # Wait for completion
        result = self.wait_for_transcription(job_name)

        return result

    def parse_transcript_result(self, result: Dict[str, Any]) -> tuple[str, List[TranscriptSegment]]:
        """Parse Transcribe result into transcript text and segments."""
        results = result.get('results', {})
        transcripts = results.get('transcripts', [])

        full_text = transcripts[0]['transcript'] if transcripts else ""

        segments = []
        items = results.get('items', [])

        for item in items:
            if item['type'] == 'pronunciation':
                segment = TranscriptSegment(
                    text=item['alternatives'][0]['content'],
                    start_time=float(item.get('start_time', 0)),
                    end_time=float(item.get('end_time', 0)),
                    confidence=float(item['alternatives'][0].get('confidence', 0))
                )
                segments.append(segment)

        return full_text, segments


# =============================================================================
# AWS COMPREHEND INTEGRATION
# =============================================================================

class ComprehendClient:
    """Wrapper for Amazon Comprehend sentiment analysis."""

    def __init__(self, region: str = "us-east-1"):
        if not AWS_AVAILABLE:
            raise RuntimeError("boto3 is required for AWS integration")

        self.region = region
        self.comprehend_client = boto3.client('comprehend', region_name=region)

    def analyze_sentiment(self, text: str, language: str = "en") -> SentimentScore:
        """
        Analyze sentiment of a text string.

        Returns scores for positive, negative, neutral, and mixed sentiment.
        """
        if not text.strip():
            return SentimentScore(
                positive=0.0,
                negative=0.0,
                neutral=1.0,
                mixed=0.0,
                dominant="NEUTRAL"
            )

        try:
            response = self.comprehend_client.detect_sentiment(
                Text=text,
                LanguageCode=language
            )

            scores = response['SentimentScore']
            return SentimentScore(
                positive=scores['Positive'],
                negative=scores['Negative'],
                neutral=scores['Neutral'],
                mixed=scores['Mixed'],
                dominant=response['Sentiment']
            )
        except ClientError as e:
            logger.error(f"Comprehend error: {e}")
            raise

    def batch_analyze_sentiment(
        self,
        texts: List[str],
        language: str = "en"
    ) -> List[SentimentScore]:
        """
        Analyze sentiment of multiple texts in batch.

        AWS Comprehend supports up to 25 texts per batch.
        """
        results = []
        batch_size = 25

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            # Filter empty strings
            batch = [t if t.strip() else "neutral" for t in batch]

            try:
                response = self.comprehend_client.batch_detect_sentiment(
                    TextList=batch,
                    LanguageCode=language
                )

                for result in response['ResultList']:
                    scores = result['SentimentScore']
                    results.append(SentimentScore(
                        positive=scores['Positive'],
                        negative=scores['Negative'],
                        neutral=scores['Neutral'],
                        mixed=scores['Mixed'],
                        dominant=result['Sentiment']
                    ))

            except ClientError as e:
                logger.error(f"Batch comprehend error: {e}")
                raise

        return results


# =============================================================================
# MAIN ANALYZER
# =============================================================================

class VoiceSentimentAnalyzer:
    """
    Main class for analyzing voice sentiment from CS2 demos.

    Usage:
        analyzer = VoiceSentimentAnalyzer(s3_bucket="my-bucket")
        results = analyzer.analyze_match_voice(
            match_id="abc123",
            voice_dir="/path/to/tables/voice_output/abc123/"
        )
    """

    def __init__(
        self,
        s3_bucket: str,
        region: str = "us-east-1",
        language_code: str = "en-US"
    ):
        self.s3_bucket = s3_bucket
        self.region = region
        self.language_code = language_code

        if AWS_AVAILABLE:
            self.transcribe = TranscribeClient(s3_bucket, region)
            self.comprehend = ComprehendClient(region)
        else:
            self.transcribe = None
            self.comprehend = None

    def analyze_player_voice(
        self,
        match_id: str,
        wav_metadata: WavMetadata
    ) -> PlayerVoiceSentiment:
        """Analyze a single player's voice file."""
        from datetime import datetime

        logger.info(f"Analyzing voice for player {wav_metadata.steam_id}")

        # Transcribe speech to text
        transcribe_result = self.transcribe.transcribe_wav(wav_metadata.file_path)
        transcript, segments = self.transcribe.parse_transcript_result(transcribe_result)

        # Analyze overall sentiment
        overall_sentiment = self.comprehend.analyze_sentiment(transcript)

        # Analyze per-segment sentiment (group into chunks for context)
        segment_sentiments = []
        chunk_size = 10  # Analyze every 10 words together
        words = transcript.split()

        for i in range(0, len(words), chunk_size):
            chunk = ' '.join(words[i:i + chunk_size])
            if chunk.strip():
                sentiment = self.comprehend.analyze_sentiment(chunk)
                segment_sentiments.append({
                    'text': chunk,
                    'word_index': i,
                    'sentiment': asdict(sentiment)
                })

        return PlayerVoiceSentiment(
            match_id=match_id,
            steam_id=wav_metadata.steam_id,
            wav_file=wav_metadata.filename,
            duration_seconds=wav_metadata.duration_seconds,
            transcript=transcript,
            segments=[asdict(s) for s in segments],
            overall_sentiment=overall_sentiment,
            segment_sentiments=segment_sentiments,
            word_count=len(words),
            analyzed_at=datetime.utcnow().isoformat()
        )

    def analyze_match_voice(
        self,
        match_id: str,
        voice_dir: str
    ) -> MatchVoiceSentimentSummary:
        """
        Analyze all voice files for a match.

        Args:
            match_id: The match identifier
            voice_dir: Directory containing WAV files (e.g., tables/voice_output/<match_id>/)

        Returns:
            MatchVoiceSentimentSummary with per-player and aggregate sentiment
        """
        from datetime import datetime

        # Get all WAV files
        wav_files = get_wav_files_for_match(voice_dir)

        if not wav_files:
            logger.warning(f"No WAV files found in {voice_dir}")
            return MatchVoiceSentimentSummary(
                match_id=match_id,
                player_sentiments=[],
                total_voice_duration=0,
                avg_sentiment=SentimentScore(0, 0, 1, 0, "NEUTRAL"),
                most_positive_player=None,
                most_negative_player=None,
                analyzed_at=datetime.utcnow().isoformat()
            )

        # Analyze each player
        player_sentiments = []
        for wav_meta in wav_files:
            try:
                sentiment = self.analyze_player_voice(match_id, wav_meta)
                player_sentiments.append(sentiment)
            except Exception as e:
                logger.error(f"Failed to analyze {wav_meta.filename}: {e}")

        # Calculate aggregates
        total_duration = sum(p.duration_seconds for p in player_sentiments)

        if player_sentiments:
            avg_positive = sum(p.overall_sentiment.positive for p in player_sentiments) / len(player_sentiments)
            avg_negative = sum(p.overall_sentiment.negative for p in player_sentiments) / len(player_sentiments)
            avg_neutral = sum(p.overall_sentiment.neutral for p in player_sentiments) / len(player_sentiments)
            avg_mixed = sum(p.overall_sentiment.mixed for p in player_sentiments) / len(player_sentiments)

            # Determine dominant
            scores = {'POSITIVE': avg_positive, 'NEGATIVE': avg_negative,
                      'NEUTRAL': avg_neutral, 'MIXED': avg_mixed}
            dominant = max(scores, key=scores.get)

            avg_sentiment = SentimentScore(avg_positive, avg_negative, avg_neutral, avg_mixed, dominant)

            # Find extremes
            most_positive = max(player_sentiments, key=lambda p: p.overall_sentiment.positive)
            most_negative = max(player_sentiments, key=lambda p: p.overall_sentiment.negative)
        else:
            avg_sentiment = SentimentScore(0, 0, 1, 0, "NEUTRAL")
            most_positive = None
            most_negative = None

        return MatchVoiceSentimentSummary(
            match_id=match_id,
            player_sentiments=player_sentiments,
            total_voice_duration=total_duration,
            avg_sentiment=avg_sentiment,
            most_positive_player=most_positive.steam_id if most_positive else None,
            most_negative_player=most_negative.steam_id if most_negative else None,
            analyzed_at=datetime.utcnow().isoformat()
        )


# =============================================================================
# STORAGE
# =============================================================================

def save_sentiment_results(
    results: MatchVoiceSentimentSummary,
    output_path: str
):
    """Save sentiment analysis results to JSON."""
    # Convert dataclasses to dicts
    data = {
        'match_id': results.match_id,
        'total_voice_duration': results.total_voice_duration,
        'avg_sentiment': asdict(results.avg_sentiment),
        'most_positive_player': results.most_positive_player,
        'most_negative_player': results.most_negative_player,
        'analyzed_at': results.analyzed_at,
        'player_sentiments': []
    }

    for player in results.player_sentiments:
        player_data = {
            'match_id': player.match_id,
            'steam_id': player.steam_id,
            'wav_file': player.wav_file,
            'duration_seconds': player.duration_seconds,
            'transcript': player.transcript,
            'word_count': player.word_count,
            'overall_sentiment': asdict(player.overall_sentiment),
            'segment_sentiments': player.segment_sentiments,
            'analyzed_at': player.analyzed_at
        }
        data['player_sentiments'].append(player_data)

    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)

    logger.info(f"Saved sentiment results to {output_path}")


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)

    if len(sys.argv) < 3:
        print("Usage: python sentiment_analysis.py <match_id> <voice_dir> [s3_bucket]")
        print("Example: python sentiment_analysis.py abc123 ./tables/voice_output/abc123/ my-bucket")
        sys.exit(1)

    match_id = sys.argv[1]
    voice_dir = sys.argv[2]
    s3_bucket = sys.argv[3] if len(sys.argv) > 3 else None

    # If no S3 bucket, just parse WAV metadata
    if not s3_bucket:
        print(f"\nParsing WAV files in {voice_dir}...")
        wav_files = get_wav_files_for_match(voice_dir)

        if not wav_files:
            print("No WAV files found.")
        else:
            print(f"Found {len(wav_files)} WAV files:\n")
            for wav in wav_files:
                print(f"  Player: {wav.steam_id}")
                print(f"    Duration: {wav.duration_seconds}s")
                print(f"    Sample Rate: {wav.sample_rate} Hz")
                print(f"    Channels: {wav.channels}")
                print(f"    Size: {wav.file_size_bytes / 1024:.1f} KB")
                print()
    else:
        # Full analysis with AWS
        analyzer = VoiceSentimentAnalyzer(s3_bucket=s3_bucket)
        results = analyzer.analyze_match_voice(match_id, voice_dir)

        output_path = f"./sentiment_{match_id}.json"
        save_sentiment_results(results, output_path)

        print(f"\nAnalysis complete!")
        print(f"Players analyzed: {len(results.player_sentiments)}")
        print(f"Total voice duration: {results.total_voice_duration:.1f}s")
        print(f"Average sentiment: {results.avg_sentiment.dominant}")
        print(f"Results saved to: {output_path}")
