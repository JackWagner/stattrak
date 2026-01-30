"""
Chat Sentiment Analysis
=======================
Analyzes text chat messages from CS2 demos using AWS Comprehend.

This works with Valve MM demos since chat is always available.

Requirements:
    pip install boto3

Usage:
    from chat_sentiment import ChatSentimentAnalyzer

    analyzer = ChatSentimentAnalyzer()
    results = analyzer.analyze_match_chat("match_id")
"""

import os
import json
import logging
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# Import from sibling module
from file_storage import FileStorage

try:
    import boto3
    from botocore.exceptions import ClientError
    AWS_AVAILABLE = True
except ImportError:
    AWS_AVAILABLE = False
    logger.warning("boto3 not installed. AWS features disabled.")


@dataclass
class SentimentScore:
    """Sentiment analysis scores."""
    positive: float
    negative: float
    neutral: float
    mixed: float
    dominant: str


@dataclass
class ChatMessageSentiment:
    """Sentiment for a single chat message."""
    tick: int
    steam_id: str
    player_name: str
    message: str
    sentiment: SentimentScore


@dataclass
class PlayerChatSentiment:
    """Aggregated chat sentiment for a player."""
    steam_id: str
    player_name: str
    message_count: int
    avg_positive: float
    avg_negative: float
    avg_neutral: float
    avg_mixed: float
    dominant_sentiment: str
    most_negative_message: Optional[str]
    most_positive_message: Optional[str]


@dataclass
class MatchChatSentimentSummary:
    """Complete chat sentiment analysis for a match."""
    match_id: str
    total_messages: int
    player_sentiments: List[PlayerChatSentiment]
    message_sentiments: List[ChatMessageSentiment]
    overall_sentiment: SentimentScore
    toxicity_score: float  # Percentage of negative messages
    most_toxic_player: Optional[str]
    most_positive_player: Optional[str]
    analyzed_at: str


