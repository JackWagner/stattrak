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

    def poll_new_matches(self, player_ids: List[str]) -> List[Dict]:
        """
        Poll for new matches across multiple players.

        Args:
            player_ids: List of Faceit player IDs to check

        Returns:
            List of new matches found
        """
        new_matches = []

        for player_id in player_ids:
            matches = self.get_recent_matches(player_id, limit=5)

            for match in matches:
                # Filter for finished matches only
                if match.get('status') == 'finished':
                    new_matches.append({
                        'source': 'faceit',
                        'match_id': match['match_id'],
                        'player_id': player_id,
                        'started_at': match.get('started_at'),
                        'finished_at': match.get('finished_at'),
                        'game': match.get('game'),
                        'competition_name': match.get('competition_name')
                    })

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
