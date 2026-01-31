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


def run_messenger_daemon(check_interval: int = 300):
    """
    Run Steam messenger as a daemon process.
    Checks for new analyzed matches and sends notifications.

    Args:
        check_interval: Seconds between checks (default: 5 minutes)
    """
    logger.info("Starting Steam messenger daemon")

    messenger = SteamMessenger()

    if not messenger.login():
        logger.error("Failed to login - exiting")
        return

    try:
        while True:
            logger.info("Checking for new matches to notify...")

            # TODO: Query database/file store for newly analyzed matches
            # that haven't been notified yet

            # Example:
            # new_matches = get_unnotified_matches()
            # notifications = [
            #     {
            #         'steam_id': match['steam_id'],
            #         'match_id': match['match_id'],
            #         'map_name': match['map'],
            #         'stats_url': f"https://stattrak.com/match/{match['match_id']}"
            #     }
            #     for match in new_matches
            # ]
            # messenger.send_batch_notifications(notifications)

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
