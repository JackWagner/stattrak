import wget
import re
import os
import bz2, shutil
import logging as logger
import subprocess
import match_stats
from demoparser2 import DemoParser

URL_REGEX  = r'^http://replay115.valve.net/730/\w{32}.dem.bz2'
FILE_REGEX = r'^\w{32}.dem.bz2$'

class Demo():
    def __init__(self, url:str):
        self.url             = url

        self.is_downloaded   = False
        self.is_decompressed = False
        self.is_stored_in_db = False
        self.is_deleted      = False

        self.stat_df_list    = []

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
        
        # Get match stat DFs
        self.stat_df_list.append(match_stats.get_team_flashed_by_player(self.demo_parser))
        # Join together and get stat json
        merged_stat_df = match_stats.get_merged_stat_df(self.stat_df_list)
        stat_json_list = match_stats.get_stat_json_list(merged_stat_df)
        #insert info here
        self.is_stored_in_db = True

        return stat_json_list

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
        stat_json_list = self.store_data_in_db()
        self.delete()
        logger.info(f'Finished processing {self.url}')
        return stat_json_list
