"""
Steam Messenger
===============
Automated Steam messaging system for Stattrak.
Sends messages to players after their matches have been analyzed.

Configuration:
    Create ~/.ssh/steam_bot_config.json with:
    {
        "username": "stattrak_bot_username",
        "password": "stattrak_bot_password",
        "shared_secret": "steam_guard_shared_secret",
        "identity_secret": "steam_guard_identity_secret",
        "message_template": "Your CS2 match on {map} has been analyzed! View stats: {stats_url}"
    }

Requirements:
    pip install steam

Usage:
    from steam_messenger import SteamMessenger

    messenger = SteamMessenger()
    messenger.login()

    # Send match notification
    messenger.send_match_notification(
        steam_id="76561198012345678",
        match_id="abc123",
        map_name="de_mirage",
        stats_url="https://stattrak.com/match/abc123"
    )
"""

import json
import os
import logging
import time
from typing import List, Dict, Optional
from datetime import datetime, timedelta

from db_utils import Connect

logger = logging.getLogger(__name__)

try:
    from steam.client import SteamClient
    from steam.enums import EResult
    STEAM_AVAILABLE = True
except ImportError:
    logger.warning("steam library not installed. Run: pip install steam")
    STEAM_AVAILABLE = False


class SteamMessenger:
    """
    Automated Steam messaging for Stattrak notifications.
    """

    def __init__(self, config_path: str = "~/.ssh/steam_bot_config.json"):
        """
        Initialize Steam messenger.

        Args:
            config_path: Path to Steam bot configuration file
        """
        if not STEAM_AVAILABLE:
            raise ImportError("steam library required. Install with: pip install steam")

        self.config_path = os.path.expanduser(config_path)
        self.config = self._load_config()

        self.client = SteamClient()
        self.logged_in = False

        # Rate limiting
        self.message_cooldown = 60  # seconds between messages
        self.last_message_time = {}  # steam_id -> timestamp

        # Message history to avoid duplicates
        self.sent_messages_file = os.path.expanduser("~/.ssh/stattrak_sent_messages.json")
        self.sent_messages = self._load_sent_messages()

        # Database connection
        self.db = Connect()

    def _load_config(self) -> Dict:
        """Load configuration from JSON file."""
        if not os.path.exists(self.config_path):
            logger.error(f"Steam bot config not found at {self.config_path}")
            return {}

        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load Steam bot config: {e}")
            return {}

    def _load_sent_messages(self) -> Dict:
        """Load history of sent messages."""
        if not os.path.exists(self.sent_messages_file):
            return {}

        try:
            with open(self.sent_messages_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load sent messages history: {e}")
            return {}

    def _save_sent_messages(self):
        """Save sent messages history."""
        try:
            os.makedirs(os.path.dirname(self.sent_messages_file), exist_ok=True)
            with open(self.sent_messages_file, 'w') as f:
                json.dump(self.sent_messages, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save sent messages history: {e}")

    def login(self) -> bool:
        """
        Log in to Steam.

        Returns:
            True if login successful, False otherwise
        """
        username = self.config.get('username')
        password = self.config.get('password')

        if not username or not password:
            logger.error("Steam credentials not configured")
            return False

        try:
            # Attempt login
            result = self.client.login(username=username, password=password)

            if result == EResult.OK:
                self.logged_in = True
                logger.info(f"Successfully logged in as {username}")
                return True
            else:
                logger.error(f"Login failed with result: {result}")
                return False

        except Exception as e:
            logger.error(f"Failed to login to Steam: {e}")
            return False

    def logout(self):
        """Log out from Steam."""
        if self.logged_in:
            self.client.logout()
            self.logged_in = False
            logger.info("Logged out from Steam")

    def _can_send_message(self, steam_id: str) -> bool:
        """
        Check if we can send a message to this user (rate limiting).

        Args:
            steam_id: Steam ID to check

        Returns:
            True if message can be sent, False otherwise
        """
        if steam_id not in self.last_message_time:
            return True

        elapsed = time.time() - self.last_message_time[steam_id]
        return elapsed >= self.message_cooldown

    def _mark_message_sent(self, steam_id: str, match_id: str):
        """
        Mark a message as sent.

        Args:
            steam_id: Steam ID
            match_id: Match ID
        """
        self.last_message_time[steam_id] = time.time()

        # Store in persistent history
        key = f"{steam_id}:{match_id}"
        self.sent_messages[key] = {
            'timestamp': datetime.now().isoformat(),
            'steam_id': steam_id,
            'match_id': match_id
        }
        self._save_sent_messages()

    def _already_sent(self, steam_id: str, match_id: str) -> bool:
        """
        Check if we've already sent a message for this match.

        Args:
            steam_id: Steam ID
            match_id: Match ID

        Returns:
            True if message already sent, False otherwise
        """
        key = f"{steam_id}:{match_id}"
        return key in self.sent_messages

    def send_message(self, steam_id: str, message: str) -> bool:
        """
        Send a message to a Steam user.

        Args:
            steam_id: Steam ID to send message to
            message: Message content

        Returns:
            True if successful, False otherwise
        """
        if not self.logged_in:
            logger.error("Not logged in to Steam")
            return False

        # Convert steam_id to SteamID object
        try:
            from steam.steamid import SteamID
            target = SteamID(steam_id)
        except Exception as e:
            logger.error(f"Invalid Steam ID {steam_id}: {e}")
            return False

        try:
            # Send message via Steam client
            self.client.send_message(target, message)
            logger.info(f"Sent message to {steam_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to send message to {steam_id}: {e}")
            return False

    def send_match_notification(
        self,
        steam_id: str,
        match_id: str,
        map_name: str = "unknown",
        stats_url: str = None,
        custom_message: str = None
    ) -> bool:
        """
        Send a match analysis notification to a player.

        Args:
            steam_id: Steam ID of the player
            match_id: Match ID
            map_name: Map name
            stats_url: URL to view stats
            custom_message: Optional custom message (overrides template)

        Returns:
            True if successful, False otherwise
        """
        # Check if already sent
        if self._already_sent(steam_id, match_id):
            logger.info(f"Already sent notification for match {match_id} to {steam_id}")
            return False

        # Check rate limiting
        if not self._can_send_message(steam_id):
            logger.warning(f"Rate limit: Cannot send message to {steam_id} yet")
            return False

        # Build message
        if custom_message:
            message = custom_message
        else:
            template = self.config.get('message_template',
                "Your CS2 match on {map} has been analyzed! View your stats at Stattrak.")

            message = template.format(
                map=map_name,
                match_id=match_id,
                stats_url=stats_url or "https://stattrak.com"
            )

        # Send message
        success = self.send_message(steam_id, message)

        if success:
            self._mark_message_sent(steam_id, match_id)

        return success

    def send_batch_notifications(self, notifications: List[Dict]) -> int:
        """
        Send multiple match notifications.

        Args:
            notifications: List of notification dictionaries with keys:
                - steam_id
                - match_id
                - map_name (optional)
                - stats_url (optional)

        Returns:
            Number of successfully sent messages
        """
        sent_count = 0

        for notification in notifications:
            steam_id = notification.get('steam_id')
            match_id = notification.get('match_id')

            if not steam_id or not match_id:
                logger.warning(f"Invalid notification: {notification}")
                continue

            success = self.send_match_notification(
                steam_id=steam_id,
                match_id=match_id,
                map_name=notification.get('map_name', 'unknown'),
                stats_url=notification.get('stats_url')
            )

            if success:
                sent_count += 1

            # Small delay between messages to avoid spam detection
            time.sleep(2)

        logger.info(f"Sent {sent_count}/{len(notifications)} notifications")
        return sent_count

    # =========================================================================
    # Database Integration Methods
    # =========================================================================

    def get_unnotified_matches(self, limit: int = 50) -> List[Dict]:
        """
        Query database for matches that haven't been notified yet.

        Args:
            limit: Maximum number of matches to return

        Returns:
            List of match dictionaries with player info for notification
        """
        try:
            sql = """
                SELECT DISTINCT
                    m.match_id,
                    m.map,
                    m.played_at,
                    pm.steam_id,
                    pm.name as player_name
                FROM stats.matches m
                JOIN stats.player_matches pm ON m.match_id = pm.match_id
                WHERE m.notified = FALSE
                ORDER BY m.played_at DESC
                LIMIT :limit
            """
            df = self.db.execute(sql, {'limit': limit})
            if df is None or len(df) == 0:
                return []
            return df.to_dict('records')
        except Exception as e:
            logger.error(f"Failed to get unnotified matches: {e}")
            return []

    def mark_match_notified(self, match_id: str) -> bool:
        """
        Mark a match as notified in the database.

        Args:
            match_id: Match ID to mark as notified

        Returns:
            True if successfully updated
        """
        try:
            sql = """
                UPDATE stats.matches
                SET notified = TRUE
                WHERE match_id = :match_id
            """
            self.db.execute(sql, {'match_id': match_id}, returns=False)
            logger.info(f"Marked match {match_id} as notified")
            return True
        except Exception as e:
            logger.error(f"Failed to mark match {match_id} as notified: {e}")
            return False

    def log_notification(
        self,
        match_id: str,
        steam_id: str,
        status: str,
        player_name: str = None,
        map_name: str = None,
        message_text: str = None,
        error_message: str = None
    ) -> bool:
        """
        Write a notification attempt to the audit log.

        Args:
            match_id: Match that triggered notification
            steam_id: Recipient Steam ID
            status: Notification status (sent, failed, rate_limited, skipped)
            player_name: Player name for context
            map_name: Map name for context
            message_text: Actual message sent
            error_message: Error details if failed

        Returns:
            True if successfully logged
        """
        try:
            sql = """
                INSERT INTO messaging.notification_log
                    (match_id, steam_id, player_name, map, message_text, status, error_message, sent_at)
                VALUES
                    (:match_id, :steam_id, :player_name, :map, :message_text, :status, :error_message,
                     CASE WHEN :status = 'sent' THEN NOW() ELSE NULL END)
            """
            self.db.execute(sql, {
                'match_id': match_id,
                'steam_id': steam_id,
                'player_name': player_name,
                'map': map_name,
                'message_text': message_text,
                'status': status,
                'error_message': error_message
            }, returns=False)
            return True
        except Exception as e:
            logger.error(f"Failed to log notification: {e}")
            return False

    def get_players_needing_notification(self, match_id: str) -> List[Dict]:
        """
        Get players from a match who haven't been notified yet.

        Args:
            match_id: Match ID

        Returns:
            List of player dictionaries
        """
        try:
            sql = """
                SELECT
                    pm.steam_id,
                    pm.name as player_name,
                    m.map
                FROM stats.player_matches pm
                JOIN stats.matches m ON pm.match_id = m.match_id
                WHERE pm.match_id = :match_id
                  AND NOT EXISTS (
                      SELECT 1 FROM messaging.notification_log nl
                      WHERE nl.match_id = pm.match_id
                        AND nl.steam_id = pm.steam_id
                        AND nl.status = 'sent'
                  )
            """
            df = self.db.execute(sql, {'match_id': match_id})
            if df is None or len(df) == 0:
                return []
            return df.to_dict('records')
        except Exception as e:
            logger.error(f"Failed to get players for match {match_id}: {e}")
            return []


def run_messenger_daemon(check_interval: int = 300, stats_base_url: str = "https://stattrak.com"):
    """
    Run Steam messenger as a daemon process.
    Checks for new analyzed matches and sends notifications.

    Args:
        check_interval: Seconds between checks (default: 5 minutes)
        stats_base_url: Base URL for match stats links
    """
    logger.info("Starting Steam messenger daemon")

    messenger = SteamMessenger()

    if not messenger.login():
        logger.error("Failed to login - exiting")
        return

    try:
        while True:
            logger.info("Checking for new matches to notify...")

            # Query database for unnotified matches
            unnotified_matches = messenger.get_unnotified_matches(limit=50)
            logger.info(f"Found {len(unnotified_matches)} unnotified match records")

            # Group by match_id to process each match once
            matches_by_id = {}
            for record in unnotified_matches:
                match_id = record['match_id']
                if match_id not in matches_by_id:
                    matches_by_id[match_id] = {
                        'match_id': match_id,
                        'map': record.get('map'),
                        'played_at': record.get('played_at'),
                        'players': []
                    }
                matches_by_id[match_id]['players'].append({
                    'steam_id': record['steam_id'],
                    'player_name': record.get('player_name')
                })

            # Process each match
            matches_notified = 0
            for match_id, match_data in matches_by_id.items():
                map_name = match_data.get('map', 'unknown')
                stats_url = f"{stats_base_url}/match/{match_id}"

                # Get players who haven't been notified for this match
                players = messenger.get_players_needing_notification(match_id)

                if not players:
                    # All players already notified, mark match as done
                    messenger.mark_match_notified(match_id)
                    continue

                players_notified = 0
                for player in players:
                    steam_id = player['steam_id']
                    player_name = player.get('player_name', 'Unknown')

                    # Check rate limiting
                    if not messenger._can_send_message(steam_id):
                        logger.info(f"Rate limited for {steam_id}, will retry later")
                        messenger.log_notification(
                            match_id=match_id,
                            steam_id=steam_id,
                            status='rate_limited',
                            player_name=player_name,
                            map_name=map_name
                        )
                        continue

                    # Check if already sent (file-based history)
                    if messenger._already_sent(steam_id, match_id):
                        logger.debug(f"Already notified {steam_id} for {match_id}")
                        messenger.log_notification(
                            match_id=match_id,
                            steam_id=steam_id,
                            status='skipped',
                            player_name=player_name,
                            map_name=map_name,
                            error_message='Already sent (file history)'
                        )
                        continue

                    # Build and send notification
                    template = messenger.config.get('message_template',
                        "Your CS2 match on {map} has been analyzed! View your stats at Stattrak.")
                    message = template.format(
                        map=map_name,
                        match_id=match_id,
                        stats_url=stats_url
                    )

                    success = messenger.send_message(steam_id, message)

                    if success:
                        messenger._mark_message_sent(steam_id, match_id)
                        messenger.log_notification(
                            match_id=match_id,
                            steam_id=steam_id,
                            status='sent',
                            player_name=player_name,
                            map_name=map_name,
                            message_text=message
                        )
                        players_notified += 1
                    else:
                        messenger.log_notification(
                            match_id=match_id,
                            steam_id=steam_id,
                            status='failed',
                            player_name=player_name,
                            map_name=map_name,
                            message_text=message,
                            error_message='send_message returned False'
                        )

                    # Small delay between messages
                    time.sleep(2)

                # If all players notified, mark match as done
                remaining = messenger.get_players_needing_notification(match_id)
                if not remaining:
                    messenger.mark_match_notified(match_id)
                    matches_notified += 1

            logger.info(f"Completed notification cycle: {matches_notified} matches fully notified")
            logger.info(f"Sleeping for {check_interval} seconds")
            time.sleep(check_interval)

    except KeyboardInterrupt:
        logger.info("Shutting down messenger daemon")
        messenger.logout()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Example usage
    messenger = SteamMessenger()

    if messenger.login():
        print("Successfully logged in to Steam")
        print("Ready to send notifications")

        # Example notification
        # messenger.send_match_notification(
        #     steam_id="76561198012345678",
        #     match_id="abc123",
        #     map_name="de_mirage",
        #     stats_url="https://stattrak.com/match/abc123"
        # )

        messenger.logout()
    else:
        print("Failed to login to Steam")
