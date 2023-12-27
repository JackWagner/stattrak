import wget
import re
import os
import bz2, shutil
import logging as logger
import subprocess
from demoparser2 import DemoParser

URL_REGEX  = r'^http://replay115.valve.net/730/\w{32}.dem.bz2'
FILE_REGEX = r'^\w{32}.dem.bz2$'

def get_team_flashed_by_player(demoparser):
    # Get team number by player
    team_df = demoparser.parse_event("player_team")[['team','user_steamid']].set_index('user_steamid')

    # get all flashbang events and filter out warmup
    all_flashed_events_df = demoparser.parse_event("player_blind", other=["is_warmup_period"])
    flashed_events_df     = all_flashed_events_df[all_flashed_events_df["is_warmup_period"] == False]

    # Join in the flashee team and flasher team sequentially
    flashes_w_user_team_df = flashed_events_df.merge(team_df, on='user_steamid')
    flashes_w_both_team_df = flashes_w_user_team_df.merge(team_df, left_on='attacker_steamid', right_on='user_steamid', suffixes=['_user','_attacker'])

    # Filter to where flashee team and flasher team are the same
    team_flashes_df = flashes_w_both_team_df[flashes_w_both_team_df["team_user"]==flashes_w_both_team_df["team_attacker"]]

    #print(team_flashes_df)

    # Aggregate and sort by team
    team_flash_leaderboard_df = team_flashes_df[['attacker_name','team_attacker','blind_duration']].groupby(['attacker_name','team_attacker']).agg(['count','sum'])
    #print(team_flash_leaderboard_df)
    print(team_flash_leaderboard_df.sort_values(by=[('blind_duration','count')], ascending=False))
    return team_flash_leaderboard_df

class Demo():
    def __init__(self, url:str):
        self.url             = url

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
        Writes info about file into DB
        """

        if not self.is_decompressed or not self.is_downloaded:
            logger.error(f'File from {self.url} has either not been decompressed or downloaded')
            raise
        
        get_team_flashed_by_player(self.demo_parser)
        #insert info here

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
