"""
Faceit Match Integration
========================
Integration with Faceit API to detect and download CS2 matches.

API Documentation: https://developers.faceit.com/docs/

Configuration:
    Create ~/.ssh/faceit_config.json with:
    {
        "api_key": "your_faceit_api_key",
        "player_ids": ["player_id_1", "player_id_2"]
    }

Usage:
    from faceit_integration import FaceitIntegration

    faceit = FaceitIntegration()
    matches = faceit.get_recent_matches("player_id")

    for match in matches:
        demo_url = faceit.get_demo_url(match['match_id'])
        if demo_url:
            faceit.download_demo(demo_url, f"demos/{match['match_id']}.dem")
"""

import requests
import json
import os
import logging
from typing import List, Dict, Optional
from pathlib import Path
from datetime import datetime

from db_utils import Connect

logger = logging.getLogger(__name__)


class FaceitIntegration:
    """
    Faceit API integration for CS2 match detection and demo download.
    """

    BASE_URL = "https://open.faceit.com/data/v4"

    def __init__(self, config_path: str = "~/.ssh/faceit_config.json"):
        """
        Initialize Faceit integration.

        Args:
            config_path: Path to configuration file containing API key
        """
        self.config_path = os.path.expanduser(config_path)
        self.config = self._load_config()
        self.api_key = self.config.get('api_key')

        if not self.api_key:
            logger.warning("Faceit API key not configured")

        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.api_key}',
            'Accept': 'application/json'
        })

        # Database connection
        self.db = Connect()

    def _load_config(self) -> Dict:
        """Load configuration from JSON file."""
        if not os.path.exists(self.config_path):
            logger.warning(f"Faceit config not found at {self.config_path}")
            return {}

        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load Faceit config: {e}")
            return {}

    def get_player_info(self, player_id: str) -> Optional[Dict]:
        """
        Get player information from Faceit.

        Args:
            player_id: Faceit player ID or nickname

        Returns:
            Player data dictionary or None
        """
        try:
            # Try as player ID first
            url = f"{self.BASE_URL}/players/{player_id}"
            response = self.session.get(url)

            if response.status_code == 404:
                # Try as nickname
                url = f"{self.BASE_URL}/players?nickname={player_id}"
                response = self.session.get(url)

            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get player info for {player_id}: {e}")
            return None

    def get_recent_matches(
        self,
        player_id: str,
        game: str = "cs2",
        limit: int = 20
    ) -> List[Dict]:
        """
        Get recent matches for a player.

        Args:
            player_id: Faceit player ID
            game: Game type (default: cs2)
            limit: Number of matches to fetch

        Returns:
            List of match dictionaries
        """
        try:
            url = f"{self.BASE_URL}/players/{player_id}/history"
            params = {
                'game': game,
                'offset': 0,
                'limit': limit
            }

            response = self.session.get(url, params=params)
            response.raise_for_status()

            data = response.json()
            return data.get('items', [])
        except Exception as e:
            logger.error(f"Failed to get matches for {player_id}: {e}")
            return []

    def get_match_details(self, match_id: str) -> Optional[Dict]:
        """
        Get detailed information about a specific match.

        Args:
            match_id: Faceit match ID

        Returns:
            Match details dictionary or None
        """
        try:
            url = f"{self.BASE_URL}/matches/{match_id}"
            response = self.session.get(url)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get match details for {match_id}: {e}")
            return None

    def get_match_stats(self, match_id: str) -> Optional[Dict]:
        """
        Get statistics for a specific match.

        Args:
            match_id: Faceit match ID

        Returns:
            Match statistics dictionary or None
        """
        try:
            url = f"{self.BASE_URL}/matches/{match_id}/stats"
            response = self.session.get(url)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get match stats for {match_id}: {e}")
            return None

    def get_demo_url(self, match_id: str) -> Optional[str]:
        """
        Get demo download URL for a match.

        Note: Faceit API doesn't directly provide demo URLs in all endpoints.
        This method attempts to extract the demo URL from match details.

        Args:
            match_id: Faceit match ID

        Returns:
            Demo download URL or None
        """
        try:
            match_details = self.get_match_details(match_id)
            if not match_details:
                return None

            # Check if demo URL is available
            demo_url = match_details.get('demo_url')
            if demo_url:
                return demo_url

            # Some matches may have demo URLs in different fields
            # This depends on Faceit's API structure
            logger.warning(f"No demo URL found for match {match_id}")
            return None
        except Exception as e:
            logger.error(f"Failed to get demo URL for {match_id}: {e}")
            return None

    def download_demo(self, demo_url: str, output_path: str) -> bool:
        """
        Download a demo file from URL.

        Args:
            demo_url: URL to download demo from
            output_path: Path to save demo file

        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info(f"Downloading demo from {demo_url}")

            response = requests.get(demo_url, stream=True)
            response.raise_for_status()

            # Create directory if needed
            os.makedirs(os.path.dirname(output_path), exist_ok=True)

            # Download with progress
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            logger.info(f"Demo downloaded to {output_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to download demo: {e}")
            return False

    # =========================================================================
    # Database Integration Methods
    # =========================================================================

    def get_players_from_db(self) -> List[Dict]:
        """
        Get enabled Faceit player IDs from database.

        Returns:
            List of player dictionaries with faceit_id, steam_id, nickname
        """
        try:
            sql = """
                SELECT faceit_id, faceit_nickname, steam_id
                FROM users.faceit_players
                WHERE enabled = TRUE
            """
            df = self.db.execute(sql)
            return df.to_dict('records')
        except Exception as e:
            logger.error(f"Failed to get players from DB: {e}")
            return []

    def is_match_processed(self, match_id: str) -> bool:
        """
        Check if a match has already been processed.

        Args:
            match_id: Faceit match ID

        Returns:
            True if match exists in faceit_processed table
        """
        try:
            sql = """
                SELECT 1 FROM matches.faceit_processed
                WHERE match_id = :match_id
                LIMIT 1
            """
            df = self.db.execute(sql, {'match_id': match_id})
            return len(df) > 0
        except Exception as e:
            logger.error(f"Failed to check processed status for {match_id}: {e}")
            return False

    def is_match_queued(self, match_id: str) -> bool:
        """
        Check if a match is already in the queue.

        Args:
            match_id: Faceit match ID

        Returns:
            True if match exists in faceit_queue table
        """
        try:
            sql = """
                SELECT 1 FROM matches.faceit_queue
                WHERE match_id = :match_id
                LIMIT 1
            """
            df = self.db.execute(sql, {'match_id': match_id})
            return len(df) > 0
        except Exception as e:
            logger.error(f"Failed to check queue status for {match_id}: {e}")
            return False

    def queue_match(self, match: Dict) -> bool:
        """
        Add a match to the processing queue.

        Args:
            match: Match dictionary with match_id, player_id, demo_url, etc.

        Returns:
            True if successfully queued
        """
        try:
            sql = """
                INSERT INTO matches.faceit_queue
                    (match_id, player_id, demo_url, competition, game, started_at, finished_at)
                VALUES
                    (:match_id, :player_id, :demo_url, :competition, :game, :started_at, :finished_at)
                ON CONFLICT (match_id) DO NOTHING
            """
            self.db.execute(sql, {
                'match_id': match.get('match_id'),
                'player_id': match.get('player_id'),
                'demo_url': match.get('demo_url'),
                'competition': match.get('competition_name'),
                'game': match.get('game', 'cs2'),
                'started_at': match.get('started_at'),
                'finished_at': match.get('finished_at')
            }, returns=False)
            logger.info(f"Queued match {match.get('match_id')}")
            return True
        except Exception as e:
            logger.error(f"Failed to queue match {match.get('match_id')}: {e}")
            return False

    def mark_match_failed(self, match_id: str, error: str) -> bool:
        """
        Mark a queued match as failed.

        Args:
            match_id: Faceit match ID
            error: Error message

        Returns:
            True if successfully updated
        """
        try:
            sql = """
                UPDATE matches.faceit_queue
                SET status = 'failed',
                    last_error = :error,
                    retry_count = retry_count + 1,
                    updated_at = NOW()
                WHERE match_id = :match_id
            """
            self.db.execute(sql, {'match_id': match_id, 'error': error}, returns=False)
            logger.info(f"Marked match {match_id} as failed: {error}")
            return True
        except Exception as e:
            logger.error(f"Failed to mark match {match_id} as failed: {e}")
            return False

    def mark_match_completed(
        self,
        match_id: str,
        demo_file: str,
        stats_match_id: str,
        processing_time: int
    ) -> bool:
        """
        Move a match from queue to processed.

        Args:
            match_id: Faceit match ID
            demo_file: Local demo filename
            stats_match_id: Corresponding stats.matches.match_id
            processing_time: Seconds taken to process

        Returns:
            True if successfully moved
        """
        try:
            # Get queue entry data
            sql = """
                SELECT player_id, demo_url, competition, started_at, finished_at
                FROM matches.faceit_queue
                WHERE match_id = :match_id
            """
            df = self.db.execute(sql, {'match_id': match_id})
            if len(df) == 0:
                logger.error(f"Match {match_id} not found in queue")
                return False

            queue_entry = df.iloc[0]

            # Insert into processed
            sql = """
                INSERT INTO matches.faceit_processed
                    (match_id, player_id, demo_url, demo_file, stats_match_id,
                     competition, started_at, finished_at, processing_time)
                VALUES
                    (:match_id, :player_id, :demo_url, :demo_file, :stats_match_id,
                     :competition, :started_at, :finished_at, :processing_time)
            """
            self.db.execute(sql, {
                'match_id': match_id,
                'player_id': queue_entry['player_id'],
                'demo_url': queue_entry['demo_url'],
                'demo_file': demo_file,
                'stats_match_id': stats_match_id,
                'competition': queue_entry['competition'],
                'started_at': queue_entry['started_at'],
                'finished_at': queue_entry['finished_at'],
                'processing_time': processing_time
            }, returns=False)

            # Remove from queue
            sql = "DELETE FROM matches.faceit_queue WHERE match_id = :match_id"
            self.db.execute(sql, {'match_id': match_id}, returns=False)

            logger.info(f"Completed processing match {match_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to mark match {match_id} as completed: {e}")
            return False

    def get_retryable_matches(self, max_retries: int = 3) -> List[Dict]:
        """
        Get failed matches that can be retried.

        Args:
            max_retries: Maximum retry attempts before giving up

        Returns:
            List of match dictionaries ready for retry
        """
        try:
            sql = """
                SELECT match_id, player_id, demo_url, competition, game,
                       started_at, finished_at, retry_count, last_error
                FROM matches.faceit_queue
                WHERE status = 'failed'
                  AND retry_count < :max_retries
                ORDER BY updated_at ASC
                LIMIT 10
            """
            df = self.db.execute(sql, {'max_retries': max_retries})
            return df.to_dict('records')
        except Exception as e:
            logger.error(f"Failed to get retryable matches: {e}")
            return []

    def get_pending_matches(self, limit: int = 10) -> List[Dict]:
        """
        Get pending matches from queue for processing.

        Args:
            limit: Maximum number of matches to return

        Returns:
            List of pending match dictionaries
        """
        try:
            sql = """
                SELECT match_id, player_id, demo_url, competition, game,
                       started_at, finished_at
                FROM matches.faceit_queue
                WHERE status = 'pending'
                ORDER BY created_at ASC
                LIMIT :limit
            """
            df = self.db.execute(sql, {'limit': limit})
            return df.to_dict('records')
        except Exception as e:
            logger.error(f"Failed to get pending matches: {e}")
            return []

    def set_match_processing(self, match_id: str) -> bool:
        """
        Mark a match as currently being processed.

        Args:
            match_id: Faceit match ID

        Returns:
            True if successfully updated
        """
        try:
            sql = """
                UPDATE matches.faceit_queue
                SET status = 'processing', updated_at = NOW()
                WHERE match_id = :match_id
            """
            self.db.execute(sql, {'match_id': match_id}, returns=False)
            return True
        except Exception as e:
            logger.error(f"Failed to set match {match_id} as processing: {e}")
            return False

    def update_player_last_polled(self, faceit_id: str, last_match_id: str = None):
        """
        Update a player's last polled timestamp and optionally last match ID.

        Args:
            faceit_id: Faceit player ID
            last_match_id: Most recent match ID seen (optional)
        """
        try:
            if last_match_id:
                sql = """
                    UPDATE users.faceit_players
                    SET last_polled = NOW(), last_match_id = :last_match_id, updated_at = NOW()
                    WHERE faceit_id = :faceit_id
                """
                self.db.execute(sql, {'faceit_id': faceit_id, 'last_match_id': last_match_id}, returns=False)
            else:
                sql = """
                    UPDATE users.faceit_players
                    SET last_polled = NOW(), updated_at = NOW()
                    WHERE faceit_id = :faceit_id
                """
                self.db.execute(sql, {'faceit_id': faceit_id}, returns=False)
        except Exception as e:
            logger.error(f"Failed to update last polled for {faceit_id}: {e}")

    def poll_new_matches(self, player_ids: List[str] = None) -> List[Dict]:
        """
        Poll for new matches across multiple players.
        If player_ids not provided, reads from database.
        Automatically queues new matches and handles deduplication.

        Args:
            player_ids: List of Faceit player IDs to check (optional, reads from DB if None)

        Returns:
            List of new matches found and queued
        """
        # Get player IDs from database if not provided
        if player_ids is None:
            db_players = self.get_players_from_db()
            player_ids = [p['faceit_id'] for p in db_players]

        if not player_ids:
            logger.warning("No player IDs to poll")
            return []

        new_matches = []
        queued_count = 0

        for player_id in player_ids:
            matches = self.get_recent_matches(player_id, limit=5)
            last_match_id = None

            for match in matches:
                match_id = match.get('match_id')

                # Track most recent match for this player
                if last_match_id is None:
                    last_match_id = match_id

                # Filter for finished matches only
                if match.get('status') != 'finished':
                    continue

                # Check if already processed or queued (deduplication)
                if self.is_match_processed(match_id):
                    logger.debug(f"Match {match_id} already processed, skipping")
                    continue

                if self.is_match_queued(match_id):
                    logger.debug(f"Match {match_id} already queued, skipping")
                    continue

                # Get demo URL for the match
                demo_url = self.get_demo_url(match_id)

                match_data = {
                    'source': 'faceit',
                    'match_id': match_id,
                    'player_id': player_id,
                    'demo_url': demo_url,
                    'started_at': match.get('started_at'),
                    'finished_at': match.get('finished_at'),
                    'game': match.get('game'),
                    'competition_name': match.get('competition_name')
                }

                # Queue the match for processing
                if self.queue_match(match_data):
                    queued_count += 1

                new_matches.append(match_data)

            # Update player's last polled timestamp
            self.update_player_last_polled(player_id, last_match_id)

        logger.info(f"Found {len(new_matches)} new matches, queued {queued_count}")
        return new_matches


if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)

    faceit = FaceitIntegration()

    # Example: Get player info
    player_info = faceit.get_player_info("example_player")
    if player_info:
        print(f"Player: {player_info.get('nickname')}")
        print(f"Player ID: {player_info.get('player_id')}")

        # Get recent matches
        matches = faceit.get_recent_matches(player_info['player_id'])
        print(f"Found {len(matches)} recent matches")
