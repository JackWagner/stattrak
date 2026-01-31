"""
File-Based Stats Inserter
=========================
Extracts data from a parsed CS2 demo and stores it in local JSON files.
This is a temporary workaround for development without PostgreSQL.

Usage:
    from file_stats_inserter import FileStatsInserter
    from demoparser2 import DemoParser

    parser = DemoParser("match.dem")
    inserter = FileStatsInserter(parser, demo_filename="match.dem")
    inserter.insert_all()
"""

import hashlib
import logging as logger
import os
from datetime import datetime
from typing import Optional
from demoparser2 import DemoParser
from file_storage import FileStorage
from voice_extractor import VoiceExtractor, VoiceExtractionResult


class FileStatsInserter:
    """
    Extracts data from a DemoParser instance and stores in local JSON files.
    """

    def __init__(
        self,
        parser: DemoParser,
        demo_filename: str,
        demo_path: Optional[str] = None,
        demo_url: Optional[str] = None,
        storage: FileStorage = None,
        voice_output_dir: Optional[str] = None
    ):
        self.parser = parser
        self.demo_filename = demo_filename
        self.demo_path = demo_path  # Full path to demo file for voice extraction
        self.demo_url = demo_url
        self.storage = storage if storage else FileStorage()
        self.voice_output_dir = voice_output_dir

        # Generate a unique match_id from the demo filename
        self.match_id = self._generate_match_id(demo_filename)

        # Cache parsed data
        self._header = None
        self._rounds_df = None
        self._kills_df = None
        self._scoreboard_df = None
        self._damage_df = None
        self._flash_events_df = None
        self._player_teams_df = None
        self._weapon_fire_df = None

    def _generate_match_id(self, filename: str) -> str:
        """Generate a unique match ID from the demo filename."""
        return hashlib.md5(filename.encode()).hexdigest()[:16]

    def _parse_header(self) -> dict:
        if self._header is None:
            self._header = self.parser.parse_header()
        return self._header

    def _parse_rounds(self):
        if self._rounds_df is None:
            result = self.parser.parse_event("round_end")
            # Convert list to DataFrame if necessary
            if isinstance(result, list):
                import pandas as pd
                self._rounds_df = pd.DataFrame(result) if result else pd.DataFrame()
            else:
                self._rounds_df = result

            # Log if we got empty rounds
            if len(self._rounds_df) == 0:
                logger.warning(f"No round_end events found in demo - this may be a partial or incomplete demo")
        return self._rounds_df

    def _parse_kills(self):
        if self._kills_df is None:
            self._kills_df = self.parser.parse_event("player_death")
        return self._kills_df

    def _parse_scoreboard(self):
        if self._scoreboard_df is None:
            props = [
                "kills_total", "deaths_total", "assists_total",
                "headshot_kills_total", "damage_total", "score", "mvps",
                "team_name"
            ]
            ticks_df = self.parser.parse_ticks(props)
            if 'tick' in ticks_df.columns and len(ticks_df) > 0:
                last_tick = ticks_df['tick'].max()
                self._scoreboard_df = ticks_df[ticks_df['tick'] == last_tick]
            else:
                self._scoreboard_df = ticks_df
        return self._scoreboard_df

    def _parse_damage(self):
        if self._damage_df is None:
            self._damage_df = self.parser.parse_event("player_hurt")
        return self._damage_df

    def _parse_player_teams(self):
        if self._player_teams_df is None:
            try:
                team_df = self.parser.parse_event("player_team")
                if isinstance(team_df, list):
                    import pandas as pd
                    team_df = pd.DataFrame(team_df) if team_df else pd.DataFrame()
                if len(team_df) > 0:
                    self._player_teams_df = team_df[['team', 'user_steamid', 'user_name']].drop_duplicates(
                        subset=['user_steamid'], keep='last'
                    ).set_index('user_steamid')
            except Exception as e:
                logger.warning(f"Could not parse player teams: {e}")
                self._player_teams_df = None
        return self._player_teams_df

    def _parse_flash_events(self):
        if self._flash_events_df is None:
            try:
                result = self.parser.parse_event("player_blind")
                if isinstance(result, list):
                    if len(result) > 0:
                        import pandas as pd
                        self._flash_events_df = pd.DataFrame(result)
                    else:
                        self._flash_events_df = None
                else:
                    self._flash_events_df = result if len(result) > 0 else None
            except Exception as e:
                logger.warning(f"Could not parse flash events: {e}")
                self._flash_events_df = None
        return self._flash_events_df

    def _parse_weapon_fire(self):
        if self._weapon_fire_df is None:
            try:
                self._weapon_fire_df = self.parser.parse_event("weapon_fire")
            except Exception as e:
                logger.warning(f"Could not parse weapon fire: {e}")
                self._weapon_fire_df = None
        return self._weapon_fire_df

    def insert_match(self) -> bool:
        """Insert match metadata."""
        header = self._parse_header()
        rounds_df = self._parse_rounds()

        # Calculate scores
        # Winner values: 2 = T (Terrorists), 3 = CT (Counter-Terrorists)
        ct_score = 0
        t_score = 0
        valid_rounds = rounds_df  # Initialize valid_rounds

        if hasattr(rounds_df, 'iterrows'):
            valid_rounds = rounds_df[rounds_df['winner'].notna()] if 'winner' in rounds_df.columns else rounds_df
            for _, row in valid_rounds.iterrows():
                winner = row.get('winner')
                if winner == 3 or winner == 'CT':
                    ct_score += 1
                elif winner == 2 or winner == 'T':
                    t_score += 1

        winning_side = 'CT' if ct_score > t_score else ('T' if t_score > ct_score else None)

        # Get match date from demo file modification time
        played_at = datetime.now().isoformat()
        if self.demo_path and os.path.exists(self.demo_path):
            file_mtime = os.path.getmtime(self.demo_path)
            played_at = datetime.fromtimestamp(file_mtime).isoformat()

        match_data = {
            'match_id': self.match_id,
            'map': header.get('map_name', 'unknown'),
            'server_name': header.get('server_name'),
            'demo_file': self.demo_filename,
            'demo_url': self.demo_url,
            'played_at': played_at,
            'duration': int(header.get('playback_time', 0)),
            'total_rounds': len(valid_rounds) if hasattr(valid_rounds, '__len__') else 0,
            'ct_score': ct_score,
            't_score': t_score,
            'winning_side': winning_side
        }

        self.storage.insert_match(match_data)
        return True

    def insert_player_matches(self):
        """Insert player statistics for this match."""
        scoreboard = self._parse_scoreboard()
        rounds_df = self._parse_rounds()
        damage_df = self._parse_damage()
        player_teams_df = self._parse_player_teams()

        if scoreboard is None or len(scoreboard) == 0:
            logger.warning("No scoreboard data to insert")
            return

        # Calculate total rounds
        valid_rounds = rounds_df  # Initialize valid_rounds
        if hasattr(rounds_df, 'columns') and 'winner' in rounds_df.columns:
            valid_rounds = rounds_df[rounds_df['winner'].notna()]
        total_rounds = max(len(valid_rounds), 1) if hasattr(valid_rounds, '__len__') else 1

        # Calculate damage per player
        player_damage = {}
        if damage_df is not None and len(damage_df) > 0:
            for _, row in damage_df.iterrows():
                steam_id = str(row.get('attacker_steamid', ''))
                dmg = row.get('dmg_health', 0)
                if steam_id:
                    player_damage[steam_id] = player_damage.get(steam_id, 0) + dmg

        for _, player in scoreboard.iterrows():
            steam_id = str(player.get('steamid', ''))
            damage = player_damage.get(steam_id, 0)
            adr = round(damage / total_rounds, 2) if total_rounds > 0 else 0

            # Get player name from player_teams if available
            player_name = 'Unknown'
            if player_teams_df is not None and steam_id in player_teams_df.index:
                player_name = player_teams_df.loc[steam_id, 'user_name']

            player_data = {
                'match_id': self.match_id,
                'steam_id': steam_id,
                'name': player_name,
                'team': player.get('team_name', ''),
                'kills': int(player.get('kills_total', 0)),
                'deaths': int(player.get('deaths_total', 0)),
                'assists': int(player.get('assists_total', 0)),
                'headshots': int(player.get('headshot_kills_total', 0)),
                'damage': damage,
                'adr': adr,
                'mvps': int(player.get('mvps', 0)),
                'score': int(player.get('score', 0)),
                'result': None
            }

            self.storage.insert_player_match(player_data)

        logger.info(f"Inserted {len(scoreboard)} players for match {self.match_id}")

    def insert_rounds(self):
        """Insert round data."""
        rounds_df = self._parse_rounds()

        if rounds_df is None or len(rounds_df) == 0:
            logger.warning("No round data to insert")
            return

        ct_score = 0
        t_score = 0

        for idx, row in rounds_df.iterrows():
            winner = row.get('winner')
            reason = row.get('reason')
            # Round number is the index + 1 (rounds start at 1, not 0)
            round_num = idx + 1 if isinstance(idx, int) else int(idx) + 1

            if winner is None:
                continue

            # Winner values: 2 = T (Terrorists), 3 = CT (Counter-Terrorists)
            if winner == 3 or winner == 'CT':
                ct_score += 1
                winner_side = 'CT'
            elif winner == 2 or winner == 'T':
                t_score += 1
                winner_side = 'T'
            else:
                winner_side = None

            round_data = {
                'match_id': self.match_id,
                'round_number': round_num,
                'winner_side': winner_side,
                'end_reason': reason,
                'ct_score': ct_score,
                't_score': t_score,
                'bomb_planted': reason in ['bomb_exploded', 'bomb_defused'],
                'bomb_defused': reason == 'bomb_defused'
            }

            self.storage.insert_round(round_data)

        logger.info(f"Inserted {len(rounds_df)} rounds for match {self.match_id}")

    def insert_kills(self):
        """Insert kill events."""
        kills_df = self._parse_kills()
        rounds_df = self._parse_rounds()

        if kills_df is None or len(kills_df) == 0:
            logger.warning("No kill data to insert")
            return

        # Create tick-to-round mapping
        round_ticks = []
        for _, row in rounds_df.iterrows():
            round_ticks.append((int(row.get('round', 0)), int(row.get('tick', 0))))
        round_ticks.sort(key=lambda x: x[1])

        def get_round_for_tick(tick):
            current_round = 1
            for round_num, round_tick in round_ticks:
                if tick < round_tick:
                    return current_round
                current_round = round_num
            return current_round

        for _, kill in kills_df.iterrows():
            tick = int(kill.get('tick', 0))

            kill_data = {
                'match_id': self.match_id,
                'round_number': get_round_for_tick(tick),
                'tick': tick,
                'attacker_steam_id': str(kill.get('attacker_steamid', '')),
                'attacker_name': kill.get('attacker_name'),
                'attacker_team': None,
                'victim_steam_id': str(kill.get('user_steamid', '')),
                'victim_name': kill.get('user_name'),
                'victim_team': None,
                'weapon': kill.get('weapon'),
                'headshot': bool(kill.get('headshot', False)),
                'wallbang': bool(kill.get('penetrated', False)),
                'through_smoke': bool(kill.get('thrusmoke', False)),
                'no_scope': bool(kill.get('noscope', False)),
                'attacker_blind': bool(kill.get('attackerblind', False)),
                'assister_steam_id': str(kill.get('assister_steamid', '')) if kill.get('assister_steamid') else None,
                'assister_name': kill.get('assister_name'),
                'flash_assist': bool(kill.get('assistedflash', False))
            }

            self.storage.insert_kill(kill_data)

        logger.info(f"Inserted {len(kills_df)} kills for match {self.match_id}")

    def insert_weapon_stats(self):
        """Insert aggregated weapon statistics."""
        kills_df = self._parse_kills()
        damage_df = self._parse_damage()
        shots_df = self._parse_weapon_fire()

        weapon_stats = {}

        # Count kills and headshots
        if kills_df is not None:
            for _, kill in kills_df.iterrows():
                steam_id = str(kill.get('attacker_steamid', ''))
                weapon = kill.get('weapon', 'unknown')
                key = (steam_id, weapon)

                if key not in weapon_stats:
                    weapon_stats[key] = {'kills': 0, 'headshots': 0, 'damage': 0, 'shots': 0, 'hits': 0}

                weapon_stats[key]['kills'] += 1
                if kill.get('headshot', False):
                    weapon_stats[key]['headshots'] += 1

        # Count damage
        if damage_df is not None:
            for _, dmg in damage_df.iterrows():
                steam_id = str(dmg.get('attacker_steamid', ''))
                weapon = dmg.get('weapon', 'unknown')
                key = (steam_id, weapon)

                if key not in weapon_stats:
                    weapon_stats[key] = {'kills': 0, 'headshots': 0, 'damage': 0, 'shots': 0, 'hits': 0}

                weapon_stats[key]['damage'] += int(dmg.get('dmg_health', 0))
                weapon_stats[key]['hits'] += 1

        # Count shots
        if shots_df is not None:
            for _, shot in shots_df.iterrows():
                steam_id = str(shot.get('user_steamid', ''))
                weapon = shot.get('weapon', 'unknown')
                key = (steam_id, weapon)

                if key not in weapon_stats:
                    weapon_stats[key] = {'kills': 0, 'headshots': 0, 'damage': 0, 'shots': 0, 'hits': 0}

                weapon_stats[key]['shots'] += 1

        for (steam_id, weapon), stats in weapon_stats.items():
            if not steam_id:
                continue

            weapon_data = {
                'match_id': self.match_id,
                'steam_id': steam_id,
                'weapon': weapon,
                'kills': stats['kills'],
                'headshots': stats['headshots'],
                'damage': stats['damage'],
                'shots': stats['shots'],
                'hits': stats['hits']
            }

            self.storage.insert_weapon_stat(weapon_data)

        logger.info(f"Inserted {len(weapon_stats)} weapon stat records for match {self.match_id}")

    def insert_flash_stats(self):
        """Insert aggregated flash statistics."""
        flash_df = self._parse_flash_events()
        team_df = self._parse_player_teams()
        weapon_fire_df = self._parse_weapon_fire()

        if flash_df is None or len(flash_df) == 0:
            logger.warning("No flash data available for this demo")
            return

        if team_df is None or len(team_df) == 0:
            logger.warning("No team data available for flash categorization")
            return

        # Join flash events with team info
        flash_with_victim_team = flash_df.merge(
            team_df[['team', 'user_name']],
            left_on='user_steamid',
            right_index=True,
            how='left',
            suffixes=('', '_victim')
        ).rename(columns={'team': 'victim_team', 'user_name': 'victim_name_lookup'})

        flash_with_both = flash_with_victim_team.merge(
            team_df[['team', 'user_name']],
            left_on='attacker_steamid',
            right_index=True,
            how='left'
        ).rename(columns={'team': 'attacker_team', 'user_name': 'attacker_name_lookup'})

        # Aggregate stats per player
        player_flash_stats = {}

        for _, flash in flash_with_both.iterrows():
            attacker_id = str(flash.get('attacker_steamid', ''))
            victim_id = str(flash.get('user_steamid', ''))
            attacker_team = flash.get('attacker_team')
            victim_team = flash.get('victim_team')
            attacker_name = flash.get('attacker_name') or flash.get('attacker_name_lookup', 'Unknown')
            duration = float(flash.get('blind_duration', 0))

            if not attacker_id:
                continue

            if attacker_id not in player_flash_stats:
                player_flash_stats[attacker_id] = {
                    'name': attacker_name,
                    'team': attacker_team,
                    'enemies_flashed': 0,
                    'enemy_blind_duration': 0.0,
                    'teammates_flashed': 0,
                    'team_blind_duration': 0.0,
                    'self_flashes': 0,
                    'self_blind_duration': 0.0,
                    'flashes_thrown': 0
                }

            if attacker_id == victim_id:
                player_flash_stats[attacker_id]['self_flashes'] += 1
                player_flash_stats[attacker_id]['self_blind_duration'] += duration
            elif attacker_team == victim_team:
                player_flash_stats[attacker_id]['teammates_flashed'] += 1
                player_flash_stats[attacker_id]['team_blind_duration'] += duration
            else:
                player_flash_stats[attacker_id]['enemies_flashed'] += 1
                player_flash_stats[attacker_id]['enemy_blind_duration'] += duration

        # Count flashes thrown
        if weapon_fire_df is not None and len(weapon_fire_df) > 0:
            flashbang_fires = weapon_fire_df[weapon_fire_df['weapon'] == 'flashbang']
            for _, fire in flashbang_fires.iterrows():
                steam_id = str(fire.get('user_steamid', ''))
                if steam_id and steam_id in player_flash_stats:
                    player_flash_stats[steam_id]['flashes_thrown'] += 1

        for steam_id, stats in player_flash_stats.items():
            flash_data = {
                'match_id': self.match_id,
                'steam_id': steam_id,
                'name': stats['name'],
                'team': stats['team'],
                'enemies_flashed': stats['enemies_flashed'],
                'enemy_blind_duration': round(stats['enemy_blind_duration'], 2),
                'teammates_flashed': stats['teammates_flashed'],
                'team_blind_duration': round(stats['team_blind_duration'], 2),
                'self_flashes': stats['self_flashes'],
                'self_blind_duration': round(stats['self_blind_duration'], 2),
                'flashes_thrown': stats['flashes_thrown']
            }

            self.storage.insert_flash_stat(flash_data)

        logger.info(f"Inserted flash stats for {len(player_flash_stats)} players in match {self.match_id}")

    def insert_damage_stats(self):
        """Insert aggregated team damage statistics."""
        damage_df = self._parse_damage()
        team_df = self._parse_player_teams()

        if damage_df is None or len(damage_df) == 0:
            logger.warning("No damage data available for this demo")
            return

        if team_df is None or len(team_df) == 0:
            logger.warning("No team data available for damage categorization")
            return

        # Join damage events with team info
        damage_with_victim_team = damage_df.merge(
            team_df[['team', 'user_name']],
            left_on='user_steamid',
            right_index=True,
            how='left',
            suffixes=('', '_victim')
        ).rename(columns={'team': 'victim_team', 'user_name': 'victim_name_lookup'})

        damage_with_both = damage_with_victim_team.merge(
            team_df[['team', 'user_name']],
            left_on='attacker_steamid',
            right_index=True,
            how='left'
        ).rename(columns={'team': 'attacker_team', 'user_name': 'attacker_name_lookup'})

        # Aggregate stats per player
        player_damage_stats = {}

        for _, dmg in damage_with_both.iterrows():
            attacker_id = str(dmg.get('attacker_steamid', ''))
            victim_id = str(dmg.get('user_steamid', ''))
            attacker_team = dmg.get('attacker_team')
            victim_team = dmg.get('victim_team')
            attacker_name = dmg.get('attacker_name') or dmg.get('attacker_name_lookup', 'Unknown')
            damage = int(dmg.get('dmg_health', 0))

            if not attacker_id or damage <= 0:
                continue

            if attacker_id not in player_damage_stats:
                player_damage_stats[attacker_id] = {
                    'name': attacker_name,
                    'team': attacker_team,
                    'enemy_damage': 0,
                    'team_damage': 0,
                    'self_damage': 0,
                    'total_damage': 0,
                    'team_damage_incidents': 0
                }

            player_damage_stats[attacker_id]['total_damage'] += damage

            if attacker_id == victim_id:
                player_damage_stats[attacker_id]['self_damage'] += damage
            elif attacker_team == victim_team:
                player_damage_stats[attacker_id]['team_damage'] += damage
                player_damage_stats[attacker_id]['team_damage_incidents'] += 1
            else:
                player_damage_stats[attacker_id]['enemy_damage'] += damage

        for steam_id, stats in player_damage_stats.items():
            damage_data = {
                'match_id': self.match_id,
                'steam_id': steam_id,
                'name': stats['name'],
                'team': stats['team'],
                'enemy_damage': stats['enemy_damage'],
                'team_damage': stats['team_damage'],
                'self_damage': stats['self_damage'],
                'total_damage': stats['total_damage'],
                'team_damage_incidents': stats['team_damage_incidents']
            }

            self.storage.insert_damage_stat(damage_data)

        logger.info(f"Inserted damage stats for {len(player_damage_stats)} players in match {self.match_id}")

    def insert_clutch_stats(self):
        """Insert clutch situation statistics (1vX scenarios)."""
        kills_df = self._parse_kills()
        rounds_df = self._parse_rounds()
        team_df = self._parse_player_teams()

        if kills_df is None or len(kills_df) == 0 or rounds_df is None or len(rounds_df) == 0:
            logger.warning("No kill or round data available for clutch analysis")
            return

        # Track clutch scenarios per round
        clutch_situations = {}  # Key: (round, steam_id), Value: {enemies_alive, won}

        # For each round, track player states at different ticks
        for round_idx, round_data in rounds_df.iterrows():
            round_num = round_idx + 1 if isinstance(round_idx, int) else int(round_idx) + 1
            round_tick_start = 0 if round_idx == 0 else rounds_df.iloc[round_idx - 1]['tick'] if round_idx > 0 else 0
            round_tick_end = round_data.get('tick', float('inf'))
            winner = round_data.get('winner')

            # Get kills in this round
            round_kills = kills_df[(kills_df['tick'] >= round_tick_start) & (kills_df['tick'] < round_tick_end)]

            # Track alive players throughout the round
            initial_players = {}  # steam_id -> team
            if team_df is not None:
                for steam_id, player in team_df.iterrows():
                    initial_players[steam_id] = player['team']

            alive_players = initial_players.copy()

            # Process kills chronologically
            for _, kill in round_kills.sort_values('tick').iterrows():
                victim_id = str(kill.get('user_steamid', ''))
                if victim_id in alive_players:
                    del alive_players[victim_id]

                # Check for clutch situations (1vX)
                if len(alive_players) > 0:
                    teams = {}
                    for player_id, team in alive_players.items():
                        if team not in teams:
                            teams[team] = []
                        teams[team].append(player_id)

                    # Check if we have a 1vX situation
                    if len(teams) == 2:
                        team_counts = {team: len(players) for team, players in teams.items()}
                        for team, players in teams.items():
                            if len(players) == 1:  # This player is alone
                                other_team = [t for t in teams.keys() if t != team][0]
                                enemies_alive = len(teams[other_team])

                                if enemies_alive > 0:  # 1vX clutch situation
                                    player_id = players[0]
                                    clutch_key = (round_num, player_id)
                                    clutch_situations[clutch_key] = {
                                        'enemies_alive': enemies_alive,
                                        'round': round_num,
                                        'won': None  # Will determine at round end
                                    }

        # Determine clutch outcomes
        for (round_num, player_id), situation in clutch_situations.items():
            # Check if the player's team won
            if round_num - 1 < len(rounds_df):
                round_data = rounds_df.iloc[round_num - 1]
                winner = round_data.get('winner')
                if team_df is not None and player_id in team_df.index:
                    player_team = team_df.loc[player_id, 'team']
                    # Winner values: 2 = T, 3 = CT
                    won = (winner == 3 and player_team == 'CT') or (winner == 2 and player_team == 'T')
                    situation['won'] = won

        # Aggregate clutch stats per player
        player_clutch_stats = {}

        for (round_num, player_id), situation in clutch_situations.items():
            if player_id not in player_clutch_stats:
                player_name = 'Unknown'
                if team_df is not None and player_id in team_df.index:
                    player_name = team_df.loc[player_id, 'user_name']

                player_clutch_stats[player_id] = {
                    'name': player_name,
                    '1v1_attempts': 0, '1v1_won': 0,
                    '1v2_attempts': 0, '1v2_won': 0,
                    '1v3_attempts': 0, '1v3_won': 0,
                    '1v4_attempts': 0, '1v4_won': 0,
                    '1v5_attempts': 0, '1v5_won': 0,
                    'total_attempts': 0,
                    'total_won': 0
                }

            enemies = situation['enemies_alive']
            won = situation['won']

            if enemies >= 1 and enemies <= 5:
                player_clutch_stats[player_id][f'1v{enemies}_attempts'] += 1
                if won:
                    player_clutch_stats[player_id][f'1v{enemies}_won'] += 1

            player_clutch_stats[player_id]['total_attempts'] += 1
            if won:
                player_clutch_stats[player_id]['total_won'] += 1

        # Insert to storage
        for steam_id, stats in player_clutch_stats.items():
            clutch_data = {
                'match_id': self.match_id,
                'steam_id': steam_id,
                'name': stats['name'],
                '1v1_attempts': stats['1v1_attempts'],
                '1v1_won': stats['1v1_won'],
                '1v2_attempts': stats['1v2_attempts'],
                '1v2_won': stats['1v2_won'],
                '1v3_attempts': stats['1v3_attempts'],
                '1v3_won': stats['1v3_won'],
                '1v4_attempts': stats['1v4_attempts'],
                '1v4_won': stats['1v4_won'],
                '1v5_attempts': stats['1v5_attempts'],
                '1v5_won': stats['1v5_won'],
                'total_clutch_attempts': stats['total_attempts'],
                'total_clutches_won': stats['total_won']
            }

            self.storage.insert_clutch_stat(clutch_data)

        logger.info(f"Inserted clutch stats for {len(player_clutch_stats)} players in match {self.match_id}")

    def insert_multikill_stats(self):
        """Insert multikill statistics (2K, 3K, 4K, 5K sprees)."""
        kills_df = self._parse_kills()
        rounds_df = self._parse_rounds()
        team_df = self._parse_player_teams()

        if kills_df is None or len(kills_df) == 0:
            logger.warning("No kill data available for multikill analysis")
            return

        player_multikill_stats = {}

        # Process each round separately
        for round_idx, round_data in rounds_df.iterrows():
            round_num = round_idx + 1 if isinstance(round_idx, int) else int(round_idx) + 1
            round_tick_start = 0 if round_idx == 0 else rounds_df.iloc[round_idx - 1]['tick'] if round_idx > 0 else 0
            round_tick_end = round_data.get('tick', float('inf'))

            # Get kills in this round
            round_kills = kills_df[(kills_df['tick'] >= round_tick_start) & (kills_df['tick'] < round_tick_end)]

            # Track consecutive kills per player
            player_kills_in_round = {}
            for _, kill in round_kills.iterrows():
                attacker_id = str(kill.get('attacker_steamid', ''))
                if not attacker_id:
                    continue

                if attacker_id not in player_kills_in_round:
                    player_kills_in_round[attacker_id] = 0
                player_kills_in_round[attacker_id] += 1

            # Record multikills
            for attacker_id, kill_count in player_kills_in_round.items():
                if attacker_id not in player_multikill_stats:
                    player_name = 'Unknown'
                    if team_df is not None and attacker_id in team_df.index:
                        player_name = team_df.loc[attacker_id, 'user_name']

                    player_multikill_stats[attacker_id] = {
                        'name': player_name,
                        'double_kills': 0,
                        'triple_kills': 0,
                        'quad_kills': 0,
                        'aces': 0,
                        'total_multikills': 0
                    }

                # Count multikills (2+ kills in a round)
                if kill_count == 2:
                    player_multikill_stats[attacker_id]['double_kills'] += 1
                    player_multikill_stats[attacker_id]['total_multikills'] += 1
                elif kill_count == 3:
                    player_multikill_stats[attacker_id]['triple_kills'] += 1
                    player_multikill_stats[attacker_id]['total_multikills'] += 1
                elif kill_count == 4:
                    player_multikill_stats[attacker_id]['quad_kills'] += 1
                    player_multikill_stats[attacker_id]['total_multikills'] += 1
                elif kill_count >= 5:
                    player_multikill_stats[attacker_id]['aces'] += 1
                    player_multikill_stats[attacker_id]['total_multikills'] += 1

        # Insert to storage
        for steam_id, stats in player_multikill_stats.items():
            multikill_data = {
                'match_id': self.match_id,
                'steam_id': steam_id,
                'name': stats['name'],
                'double_kills': stats['double_kills'],
                'triple_kills': stats['triple_kills'],
                'quad_kills': stats['quad_kills'],
                'aces': stats['aces'],
                'total_multikills': stats['total_multikills']
            }

            self.storage.insert_multikill_stat(multikill_data)

        logger.info(f"Inserted multikill stats for {len(player_multikill_stats)} players in match {self.match_id}")

    def insert_first_blood_stats(self):
        """Insert first blood statistics (opening kills per round)."""
        kills_df = self._parse_kills()
        rounds_df = self._parse_rounds()
        team_df = self._parse_player_teams()

        if kills_df is None or len(kills_df) == 0 or rounds_df is None or len(rounds_df) == 0:
            logger.warning("No kill or round data available for first blood analysis")
            return

        player_first_blood_stats = {}

        # Process each round
        for round_idx, round_data in rounds_df.iterrows():
            round_num = round_idx + 1 if isinstance(round_idx, int) else int(round_idx) + 1
            round_tick_start = 0 if round_idx == 0 else rounds_df.iloc[round_idx - 1]['tick'] if round_idx > 0 else 0
            round_tick_end = round_data.get('tick', float('inf'))

            # Get kills in this round
            round_kills = kills_df[(kills_df['tick'] >= round_tick_start) & (kills_df['tick'] < round_tick_end)]

            if len(round_kills) == 0:
                continue

            # Get first kill of the round
            first_kill = round_kills.sort_values('tick').iloc[0]
            attacker_id = str(first_kill.get('attacker_steamid', ''))
            victim_id = str(first_kill.get('user_steamid', ''))

            if not attacker_id:
                continue

            # Initialize stats for attacker
            if attacker_id not in player_first_blood_stats:
                player_name = 'Unknown'
                if team_df is not None and attacker_id in team_df.index:
                    player_name = team_df.loc[attacker_id, 'user_name']

                player_first_blood_stats[attacker_id] = {
                    'name': player_name,
                    'first_bloods': 0,
                    'first_deaths': 0
                }

            # Initialize stats for victim
            if victim_id not in player_first_blood_stats:
                victim_name = 'Unknown'
                if team_df is not None and victim_id in team_df.index:
                    victim_name = team_df.loc[victim_id, 'user_name']

                player_first_blood_stats[victim_id] = {
                    'name': victim_name,
                    'first_bloods': 0,
                    'first_deaths': 0
                }

            player_first_blood_stats[attacker_id]['first_bloods'] += 1
            player_first_blood_stats[victim_id]['first_deaths'] += 1

        # Insert to storage
        for steam_id, stats in player_first_blood_stats.items():
            first_blood_data = {
                'match_id': self.match_id,
                'steam_id': steam_id,
                'name': stats['name'],
                'first_bloods': stats['first_bloods'],
                'first_deaths': stats['first_deaths']
            }

            self.storage.insert_first_blood_stat(first_blood_data)

        logger.info(f"Inserted first blood stats for {len(player_first_blood_stats)} players in match {self.match_id}")

    def insert_chat_messages(self):
        """Insert chat messages for sentiment analysis."""
        try:
            chat_df = self.parser.parse_event("chat_message")
        except Exception as e:
            logger.warning(f"Could not parse chat messages: {e}")
            return

        if chat_df is None or len(chat_df) == 0:
            logger.info("No chat messages in this demo")
            return

        count = 0
        for _, msg in chat_df.iterrows():
            chat_data = {
                'match_id': self.match_id,
                'tick': int(msg.get('tick', 0)),
                'steam_id': str(msg.get('user_steamid', '')),
                'player_name': msg.get('user_name', 'Unknown'),
                'message': msg.get('chat_message', ''),
            }
            self.storage.insert_chat_message(chat_data)
            count += 1

        logger.info(f"Inserted {count} chat messages for match {self.match_id}")

    def extract_voice(self) -> Optional[VoiceExtractionResult]:
        """
        Extract voice data from the demo file.

        Requires:
            - csgo-voice-extractor to be installed
            - demo_path to be set (full path to .dem file)
            - Demo must contain voice data (not Valve MM demos)

        Returns:
            VoiceExtractionResult or None if extraction not possible
        """
        if not self.demo_path:
            logger.warning("Cannot extract voice: demo_path not provided")
            return None

        if not os.path.exists(self.demo_path):
            logger.warning(f"Cannot extract voice: demo file not found at {self.demo_path}")
            return None

        extractor = VoiceExtractor()

        if not extractor.is_available():
            logger.info("Voice extraction skipped: csgo-voice-extractor not installed")
            return None

        # Determine output directory
        if self.voice_output_dir:
            output_dir = self.voice_output_dir
        else:
            # Default: create voice_output/<match_id>/ in tables directory
            output_dir = os.path.join(self.storage.tables_dir, "voice_output", self.match_id)

        result = extractor.extract(self.demo_path, output_dir, mode="split_compact")

        if result.success:
            if result.has_voice_data:
                logger.info(f"Extracted {len(result.files)} voice files to {output_dir}")
            else:
                logger.info("Demo does not contain voice data (likely Valve MM demo)")
        else:
            logger.warning(f"Voice extraction failed: {result.error}")

        return result

    def insert_all(self, extract_voice: bool = True):
        """Insert all data for this demo."""
        logger.info(f"Starting full insert for match {self.match_id}")

        self.insert_match()
        self.insert_player_matches()
        self.insert_rounds()
        self.insert_kills()
        self.insert_weapon_stats()
        self.insert_flash_stats()
        self.insert_damage_stats()
        self.insert_clutch_stats()
        self.insert_multikill_stats()
        self.insert_first_blood_stats()
        self.insert_chat_messages()

        # Voice extraction (optional, requires csgo-voice-extractor)
        voice_result = None
        if extract_voice:
            voice_result = self.extract_voice()

        logger.info(f"Completed full insert for match {self.match_id}")
        return self.match_id, voice_result
