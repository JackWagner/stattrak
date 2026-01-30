# Stattrak Demo ETL

CS2 demo file parser and stats extraction pipeline with sentiment analysis.

## Current Features

- Parse CS2 demo files using demoparser2
- Extract match metadata, player stats, rounds, kills
- Flash statistics (team flash hall of shame, enemy flash hall of fame)
- Chat message extraction and sentiment analysis
- Voice extraction and sentiment analysis (requires additional setup)
- File-based JSON storage (PostgreSQL support planned)

## Setup

```bash
# Install Python dependencies
pip install demoparser2 boto3

# Optional: Install voice extractor for voice data extraction
# Download from: https://github.com/akiver/csgo-voice-extractor/releases
# Add binary to PATH or specify path in VoiceExtractor()
```

## Quick Start

```python
from demoparser2 import DemoParser
from file_stats_inserter import FileStatsInserter

parser = DemoParser("match.dem")
inserter = FileStatsInserter(
    parser=parser,
    demo_filename="match.dem",
    demo_path="/full/path/to/match.dem"  # Required for voice extraction
)

match_id, voice_result = inserter.insert_all(extract_voice=True)
```

## Output Tables

| File | Description |
|------|-------------|
| `matches.json` | Match metadata (map, scores, duration) |
| `player_matches.json` | Player stats per match (K/D/A, ADR, etc.) |
| `rounds.json` | Round-by-round data |
| `kills.json` | Kill events with weapon, headshot, wallbang info |
| `weapon_stats.json` | Weapon usage stats per player |
| `flash_stats.json` | Flash statistics (enemies/teammates blinded) |
| `chat_messages.json` | Chat messages for sentiment analysis |
| `voice_output/<match_id>/` | Extracted WAV files (if voice data present) |

---

## Sentiment Analysis

### Chat Sentiment Analysis

Analyzes in-game text chat messages. Works with all demo types including Valve Matchmaking.

```bash
# Run with keyword-based fallback (no AWS required)
python chat_sentiment.py <match_id>

# Run with AWS Comprehend (more accurate)
python chat_sentiment.py <match_id> --aws
```

**Output:**
```
Total messages: 30
Overall sentiment: NEUTRAL
Toxicity score: 3.3%
Most toxic player: None
Most positive player: 76561199059873622

--- Per-Player Breakdown ---
IEM25_Applicant (76561198057593314):
  Messages: 10
  Sentiment: NEUTRAL
  Positive: 34.0%, Negative: 22.0%
```

**Data Structure:**
```python
PlayerChatSentiment:
    steam_id: str
    player_name: str
    message_count: int
    avg_positive: float      # 0.0 - 1.0
    avg_negative: float      # 0.0 - 1.0
    avg_neutral: float       # 0.0 - 1.0
    dominant_sentiment: str  # "POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"
    most_negative_message: str | None
    most_positive_message: str | None
```

### Voice Sentiment Analysis

Analyzes voice communications using AWS Transcribe (speech-to-text) and AWS Comprehend (sentiment).

**Requirements:**
- csgo-voice-extractor installed
- Demo with voice data (FACEIT, ESEA, or community server demos - NOT Valve MM)
- AWS account with S3 bucket
- IAM permissions: `transcribe:*`, `comprehend:DetectSentiment`, `s3:PutObject/GetObject`

```bash
python sentiment_analysis.py <match_id> <voice_dir> <s3_bucket>

# Example:
python sentiment_analysis.py abc123 ./tables/voice_output/abc123/ my-stattrak-bucket
```

**Pipeline:**
```
WAV file → Upload to S3 → Amazon Transcribe → Transcript text → Amazon Comprehend → Sentiment scores
```

**Data Structure:**
```python
PlayerVoiceSentiment:
    steam_id: str
    wav_file: str
    duration_seconds: float
    transcript: str              # Full transcribed text
    word_count: int
    overall_sentiment:
        positive: float          # 0.0 - 1.0
        negative: float
        neutral: float
        mixed: float
        dominant: str            # "POSITIVE", "NEGATIVE", etc.
    segment_sentiments: list     # Per-chunk sentiment for timeline analysis
```

### Voice Data Availability

| Demo Source | Voice Data Available? |
|-------------|----------------------|
| Valve Matchmaking | No - stripped for privacy |
| FACEIT | Depends on server settings |
| ESEA | Depends on server settings |
| Community Servers | Yes, if configured |
| POV Demos (player recorded) | Yes |

---

## AWS Setup for Sentiment Analysis

### 1. Create S3 Bucket

```bash
aws s3 mb s3://your-stattrak-bucket --region us-east-1
```

### 2. IAM Policy

Create a policy with these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "transcribe:StartTranscriptionJob",
                "transcribe:GetTranscriptionJob"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "comprehend:DetectSentiment",
                "comprehend:BatchDetectSentiment"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject"
            ],
            "Resource": "arn:aws:s3:::your-stattrak-bucket/*"
        }
    ]
}
```

### 3. Configure Credentials

```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and region
```

---

## Programmatic Usage

### Chat Sentiment

```python
from chat_sentiment import ChatSentimentAnalyzer, save_chat_sentiment_results

# Without AWS (keyword-based)
analyzer = ChatSentimentAnalyzer(use_aws=False)
results = analyzer.analyze_match_chat("match_id")

