"""
File-Based Storage Module
=========================
Temporary workaround for local development without PostgreSQL.
Stores parsed demo data as JSON files in the /tables directory.

This module provides the same interface as db_utils.Connect but writes
to local JSON files instead of a PostgreSQL database.

Usage:
    from file_storage import FileStorage
    storage = FileStorage()
    storage.insert_match(match_data)
    storage.insert_player_matches(players_data)
    # etc.
"""

import os
import json
import logging as logger
from datetime import datetime
from typing import List, Dict, Any, Optional

# Path to tables directory (relative to project root)
TABLES_DIR = os.path.join(os.path.dirname(__file__), '..', 'tables')


class FileStorage:
    """
    File-based storage that mimics database operations using JSON files.
    Each table is stored as a separate JSON file containing an array of records.
    """

    def __init__(self, tables_dir: str = TABLES_DIR):
        self.tables_dir = os.path.abspath(tables_dir)
        os.makedirs(self.tables_dir, exist_ok=True)
        logger.info(f"FileStorage initialized at {self.tables_dir}")

    def _get_table_path(self, table_name: str) -> str:
        """Get the file path for a table."""
        return os.path.join(self.tables_dir, f"{table_name}.json")

    def _read_table(self, table_name: str) -> List[Dict[str, Any]]:
        """Read all records from a table file."""
        path = self._get_table_path(table_name)
        if os.path.exists(path):
            with open(path, 'r') as f:
                return json.load(f)
        return []

    def _write_table(self, table_name: str, records: List[Dict[str, Any]]):
        """Write all records to a table file."""
        path = self._get_table_path(table_name)
        with open(path, 'w') as f:
            json.dump(records, f, indent=2, default=str)

    def _upsert_record(self, table_name: str, record: Dict[str, Any], key_fields: List[str]):
        """Insert or update a record based on key fields."""
        records = self._read_table(table_name)

        # Find existing record by key
        existing_idx = None
        for idx, existing in enumerate(records):
            if all(existing.get(k) == record.get(k) for k in key_fields):
                existing_idx = idx
                break

        if existing_idx is not None:
            records[existing_idx] = record
        else:
            records.append(record)

        self._write_table(table_name, records)

    def _insert_record(self, table_name: str, record: Dict[str, Any]):
        """Insert a new record (no upsert)."""
        records = self._read_table(table_name)
        records.append(record)
        self._write_table(table_name, records)

    # =========================================================================
    # Table-specific methods matching StatsInserter expectations
    # =========================================================================

    def insert_match(self, match_data: Dict[str, Any]) -> bool:
        """Insert match metadata."""
        # Add created_at timestamp
        match_data['created_at'] = datetime.now().isoformat()
        self._upsert_record('matches', match_data, ['match_id'])
        logger.info(f"Inserted match {match_data.get('match_id')}")
        return True

    def insert_player_match(self, player_data: Dict[str, Any]):
        """Insert player match stats."""
        self._upsert_record('player_matches', player_data, ['match_id', 'steam_id'])

    def insert_round(self, round_data: Dict[str, Any]):
        """Insert round data."""
        self._upsert_record('rounds', round_data, ['match_id', 'round_number'])

    def insert_kill(self, kill_data: Dict[str, Any]):
        """Insert kill event."""
        self._insert_record('kills', kill_data)

    def insert_weapon_stat(self, weapon_data: Dict[str, Any]):
        """Insert weapon stats."""
        self._upsert_record('weapon_stats', weapon_data, ['match_id', 'steam_id', 'weapon'])

    def insert_flash_stat(self, flash_data: Dict[str, Any]):
        """Insert flash stats."""
        self._upsert_record('flash_stats', flash_data, ['match_id', 'steam_id'])

    def insert_chat_message(self, chat_data: Dict[str, Any]):
        """Insert chat message (upsert by match_id + tick + steam_id)."""
        self._upsert_record('chat_messages', chat_data, ['match_id', 'tick', 'steam_id'])

    # =========================================================================
    # Query methods for reading data
    # =========================================================================

    def get_all_matches(self) -> List[Dict[str, Any]]:
        """Get all matches."""
        return self._read_table('matches')

    def get_match(self, match_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific match by ID."""
        matches = self._read_table('matches')
        for match in matches:
            if match.get('match_id') == match_id:
                return match
        return None

    def get_player_matches(self, match_id: str = None, steam_id: str = None) -> List[Dict[str, Any]]:
        """Get player match stats, optionally filtered."""
        records = self._read_table('player_matches')
        if match_id:
            records = [r for r in records if r.get('match_id') == match_id]
        if steam_id:
            records = [r for r in records if r.get('steam_id') == steam_id]
        return records

    def get_rounds(self, match_id: str) -> List[Dict[str, Any]]:
        """Get rounds for a match."""
        records = self._read_table('rounds')
        return [r for r in records if r.get('match_id') == match_id]

    def get_kills(self, match_id: str) -> List[Dict[str, Any]]:
        """Get kills for a match."""
        records = self._read_table('kills')
        return [r for r in records if r.get('match_id') == match_id]

    def get_weapon_stats(self, match_id: str = None, steam_id: str = None) -> List[Dict[str, Any]]:
        """Get weapon stats, optionally filtered."""
        records = self._read_table('weapon_stats')
        if match_id:
            records = [r for r in records if r.get('match_id') == match_id]
        if steam_id:
            records = [r for r in records if r.get('steam_id') == steam_id]
        return records

    def get_flash_stats(self, match_id: str = None, steam_id: str = None) -> List[Dict[str, Any]]:
        """Get flash stats, optionally filtered."""
        records = self._read_table('flash_stats')
        if match_id:
            records = [r for r in records if r.get('match_id') == match_id]
        if steam_id:
            records = [r for r in records if r.get('steam_id') == steam_id]
        return records

    def get_chat_messages(self, match_id: str = None, steam_id: str = None) -> List[Dict[str, Any]]:
        """Get chat messages, optionally filtered."""
        records = self._read_table('chat_messages')
        if match_id:
            records = [r for r in records if r.get('match_id') == match_id]
        if steam_id:
            records = [r for r in records if r.get('steam_id') == steam_id]
        return sorted(records, key=lambda x: x.get('tick', 0))
