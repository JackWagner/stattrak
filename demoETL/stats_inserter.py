"""
Stats Inserter Module
=====================
Extracts data from a parsed CS2 demo and inserts it into the stats.* tables.

This module bridges demoparser2 output to PostgreSQL storage.

Usage:
    from stats_inserter import StatsInserter
    from demoparser2 import DemoParser
    from db_utils import Connect

    parser = DemoParser("match.dem")
    db = Connect()
    inserter = StatsInserter(parser, db, demo_filename="match.dem")
    inserter.insert_all()
"""

import hashlib
import logging as logger
from datetime import datetime
from typing import Optional
from demoparser2 import DemoParser
from db_utils import Connect


class StatsInserter:
    """
    Extracts data from a DemoParser instance and inserts into stats.* tables.
    """

    def __init__(
        self,
        parser: DemoParser,
        db: Connect,
        demo_filename: str,
        demo_url: Optional[str] = None
    ):
        """
        Initialize the StatsInserter.

        Args:
            parser: A DemoParser instance with a loaded demo file
            db: A database connection instance
            demo_filename: Original filename of the demo
            demo_url: Optional URL where the demo was downloaded from
        """
        self.parser = parser
        self.db = db
        self.demo_filename = demo_filename
        self.demo_url = demo_url

        # Generate a unique match_id from the demo filename
        # This ensures the same demo always gets the same ID
        self.match_id = self._generate_match_id(demo_filename)

        # Cache parsed data to avoid re-parsing
        self._header = None
        self._rounds_df = None
        self._kills_df = None
        self._scoreboard_df = None
        self._damage_df = None
        self._shots_df = None
        self._bomb_plants_df = None
        self._bomb_defuses_df = None
        self._flash_events_df = None
        self._player_teams_df = None
        self._weapon_fire_df = None

    def _generate_match_id(self, filename: str) -> str:
        """Generate a unique match ID from the demo filename."""
        # Use MD5 hash of filename, truncated to 16 chars
        return hashlib.md5(filename.encode()).hexdigest()[:16]

    def _parse_header(self) -> dict:
        """Parse and cache the demo header."""
        if self._header is None:
            self._header = self.parser.parse_header()
        return self._header

    def _parse_rounds(self):
        """Parse and cache round end events."""
        if self._rounds_df is None:
            self._rounds_df = self.parser.parse_event("round_end")
        return self._rounds_df

    def _parse_kills(self):
        """Parse and cache kill events."""
        if self._kills_df is None:
            self._kills_df = self.parser.parse_event("player_death")
        return self._kills_df

    def _parse_scoreboard(self):
        """Parse and cache final scoreboard data."""
        if self._scoreboard_df is None:
            props = [
                "kills_total", "deaths_total", "assists_total",
                "headshot_kills_total", "damage_total", "score", "mvps",
                "team_name", "name"
            ]
            ticks_df = self.parser.parse_ticks(props)
            # Get the last tick for final stats
            if 'tick' in ticks_df.columns and len(ticks_df) > 0:
                last_tick = ticks_df['tick'].max()
                self._scoreboard_df = ticks_df[ticks_df['tick'] == last_tick]
            else:
                self._scoreboard_df = ticks_df
        return self._scoreboard_df

    def _parse_damage(self):
        """Parse and cache damage events."""
        if self._damage_df is None:
            self._damage_df = self.parser.parse_event("player_hurt")
        return self._damage_df

    def _parse_shots(self):
        """Parse and cache weapon fire events."""
        if self._shots_df is None:
            self._shots_df = self.parser.parse_event("weapon_fire")
        return self._shots_df

    def _parse_bomb_events(self):
        """Parse and cache bomb plant/defuse events."""
        if self._bomb_plants_df is None:
            try:
                self._bomb_plants_df = self.parser.parse_event("bomb_planted")
            except:
                self._bomb_plants_df = None
        if self._bomb_defuses_df is None:
            try:
                self._bomb_defuses_df = self.parser.parse_event("bomb_defused")
            except:
                self._bomb_defuses_df = None
        return self._bomb_plants_df, self._bomb_defuses_df

    def _parse_player_teams(self):
        """Parse and cache player team assignments."""
        if self._player_teams_df is None:
            try:
                team_df = self.parser.parse_event("player_team")
                # Keep latest team assignment per player
                self._player_teams_df = team_df[['team', 'user_steamid', 'user_name']].drop_duplicates(
                    subset=['user_steamid'], keep='last'
                ).set_index('user_steamid')
            except Exception as e:
                logger.warning(f"Could not parse player teams: {e}")
                self._player_teams_df = None
        return self._player_teams_df

    def _parse_flash_events(self):
        """Parse and cache flash blind events, filtering out warmup."""
        if self._flash_events_df is None:
            try:
                # Parse with warmup period info so we can filter it out
                all_flashes = self.parser.parse_event("player_blind", other=["is_warmup_period"])
                # Filter out warmup flashes
                self._flash_events_df = all_flashes[all_flashes["is_warmup_period"] == False]
            except Exception as e:
                logger.warning(f"Could not parse flash events: {e}")
                self._flash_events_df = None
        return self._flash_events_df

    def _parse_weapon_fire(self):
        """Parse and cache weapon fire events for flash thrown count."""
        if self._weapon_fire_df is None:
            try:
                self._weapon_fire_df = self.parser.parse_event("weapon_fire")
            except Exception as e:
                logger.warning(f"Could not parse weapon fire: {e}")
                self._weapon_fire_df = None
        return self._weapon_fire_df

    def insert_match(self) -> bool:
        """
        Insert match metadata into stats.matches.
        Returns True if successful, False if match already exists.
        """
        header = self._parse_header()
        rounds_df = self._parse_rounds()

        # Calculate final scores from rounds
        ct_score = 0
        t_score = 0
        valid_rounds = rounds_df[rounds_df['winner'].notna()]

        for _, row in valid_rounds.iterrows():
            if row['winner'] == 'CT':
                ct_score += 1
            elif row['winner'] == 'T':
                t_score += 1

        # Determine winning side
        if ct_score > t_score:
            winning_side = 'CT'
        elif t_score > ct_score:
            winning_side = 'T'
        else:
            winning_side = None

        sql = """
            INSERT INTO stats.matches (
                match_id, map, server_name, demo_file, demo_url,
                played_at, total_rounds, ct_score, t_score, winning_side
            )
            VALUES (
                :match_id, :map, :server_name, :demo_file, :demo_url,
                :played_at, :total_rounds, :ct_score, :t_score, :winning_side
            )
            ON CONFLICT (match_id) DO NOTHING
            RETURNING match_id;
        """

        params = {
            'match_id': self.match_id,
            'map': header.get('map_name', 'unknown'),
            'server_name': header.get('server_name'),
            'demo_file': self.demo_filename,
            'demo_url': self.demo_url,
            'played_at': datetime.now(),  # Could extract from demo if available
            'total_rounds': len(valid_rounds),
            'ct_score': ct_score,
            't_score': t_score,
            'winning_side': winning_side
        }

        try:
            self.db.execute(sql, params=params, returns=False)
            logger.info(f"Inserted match {self.match_id}")
            return True
        except Exception as e:
            logger.error(f"Error inserting match: {e}")
            return False

    def insert_player_matches(self):
        """Insert player statistics for this match into stats.player_matches."""
        scoreboard = self._parse_scoreboard()
        rounds_df = self._parse_rounds()
        damage_df = self._parse_damage()

        if scoreboard is None or len(scoreboard) == 0:
            logger.warning("No scoreboard data to insert")
            return

        # Calculate total rounds for ADR
        valid_rounds = rounds_df[rounds_df['winner'].notna()]
        total_rounds = max(len(valid_rounds), 1)

        # Get final scores for determining win/loss
        ct_score = sum(1 for _, r in valid_rounds.iterrows() if r['winner'] == 'CT')
        t_score = sum(1 for _, r in valid_rounds.iterrows() if r['winner'] == 'T')

        # Calculate damage per player
        player_damage = {}
        if damage_df is not None and len(damage_df) > 0:
            for _, row in damage_df.iterrows():
                steam_id = str(row.get('attacker_steamid', ''))
                dmg = row.get('dmg_health', 0)
                if steam_id:
                    player_damage[steam_id] = player_damage.get(steam_id, 0) + dmg

        sql = """
            INSERT INTO stats.player_matches (
                match_id, steam_id, name, team, kills, deaths, assists,
                headshots, damage, adr, mvps, score, result
            )
            VALUES (
                :match_id, :steam_id, :name, :team, :kills, :deaths, :assists,
                :headshots, :damage, :adr, :mvps, :score, :result
            )
            ON CONFLICT (match_id, steam_id) DO UPDATE SET
                name = EXCLUDED.name,
                kills = EXCLUDED.kills,
                deaths = EXCLUDED.deaths,
                assists = EXCLUDED.assists,
                headshots = EXCLUDED.headshots,
                damage = EXCLUDED.damage,
                adr = EXCLUDED.adr,
                mvps = EXCLUDED.mvps,
                score = EXCLUDED.score,
                result = EXCLUDED.result;
        """

        for _, player in scoreboard.iterrows():
            steam_id = str(player.get('steamid', ''))
            team_name = player.get('team_name', '')

            # Determine result based on team and score
            # This is simplified - in reality we'd need to track which side each player was on
            # For now, we'll leave result as NULL and could enhance later
            result = None

            damage = player_damage.get(steam_id, 0)
            adr = round(damage / total_rounds, 2) if total_rounds > 0 else 0

            params = {
                'match_id': self.match_id,
                'steam_id': steam_id,
                'name': player.get('name', 'Unknown'),
                'team': team_name,
                'kills': int(player.get('kills_total', 0)),
                'deaths': int(player.get('deaths_total', 0)),
                'assists': int(player.get('assists_total', 0)),
                'headshots': int(player.get('headshot_kills_total', 0)),
                'damage': damage,
                'adr': adr,
                'mvps': int(player.get('mvps', 0)),
                'score': int(player.get('score', 0)),
                'result': result
            }

            try:
                self.db.execute(sql, params=params, returns=False)
            except Exception as e:
                logger.error(f"Error inserting player {steam_id}: {e}")

        logger.info(f"Inserted {len(scoreboard)} players for match {self.match_id}")

    def insert_rounds(self):
        """Insert round data into stats.rounds."""
        rounds_df = self._parse_rounds()
        bomb_plants, bomb_defuses = self._parse_bomb_events()

        # Build sets of rounds with bomb events
        plant_rounds = set()
        defuse_rounds = set()

        if bomb_plants is not None and len(bomb_plants) > 0:
            # We need to correlate ticks with rounds
            # For simplicity, we'll just mark that bombs were planted based on round_end reason
            pass

        if bomb_defuses is not None and len(bomb_defuses) > 0:
            pass

        sql = """
            INSERT INTO stats.rounds (
                match_id, round_number, winner_side, end_reason,
                ct_score, t_score, bomb_planted, bomb_defused
            )
            VALUES (
                :match_id, :round_number, :winner_side, :end_reason,
                :ct_score, :t_score, :bomb_planted, :bomb_defused
            )
            ON CONFLICT (match_id, round_number) DO UPDATE SET
                winner_side = EXCLUDED.winner_side,
                end_reason = EXCLUDED.end_reason,
                ct_score = EXCLUDED.ct_score,
                t_score = EXCLUDED.t_score,
                bomb_planted = EXCLUDED.bomb_planted,
                bomb_defused = EXCLUDED.bomb_defused;
        """

        ct_score = 0
        t_score = 0

        for _, row in rounds_df.iterrows():
            winner = row.get('winner')
            reason = row.get('reason')
            round_num = int(row.get('round', 0))

            # Skip invalid rounds
            if winner is None or round_num == 0:
                continue

            # Update running score
            if winner == 'CT':
                ct_score += 1
            elif winner == 'T':
                t_score += 1

            # Determine bomb events from reason
            bomb_planted = reason in ['bomb_exploded', 'bomb_defused']
            bomb_defused = reason == 'bomb_defused'

            params = {
                'match_id': self.match_id,
                'round_number': round_num,
                'winner_side': winner,
                'end_reason': reason,
                'ct_score': ct_score,
                't_score': t_score,
                'bomb_planted': bomb_planted,
                'bomb_defused': bomb_defused
            }

            try:
                self.db.execute(sql, params=params, returns=False)
            except Exception as e:
                logger.error(f"Error inserting round {round_num}: {e}")

        logger.info(f"Inserted {len(rounds_df)} rounds for match {self.match_id}")

    def insert_kills(self):
        """Insert kill events into stats.kills."""
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
            """Find which round a tick belongs to."""
            current_round = 1
            for round_num, round_tick in round_ticks:
                if tick < round_tick:
                    return current_round
                current_round = round_num
            return current_round

        sql = """
            INSERT INTO stats.kills (
                match_id, round_number, tick,
                attacker_steam_id, attacker_name, attacker_team,
                victim_steam_id, victim_name, victim_team,
                weapon, headshot, wallbang, through_smoke, no_scope, attacker_blind,
                assister_steam_id, assister_name, flash_assist
            )
            VALUES (
                :match_id, :round_number, :tick,
                :attacker_steam_id, :attacker_name, :attacker_team,
                :victim_steam_id, :victim_name, :victim_team,
                :weapon, :headshot, :wallbang, :through_smoke, :no_scope, :attacker_blind,
                :assister_steam_id, :assister_name, :flash_assist
            );
        """

        for _, kill in kills_df.iterrows():
            tick = int(kill.get('tick', 0))

            params = {
                'match_id': self.match_id,
                'round_number': get_round_for_tick(tick),
                'tick': tick,
                'attacker_steam_id': str(kill.get('attacker_steamid', '')),
                'attacker_name': kill.get('attacker_name'),
                'attacker_team': None,  # Would need additional parsing
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

            try:
                self.db.execute(sql, params=params, returns=False)
            except Exception as e:
                logger.error(f"Error inserting kill at tick {tick}: {e}")

        logger.info(f"Inserted {len(kills_df)} kills for match {self.match_id}")

    def insert_weapon_stats(self):
        """Insert aggregated weapon statistics into stats.weapon_stats."""
        kills_df = self._parse_kills()
        damage_df = self._parse_damage()
        shots_df = self._parse_shots()

        # Aggregate stats per player per weapon
        weapon_stats = {}  # (steam_id, weapon) -> {kills, headshots, damage, shots, hits}

        # Count kills and headshots per weapon
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

        # Count damage per weapon
        if damage_df is not None:
            for _, dmg in damage_df.iterrows():
                steam_id = str(dmg.get('attacker_steamid', ''))
                weapon = dmg.get('weapon', 'unknown')
                key = (steam_id, weapon)

                if key not in weapon_stats:
                    weapon_stats[key] = {'kills': 0, 'headshots': 0, 'damage': 0, 'shots': 0, 'hits': 0}

                weapon_stats[key]['damage'] += int(dmg.get('dmg_health', 0))
                weapon_stats[key]['hits'] += 1

        # Count shots per weapon
        if shots_df is not None:
            for _, shot in shots_df.iterrows():
                steam_id = str(shot.get('user_steamid', ''))
                weapon = shot.get('weapon', 'unknown')
                key = (steam_id, weapon)

                if key not in weapon_stats:
                    weapon_stats[key] = {'kills': 0, 'headshots': 0, 'damage': 0, 'shots': 0, 'hits': 0}

                weapon_stats[key]['shots'] += 1

        sql = """
            INSERT INTO stats.weapon_stats (
                match_id, steam_id, weapon, kills, headshots, damage, shots, hits
            )
            VALUES (
                :match_id, :steam_id, :weapon, :kills, :headshots, :damage, :shots, :hits
            )
            ON CONFLICT (match_id, steam_id, weapon) DO UPDATE SET
                kills = EXCLUDED.kills,
                headshots = EXCLUDED.headshots,
                damage = EXCLUDED.damage,
                shots = EXCLUDED.shots,
                hits = EXCLUDED.hits;
        """

        for (steam_id, weapon), stats in weapon_stats.items():
            if not steam_id:
                continue

            params = {
                'match_id': self.match_id,
                'steam_id': steam_id,
                'weapon': weapon,
                'kills': stats['kills'],
                'headshots': stats['headshots'],
                'damage': stats['damage'],
                'shots': stats['shots'],
                'hits': stats['hits']
            }

            try:
                self.db.execute(sql, params=params, returns=False)
            except Exception as e:
                logger.error(f"Error inserting weapon stats for {steam_id}/{weapon}: {e}")

        logger.info(f"Inserted {len(weapon_stats)} weapon stat records for match {self.match_id}")

    def insert_flash_stats(self):
        """
        Insert aggregated flash statistics into stats.flash_stats.

        Categorizes flashes as:
        - Enemy flashes: Attacker and victim on different teams (good)
        - Team flashes: Attacker and victim on same team (bad)
        - Self flashes: Attacker flashed themselves
        """
        flash_df = self._parse_flash_events()
        team_df = self._parse_player_teams()
        weapon_fire_df = self._parse_weapon_fire()

        if flash_df is None or len(flash_df) == 0:
            logger.warning("No flash data to insert")
            return

        if team_df is None or len(team_df) == 0:
            logger.warning("No team data available for flash categorization")
            return

        # Join flash events with team info for both attacker and victim
        # First, join victim's team
        flashes_with_victim_team = flash_df.merge(
            team_df[['team', 'user_name']],
            left_on='user_steamid',
            right_index=True,
            how='left',
            suffixes=('', '_victim')
        ).rename(columns={'team': 'victim_team', 'user_name': 'victim_name_lookup'})

        # Then join attacker's team
        flashes_with_both_teams = flashes_with_victim_team.merge(
            team_df[['team', 'user_name']],
            left_on='attacker_steamid',
            right_index=True,
            how='left'
        ).rename(columns={'team': 'attacker_team', 'user_name': 'attacker_name_lookup'})

        # Initialize per-player stats
        player_flash_stats = {}

        for _, flash in flashes_with_both_teams.iterrows():
            attacker_id = str(flash.get('attacker_steamid', ''))
            victim_id = str(flash.get('user_steamid', ''))
            attacker_team = flash.get('attacker_team')
            victim_team = flash.get('victim_team')
            attacker_name = flash.get('attacker_name') or flash.get('attacker_name_lookup', 'Unknown')
            duration = float(flash.get('blind_duration', 0))

            if not attacker_id:
                continue

            # Initialize player stats if needed
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

            # Categorize the flash
            if attacker_id == victim_id:
                # Self flash
                player_flash_stats[attacker_id]['self_flashes'] += 1
                player_flash_stats[attacker_id]['self_blind_duration'] += duration
            elif attacker_team == victim_team:
                # Team flash (bad)
                player_flash_stats[attacker_id]['teammates_flashed'] += 1
                player_flash_stats[attacker_id]['team_blind_duration'] += duration
            else:
                # Enemy flash (good)
                player_flash_stats[attacker_id]['enemies_flashed'] += 1
                player_flash_stats[attacker_id]['enemy_blind_duration'] += duration

        # Count flashbangs thrown per player
        if weapon_fire_df is not None and len(weapon_fire_df) > 0:
            flashbang_fires = weapon_fire_df[weapon_fire_df['weapon'] == 'flashbang']
            for _, fire in flashbang_fires.iterrows():
                steam_id = str(fire.get('user_steamid', ''))
                if steam_id and steam_id in player_flash_stats:
                    player_flash_stats[steam_id]['flashes_thrown'] += 1
                elif steam_id:
                    # Player threw flash but didn't blind anyone
                    player_flash_stats[steam_id] = {
                        'name': fire.get('user_name', 'Unknown'),
                        'team': None,
                        'enemies_flashed': 0,
                        'enemy_blind_duration': 0.0,
                        'teammates_flashed': 0,
                        'team_blind_duration': 0.0,
                        'self_flashes': 0,
                        'self_blind_duration': 0.0,
                        'flashes_thrown': 1
                    }

        sql = """
            INSERT INTO stats.flash_stats (
                match_id, steam_id, name, team,
                enemies_flashed, enemy_blind_duration,
                teammates_flashed, team_blind_duration,
                self_flashes, self_blind_duration,
                flashes_thrown
            )
            VALUES (
                :match_id, :steam_id, :name, :team,
                :enemies_flashed, :enemy_blind_duration,
                :teammates_flashed, :team_blind_duration,
                :self_flashes, :self_blind_duration,
                :flashes_thrown
            )
            ON CONFLICT (match_id, steam_id) DO UPDATE SET
                name = EXCLUDED.name,
                enemies_flashed = EXCLUDED.enemies_flashed,
                enemy_blind_duration = EXCLUDED.enemy_blind_duration,
                teammates_flashed = EXCLUDED.teammates_flashed,
                team_blind_duration = EXCLUDED.team_blind_duration,
                self_flashes = EXCLUDED.self_flashes,
                self_blind_duration = EXCLUDED.self_blind_duration,
                flashes_thrown = EXCLUDED.flashes_thrown;
        """

        for steam_id, stats in player_flash_stats.items():
            params = {
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

            try:
                self.db.execute(sql, params=params, returns=False)
            except Exception as e:
                logger.error(f"Error inserting flash stats for {steam_id}: {e}")

        logger.info(f"Inserted flash stats for {len(player_flash_stats)} players in match {self.match_id}")

    def insert_all(self):
        """
        Insert all data for this demo into the database.
        This is the main entry point for processing a demo.
        """
        logger.info(f"Starting full insert for match {self.match_id}")

        # Insert in order of dependencies
        self.insert_match()
        self.insert_player_matches()
        self.insert_rounds()
        self.insert_kills()
        self.insert_weapon_stats()
        self.insert_flash_stats()

        logger.info(f"Completed full insert for match {self.match_id}")
        return self.match_id