# With AWS Comprehend
analyzer = ChatSentimentAnalyzer(use_aws=True, region="us-east-1")
results = analyzer.analyze_match_chat("match_id")

# Access results
print(f"Toxicity: {results.toxicity_score}%")
for player in results.player_sentiments:
    print(f"{player.player_name}: {player.dominant_sentiment}")

# Save to JSON
save_chat_sentiment_results(results, "output.json")
```

### Voice Sentiment

```python
from sentiment_analysis import VoiceSentimentAnalyzer, save_sentiment_results

analyzer = VoiceSentimentAnalyzer(
    s3_bucket="your-bucket",
    region="us-east-1"
)

results = analyzer.analyze_match_voice(
    match_id="abc123",
    voice_dir="./tables/voice_output/abc123/"
)

# Access results
for player in results.player_sentiments:
    print(f"{player.steam_id}: {player.overall_sentiment.dominant}")
    print(f"  Transcript: {player.transcript[:100]}...")

save_sentiment_results(results, "voice_sentiment.json")
```

### WAV File Parsing (No AWS)

```python
from sentiment_analysis import parse_wav_metadata, get_wav_files_for_match

# Single file
metadata = parse_wav_metadata("player.wav")
print(f"Duration: {metadata.duration_seconds}s")
print(f"Sample rate: {metadata.sample_rate} Hz")

# All files in directory
wav_files = get_wav_files_for_match("./voice_output/match_id/")
for wav in wav_files:
    print(f"Player {wav.steam_id}: {wav.duration_seconds}s")
```

---

## Roadmap

### Completed
- [x] Chat message extraction
- [x] Voice extraction integration
- [x] Chat sentiment analysis (AWS + fallback)
- [x] Voice sentiment analysis pipeline
- [x] Per-player sentiment aggregation

### In Progress
- [ ] Player career tracking (see below)

### Planned
- [ ] PostgreSQL database integration
- [ ] Real-time demo processing/watching
- [ ] Web upload for demo files
- [ ] Economy tracking
- [ ] Utility usage analytics (smokes, mollies, HE)

---

## Player Career Tracking

Track all player statistics over time to analyze trends, improvement, and patterns.

### Career Metrics

**Performance Stats (per match, aggregated over career):**
- K/D ratio trend
- ADR trend
- Headshot % trend
- Win rate trend
- MVP count

**Sentiment Stats:**
- Chat toxicity over time
- Chat positivity over time
- Voice sentiment trends (when available)
- Sentiment correlation with performance (does negativity increase when losing?)

**Flash Effectiveness:**
- Enemies flashed per match (trend)
- Teammates flashed per match (trend - "improvement" = decreasing)
- Flash efficiency (enemies flashed / flashes thrown)
- Blind duration effectiveness

**Utility Effectiveness (planned):**
- Smokes thrown per match
- Smoke effectiveness (blocks enemy vision during key moments)
- Molotov damage dealt
- HE grenade damage dealt

### Data Structure

```python
PlayerCareer:
    steam_id: str
    player_name: str
    first_match_date: datetime
    last_match_date: datetime
    total_matches: int

    # Performance timeline
    performance_history: List[MatchPerformance]
        - match_id, date, map
        - kills, deaths, assists, adr
        - headshot_pct, mvps
        - result (win/loss/tie)

    # Sentiment timeline
    sentiment_history: List[MatchSentiment]
        - match_id, date
        - chat_sentiment (positive/negative/neutral scores)
        - toxicity_score
        - message_count
        - voice_sentiment (if available)

    # Flash timeline
    flash_history: List[MatchFlashStats]
        - match_id, date
        - enemies_flashed, enemy_blind_duration
        - teammates_flashed, team_blind_duration
        - flashes_thrown, efficiency

    # Aggregated trends
    trends:
        kd_trend: float          # Slope of K/D over time (+improving, -declining)
        adr_trend: float
        toxicity_trend: float    # Slope of toxicity (+getting worse, -improving)
        flash_efficiency_trend: float
        team_flash_trend: float  # Negative = good (flashing teammates less)

    # Career averages
    career_avg:
        kd: float
        adr: float
        win_rate: float
        headshot_pct: float
        toxicity: float
        enemies_flashed_per_match: float
        teammates_flashed_per_match: float
```

### Analysis Features

**Trend Detection:**
- Linear regression on metrics over time
- Detect improvement/decline periods
- Identify correlation between metrics (e.g., toxicity vs losing)

**Milestones:**
- Career highs/lows for each metric
- Streaks (win streaks, toxic streaks)
- Notable matches (best KD, most toxic, etc.)

**Comparisons:**
- Compare player's current form vs career average
- Compare against other players in the same matches
- Percentile rankings

### API Endpoints (planned)

```
GET /api/players/:steamId/career
    - Full career summary with trends

GET /api/players/:steamId/career/performance
    - Performance metrics over time

GET /api/players/:steamId/career/sentiment
    - Sentiment metrics over time

GET /api/players/:steamId/career/flashes
    - Flash effectiveness over time

GET /api/players/:steamId/career/trends
    - Calculated trend slopes and analysis
```

### Visualization (planned)

- Line charts showing metric trends over time
- Correlation scatter plots (sentiment vs performance)
- Heat maps for performance by map
- "Form" indicator (recent matches vs career average)
