# Stattrak Demo ETL

CS2 demo file parser and stats extraction pipeline.

## Current Features

- Parse CS2 demo files using demoparser2
- Extract match metadata, player stats, rounds, kills
- Flash statistics (team flash hall of shame, enemy flash hall of fame)
- Chat message extraction for sentiment analysis
- Voice extraction integration (requires csgo-voice-extractor)
- File-based JSON storage (PostgreSQL support planned)

## Setup

```bash
# Install Python dependencies
pip install demoparser2

# Optional: Install voice extractor for voice data extraction
# Download from: https://github.com/akiver/csgo-voice-extractor/releases
# Add binary to PATH or specify path in VoiceExtractor()
```

## Usage

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

- `matches.json` - Match metadata
- `player_matches.json` - Player stats per match
- `rounds.json` - Round-by-round data
- `kills.json` - Kill events
- `weapon_stats.json` - Weapon usage stats
- `flash_stats.json` - Flash statistics
- `chat_messages.json` - Chat messages for sentiment analysis
- `voice_output/<match_id>/` - Extracted WAV files (if voice data present)

## Roadmap

### Voice & Chat Extraction for Sentiment Analysis

**Goal:** Extract voice communications and chat messages from CS2 demos for sentiment analysis.

**Voice Extraction:**
- Add [csgo-voice-extractor](https://github.com/akiver/csgo-voice-extractor) as a dependency
- Run voice extraction whenever a CS2 demo is parsed
- Output per-player WAV files with timestamps
- Note: Only works with server-recorded demos (not Valve MM demos)

**Chat Messages:**
- Parse `chat_message` events from demos
- Store with timestamps, player info, and message content
- Schema: `match_id`, `tick`, `steam_id`, `player_name`, `message`, `is_team_chat`

**Sentiment Analysis Pipeline:**
- Voice: Speech-to-text → sentiment analysis
- Chat: Direct text sentiment analysis
- Aggregate sentiment scores per player, per match, over time
- Correlate sentiment with performance metrics

### Other Planned Features

- PostgreSQL database integration
- Automatic demo file watching/processing
- Web upload for demo files
- More detailed economy tracking
- Utility usage analytics (smokes, mollies, HE)