class ChatSentimentAnalyzer:
    """
    Analyzes chat message sentiment from CS2 demos.

    Can run in two modes:
    1. With AWS (boto3): Full sentiment analysis via Comprehend
    2. Without AWS: Basic keyword-based analysis (fallback)
    """

    # Toxic keywords for fallback analysis
    TOXIC_KEYWORDS = [
        'noob', 'trash', 'garbage', 'idiot', 'stupid', 'dumb', 'suck',
        'bad', 'worst', 'terrible', 'awful', 'hate', 'kill yourself',
        'kys', 'ez', 'gg ez', 'uninstall', 'delete', 'report', 'kick'
    ]

    POSITIVE_KEYWORDS = [
        'nice', 'good', 'great', 'well done', 'wp', 'gj', 'good job',
        'nt', 'nice try', 'thanks', 'ty', 'awesome', 'sick', 'insane',
        'gg', 'glhf', 'gl'
    ]

    def __init__(self, region: str = "us-east-1", use_aws: bool = True):
        self.region = region
        self.use_aws = use_aws and AWS_AVAILABLE
        self.storage = FileStorage()

        if self.use_aws:
            self.comprehend = boto3.client('comprehend', region_name=region)
        else:
            self.comprehend = None
            logger.info("Running in fallback mode (keyword-based analysis)")

    def _analyze_sentiment_aws(self, text: str) -> SentimentScore:
        """Analyze sentiment using AWS Comprehend."""
        if not text.strip():
            return SentimentScore(0, 0, 1, 0, "NEUTRAL")

        try:
            response = self.comprehend.detect_sentiment(
                Text=text,
                LanguageCode='en'
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
            logger.warning(f"AWS Comprehend error: {e}")
            return self._analyze_sentiment_fallback(text)

    def _analyze_sentiment_fallback(self, text: str) -> SentimentScore:
        """Fallback keyword-based sentiment analysis."""
        text_lower = text.lower()

        toxic_count = sum(1 for kw in self.TOXIC_KEYWORDS if kw in text_lower)
        positive_count = sum(1 for kw in self.POSITIVE_KEYWORDS if kw in text_lower)

        if toxic_count > positive_count:
            return SentimentScore(
                positive=0.1,
                negative=0.7,
                neutral=0.15,
                mixed=0.05,
                dominant="NEGATIVE"
            )
        elif positive_count > toxic_count:
            return SentimentScore(
                positive=0.7,
                negative=0.1,
                neutral=0.15,
                mixed=0.05,
                dominant="POSITIVE"
            )
        else:
            return SentimentScore(
                positive=0.2,
                negative=0.2,
                neutral=0.5,
                mixed=0.1,
                dominant="NEUTRAL"
            )

    def analyze_sentiment(self, text: str) -> SentimentScore:
        """Analyze sentiment of text."""
        if self.use_aws:
            return self._analyze_sentiment_aws(text)
        return self._analyze_sentiment_fallback(text)

    def analyze_match_chat(self, match_id: str) -> MatchChatSentimentSummary:
        """
        Analyze all chat messages for a match.

        Args:
            match_id: The match identifier

        Returns:
            MatchChatSentimentSummary with per-message and per-player sentiment
        """
        # Load chat messages from storage
        messages = self.storage.get_chat_messages(match_id=match_id)

        if not messages:
            logger.warning(f"No chat messages found for match {match_id}")
            return MatchChatSentimentSummary(
                match_id=match_id,
                total_messages=0,
                player_sentiments=[],
                message_sentiments=[],
                overall_sentiment=SentimentScore(0, 0, 1, 0, "NEUTRAL"),
                toxicity_score=0,
                most_toxic_player=None,
                most_positive_player=None,
                analyzed_at=datetime.utcnow().isoformat()
            )

        # Analyze each message
        message_sentiments: List[ChatMessageSentiment] = []
        player_messages: Dict[str, List[ChatMessageSentiment]] = {}

        for msg in messages:
            sentiment = self.analyze_sentiment(msg['message'])

            msg_sentiment = ChatMessageSentiment(
                tick=msg['tick'],
                steam_id=msg['steam_id'],
                player_name=msg['player_name'],
                message=msg['message'],
                sentiment=sentiment
            )
            message_sentiments.append(msg_sentiment)

            # Group by player
            steam_id = msg['steam_id']
            if steam_id not in player_messages:
                player_messages[steam_id] = []
            player_messages[steam_id].append(msg_sentiment)

        # Calculate per-player aggregates
        player_sentiments: List[PlayerChatSentiment] = []

        for steam_id, msgs in player_messages.items():
            if not msgs:
                continue

            avg_positive = sum(m.sentiment.positive for m in msgs) / len(msgs)
            avg_negative = sum(m.sentiment.negative for m in msgs) / len(msgs)
            avg_neutral = sum(m.sentiment.neutral for m in msgs) / len(msgs)
            avg_mixed = sum(m.sentiment.mixed for m in msgs) / len(msgs)

            # Determine dominant
            scores = {'POSITIVE': avg_positive, 'NEGATIVE': avg_negative,
                      'NEUTRAL': avg_neutral, 'MIXED': avg_mixed}
            dominant = max(scores, key=scores.get)

            # Find extreme messages
            most_negative = max(msgs, key=lambda m: m.sentiment.negative)
            most_positive = max(msgs, key=lambda m: m.sentiment.positive)

            player_sentiments.append(PlayerChatSentiment(
                steam_id=steam_id,
                player_name=msgs[0].player_name,
                message_count=len(msgs),
                avg_positive=round(avg_positive, 3),
                avg_negative=round(avg_negative, 3),
                avg_neutral=round(avg_neutral, 3),
                avg_mixed=round(avg_mixed, 3),
                dominant_sentiment=dominant,
                most_negative_message=most_negative.message if most_negative.sentiment.negative > 0.3 else None,
                most_positive_message=most_positive.message if most_positive.sentiment.positive > 0.3 else None
            ))

        # Calculate overall sentiment
        if message_sentiments:
            overall_positive = sum(m.sentiment.positive for m in message_sentiments) / len(message_sentiments)
            overall_negative = sum(m.sentiment.negative for m in message_sentiments) / len(message_sentiments)
            overall_neutral = sum(m.sentiment.neutral for m in message_sentiments) / len(message_sentiments)
            overall_mixed = sum(m.sentiment.mixed for m in message_sentiments) / len(message_sentiments)

            scores = {'POSITIVE': overall_positive, 'NEGATIVE': overall_negative,
                      'NEUTRAL': overall_neutral, 'MIXED': overall_mixed}
            dominant = max(scores, key=scores.get)

            overall_sentiment = SentimentScore(
                round(overall_positive, 3),
                round(overall_negative, 3),
                round(overall_neutral, 3),
                round(overall_mixed, 3),
                dominant
            )

            # Toxicity score = % of messages with negative > 0.4
            toxic_messages = sum(1 for m in message_sentiments if m.sentiment.negative > 0.4)
            toxicity_score = round(toxic_messages / len(message_sentiments) * 100, 1)

            # Find extremes
            if player_sentiments:
                most_toxic = max(player_sentiments, key=lambda p: p.avg_negative)
                most_positive = max(player_sentiments, key=lambda p: p.avg_positive)
            else:
                most_toxic = None
                most_positive = None
        else:
            overall_sentiment = SentimentScore(0, 0, 1, 0, "NEUTRAL")
            toxicity_score = 0
            most_toxic = None
            most_positive = None

        return MatchChatSentimentSummary(
            match_id=match_id,
            total_messages=len(message_sentiments),
            player_sentiments=player_sentiments,
            message_sentiments=message_sentiments,
            overall_sentiment=overall_sentiment,
            toxicity_score=toxicity_score,
            most_toxic_player=most_toxic.steam_id if most_toxic and most_toxic.avg_negative > 0.3 else None,
            most_positive_player=most_positive.steam_id if most_positive and most_positive.avg_positive > 0.3 else None,
            analyzed_at=datetime.utcnow().isoformat()
        )


def save_chat_sentiment_results(results: MatchChatSentimentSummary, output_path: str):
    """Save chat sentiment results to JSON."""
    data = {
        'match_id': results.match_id,
        'total_messages': results.total_messages,
        'overall_sentiment': asdict(results.overall_sentiment),
        'toxicity_score': results.toxicity_score,
        'most_toxic_player': results.most_toxic_player,
        'most_positive_player': results.most_positive_player,
        'analyzed_at': results.analyzed_at,
        'player_sentiments': [asdict(p) for p in results.player_sentiments],
        'message_sentiments': [
            {
                'tick': m.tick,
                'steam_id': m.steam_id,
                'player_name': m.player_name,
                'message': m.message,
                'sentiment': asdict(m.sentiment)
            }
            for m in results.message_sentiments
        ]
    }

    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)

    logger.info(f"Saved chat sentiment results to {output_path}")


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)

    match_id = sys.argv[1] if len(sys.argv) > 1 else "e318bb90d5af1adf"
    use_aws = "--aws" in sys.argv

    print(f"\nAnalyzing chat sentiment for match: {match_id}")
    print(f"Using AWS Comprehend: {use_aws and AWS_AVAILABLE}\n")

    analyzer = ChatSentimentAnalyzer(use_aws=use_aws)
    results = analyzer.analyze_match_chat(match_id)

    print(f"Total messages: {results.total_messages}")
    print(f"Overall sentiment: {results.overall_sentiment.dominant}")
    print(f"Toxicity score: {results.toxicity_score}%")
    print(f"Most toxic player: {results.most_toxic_player}")
    print(f"Most positive player: {results.most_positive_player}")

    print("\n--- Per-Player Breakdown ---")
    for player in results.player_sentiments:
        print(f"\n{player.player_name} ({player.steam_id}):")
        print(f"  Messages: {player.message_count}")
        print(f"  Sentiment: {player.dominant_sentiment}")
        print(f"  Positive: {player.avg_positive:.1%}, Negative: {player.avg_negative:.1%}")
        if player.most_negative_message:
            print(f"  Most negative: \"{player.most_negative_message}\"")

    # Save results
    output_path = f"./chat_sentiment_{match_id}.json"
    save_chat_sentiment_results(results, output_path)
    print(f"\nResults saved to: {output_path}")
