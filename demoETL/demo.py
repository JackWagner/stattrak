"""
Demo Processing Module
======================
Handles downloading, decompressing, and processing CS2 demo files.

The actual stats extraction and database insertion is delegated to StatsInserter,
which handles all stat types including flash stats.
"""

import wget
import re
import os
import bz2
import shutil
import logging as logger
import subprocess
from demoparser2 import DemoParser
from db_utils import Connect
from stats_inserter import StatsInserter

URL_REGEX = r'^http://replay115.valve.net/730/\w{32}.dem.bz2'
FILE_REGEX = r'^\w{32}.dem.bz2$'


class Demo:
    def __init__(self, url: str, db: Connect = None):
        """
        Initialize a Demo object for processing CS2 demo files.

        :param url: URL to download the demo from (Valve replay server)
        :param db: Database connection. If None, creates a new connection.
        """
        self.url = url
        self.db = db if db is not None else Connect()

        self.is_downloaded   = False
        self.is_decompressed = False
        self.is_stored_in_db = False
        self.is_deleted      = False

    def download(self, out_dir:str='demos'):
        """
        Downloads a demo BZ2 to specified directory if does not exist
        :param url: Full URL to download demo from, must match URL regex
        :param out_dir: Directory relative to HOME dir to download file
        """
        if re.match(URL_REGEX,self.url) is None:
            logger.error(f'Invalid url {self.url}')
            raise

        homedir           = os.path.expanduser('~')
        self.bz2_filename = self.url[31:]
        self.bz2_path     = os.path.join(homedir,out_dir,self.bz2_filename)
        
        if os.path.isfile(self.bz2_path):
            self.is_downloaded = True
            logger.error(f'Demo {self.bz2_filename} has already been downloaded')
            raise

        logger.info(f'Downloading to {self.bz2_path}')
        
        try:
            wget.download(self.url,self.bz2_path)
            print('\n')
        except Exception as e:
            logger.error(e)
            raise

        logger.info(f'Downloaded to {self.bz2_path}')

        self.is_downloaded = True

    def decompress(self):
        """
        Decompress a downloaded demo BZ2
        """

        if self.is_downloaded is False:
            logger.error(f'File from {self.url} has not been downloaded')
            raise

        if re.match(FILE_REGEX,self.bz2_filename) is None:
            logger.error(f'File {self.bz2_filename} is not valid')
            raise
        
        self.demo_path     = self.bz2_path[:-4]
        self.demo_filename = self.bz2_filename[:-4]

        logger.info(f'Decompressing {self.bz2_filename} into {self.demo_filename}')

        try:
            with bz2.BZ2File(self.bz2_path) as fr, open(self.demo_path,"wb") as fw:
                shutil.copyfileobj(fr,fw,length=16*1024*1024)
        except Exception as e:
            logger.error(e)
            raise

        logger.info(f'Decompressed into {self.demo_filename}')
        
        self.is_decompressed = True

    def get_parser(self):
        if not self.is_decompressed or not self.is_downloaded:
            logger.error(f'File from {self.url} has either not been decompressed or downloaded')
            raise

        try:
            _demo_parser = DemoParser(self.demo_path)     
        except:
            logger.error(f'Could not generate DemoParser from {self.demo_path}')
            raise

        self.demo_parser = _demo_parser

    def store_data_in_db(self):
        """
        Parses demo data and stores it in the stats.* tables.

        Uses StatsInserter to extract and insert all stats:
        - Match metadata (stats.matches)
        - Player stats per match (stats.player_matches)
        - Round-by-round data (stats.rounds)
        - Kill events (stats.kills)
        - Weapon statistics (stats.weapon_stats)
        - Flash statistics (stats.flash_stats)
        """
        if not self.is_decompressed or not self.is_downloaded:
            logger.error(f'File from {self.url} has either not been decompressed or downloaded')
            raise

        logger.info(f'Inserting parsed stats for {self.demo_filename}')
        try:
            inserter = StatsInserter(
                parser=self.demo_parser,
                db=self.db,
                demo_filename=self.demo_filename,
                demo_url=self.url
            )
            inserter.insert_all()
            logger.info(f'Successfully inserted stats for match_id: {inserter.match_id}')
        except Exception as e:
            logger.error(f'Failed to insert stats: {e}')
            raise

        self.is_stored_in_db = True

    def delete(self):
        """
        Delete the demo 
        """

        if not (self.is_decompressed and self.is_downloaded and self.is_stored_in_db):
            logger.error(f'File from {self.url} has not been downloaded, decompressed and stored in the DB')
            raise

        try:
            os.remove(self.bz2_path)
            os.remove(self.demo_path)
        except subprocess.CalledProcessError as e:
            logger.error(e.returncode)
            raise

        self.is_deleted = True

    def process(self):
        logger.info(f'Starting processing on {self.url}')
        self.download()
        self.decompress()
        self.get_parser()
        self.store_data_in_db()
        self.delete()
        logger.info(f'Finished processing {self.url}')